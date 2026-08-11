import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import { toNumber } from '../utils/currency';
import { getAdapter } from '../sources/registry';
import { normalizeProduct, computeMatchConfidence } from '../engines/productMatching';
import { calculateMarketPrice } from '../engines/marketPrice';
import { scoreDeal } from '../engines/dealScoring';
import { checkFalseDeal } from '../engines/falseDealFilters';
import { pickBestListing } from '../engines/dedup';
import { watchlistItemMatches } from '../engines/watchlistMatch';
import { alertRuleMatches, type AlertCondition } from '../engines/alertRuleMatch';
import { getSettings } from '../settings';
import { dispatchDealNotification } from '../notifications/dispatcher';

export interface ScanResult {
  status: 'success' | 'partial' | 'failed';
  productsChecked: number;
  pricesDiscovered: number;
  dealsDetected: number;
  notificationsSent: number;
  errors: string[];
}

/**
 * Runs a full scan for one source: fetch -> normalize -> upsert -> recompute
 * market prices for affected products -> score/detect deals -> notify.
 * This is the single pipeline used by both the background worker and the
 * "scan now" manual trigger, so behaviour is identical either way.
 */
export async function runScanForSource(sourceKey: string): Promise<ScanResult> {
  const errors: string[] = [];
  const adapter = getAdapter(sourceKey);

  if (!adapter) {
    return { status: 'failed', productsChecked: 0, pricesDiscovered: 0, dealsDetected: 0, notificationsSent: 0, errors: [`Unknown source: ${sourceKey}`] };
  }

  const source = await prisma.source.upsert({
    where: { key: adapter.meta.key },
    update: {},
    create: {
      key: adapter.meta.key,
      name: adapter.meta.name,
      type: adapter.meta.type,
      priority: adapter.meta.priority,
      scanFrequencyMinutes: adapter.meta.defaultScanFrequencyMinutes,
      reliabilityWeight: adapter.meta.reliabilityWeight,
      requiresApiKey: adapter.meta.requiresApiKey,
      apiKeyConfigured: adapter.isConfigured(),
    },
  });

  if (!source.enabled || !adapter.isConfigured()) {
    return { status: 'success', productsChecked: 0, pricesDiscovered: 0, dealsDetected: 0, notificationsSent: 0, errors: [] };
  }

  const scanRun = await prisma.scanRun.create({ data: { sourceId: source.id, status: 'running' } });
  await prisma.source.update({ where: { id: source.id }, data: { status: 'scanning' } });

  let productsChecked = 0;
  let pricesDiscovered = 0;
  let dealsDetected = 0;
  let notificationsSent = 0;
  const affectedProductIds = new Set<string>();

  try {
    const rawListings = await adapter.fetchListings();

    for (const raw of rawListings) {
      try {
        productsChecked++;
        const normalized = normalizeProduct({
          title: raw.title,
          brand: raw.brand,
          category: raw.category,
          condition: raw.condition,
          region: raw.region,
        });

        const product = await prisma.product.upsert({
          where: { canonicalKey: normalized.canonicalKey },
          update: { lastCheckedAt: new Date() },
          create: {
            canonicalKey: normalized.canonicalKey,
            brand: normalized.brand,
            productName: normalized.productName,
            modelNumber: normalized.modelNumber,
            variant: normalized.variant,
            storage: normalized.storage,
            ram: normalized.ram,
            colour: normalized.colour,
            condition: normalized.condition,
            region: normalized.region,
            category: normalized.category,
            connectivity: normalized.connectivity,
            simType: normalized.simType,
            currency: raw.currency ?? 'ZAR',
          },
        });

        const existingListing = await prisma.listing.findUnique({
          where: { productId_source_url: { productId: product.id, source: adapter.meta.key, url: raw.url } },
        });

        const priceChanged = !existingListing || toNumber(existingListing.currentPrice) !== raw.price;

        const listing = await prisma.listing.upsert({
          where: { productId_source_url: { productId: product.id, source: adapter.meta.key, url: raw.url } },
          update: {
            previousPrice: existingListing ? existingListing.currentPrice : null,
            currentPrice: raw.price,
            rawTitle: raw.title,
            sellerRating: raw.sellerRating ?? null,
            condition: raw.condition ?? 'new',
            warranty: raw.warranty ?? null,
            availability: raw.availability ?? 'in_stock',
            shippingCost: raw.shippingCost ?? null,
            isMembershipOnly: raw.isMembershipOnly ?? false,
            isCouponRequired: raw.isCouponRequired ?? false,
            isFinancingPrice: raw.isFinancingPrice ?? false,
            isBundle: raw.isBundle ?? false,
            active: true,
            lastCheckedAt: new Date(),
          },
          create: {
            productId: product.id,
            source: adapter.meta.key,
            sourceLabel: adapter.meta.name,
            seller: raw.sellerName,
            sellerRating: raw.sellerRating ?? null,
            url: raw.url,
            rawTitle: raw.title,
            currentPrice: raw.price,
            currency: raw.currency ?? 'ZAR',
            shippingCost: raw.shippingCost ?? null,
            condition: raw.condition ?? 'new',
            warranty: raw.warranty ?? null,
            availability: raw.availability ?? 'in_stock',
            isMembershipOnly: raw.isMembershipOnly ?? false,
            isCouponRequired: raw.isCouponRequired ?? false,
            isFinancingPrice: raw.isFinancingPrice ?? false,
            isBundle: raw.isBundle ?? false,
            reliabilityWeight: adapter.meta.reliabilityWeight,
          },
        });

        if (priceChanged) {
          pricesDiscovered++;
          await prisma.priceObservation.create({ data: { listingId: listing.id, price: raw.price } });
          affectedProductIds.add(product.id);

          const lowest = product.lowestKnownPrice ? Math.min(toNumber(product.lowestKnownPrice), raw.price) : raw.price;
          const highest = product.highestKnownPrice ? Math.max(toNumber(product.highestKnownPrice), raw.price) : raw.price;
          await prisma.product.update({
            where: { id: product.id },
            data: { lowestKnownPrice: lowest, highestKnownPrice: highest },
          });
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    const settings = await getSettings();

    for (const productId of affectedProductIds) {
      try {
        const result = await recomputeProductDeal(productId, settings);
        if (result.dealCreated) dealsDetected++;
        notificationsSent += result.notificationsSent;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: {
        finishedAt: new Date(),
        status: errors.length === 0 ? 'success' : 'partial',
        productsChecked,
        pricesDiscovered,
        dealsDetected,
        notificationsSent,
        errors,
      },
    });

    await prisma.source.update({
      where: { id: source.id },
      data: {
        status: 'idle',
        lastScanAt: new Date(),
        nextScanAt: new Date(Date.now() + source.scanFrequencyMinutes * 60_000),
        lastError: null,
      },
    });

    return { status: errors.length === 0 ? 'success' : 'partial', productsChecked, pricesDiscovered, dealsDetected, notificationsSent, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('scan failed', { source: sourceKey, error: message });
    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: { finishedAt: new Date(), status: 'failed', productsChecked, pricesDiscovered, errors: [...errors, message] },
    });
    await prisma.source.update({ where: { id: source.id }, data: { status: 'error', lastError: message } });
    return { status: 'failed', productsChecked, pricesDiscovered, dealsDetected, notificationsSent, errors: [...errors, message] };
  }
}

async function recomputeProductDeal(
  productId: string,
  settings: Awaited<ReturnType<typeof getSettings>>
): Promise<{ dealCreated: boolean; notificationsSent: number }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { listings: { where: { active: true } } },
  });
  if (!product || product.listings.length === 0) return { dealCreated: false, notificationsSent: 0 };

  const marketPriceInputs = product.listings.map((l) => ({
    price: toNumber(l.currentPrice),
    reliabilityWeight: l.reliabilityWeight,
    source: l.source,
  }));
  const marketResult = calculateMarketPrice(marketPriceInputs);
  if (!marketResult) return { dealCreated: false, notificationsSent: 0 };

  await prisma.marketPrice.create({
    data: {
      productId: product.id,
      marketPrice: marketResult.marketPrice,
      median: marketResult.median,
      trimmedMean: marketResult.trimmedMean,
      stdDev: marketResult.stdDev,
      sourceCount: marketResult.sourceCount,
      outliersRemoved: marketResult.outliersRemoved,
      method: marketResult.method,
    },
  });

  const bestListing = pickBestListing(
    product.listings.map((l) => ({ id: l.id, currentPrice: toNumber(l.currentPrice), availability: l.availability as any, active: l.active }))
  );
  if (!bestListing) return { dealCreated: false, notificationsSent: 0 };

  const bestListingRow = product.listings.find((l) => l.id === bestListing.id)!;
  const matchConfidence = computeMatchConfidence({
    canonicalKey: product.canonicalKey,
    brand: product.brand,
    productName: product.productName,
    modelNumber: product.modelNumber,
    variant: product.variant,
    storage: product.storage,
    ram: product.ram,
    colour: product.colour,
    condition: product.condition as any,
    region: product.region,
    connectivity: product.connectivity as any,
    simType: product.simType as any,
    category: product.category,
  });

  const falseDealCheck = checkFalseDeal({
    currentPrice: toNumber(bestListingRow.currentPrice),
    marketPrice: marketResult.marketPrice,
    availability: bestListingRow.availability as any,
    isMembershipOnly: bestListingRow.isMembershipOnly,
    isCouponRequired: bestListingRow.isCouponRequired,
    isFinancingPrice: bestListingRow.isFinancingPrice,
    isBundle: bestListingRow.isBundle,
    matchConfidence,
    rawTitle: bestListingRow.rawTitle,
    condition: bestListingRow.condition as any,
  });

  const score = scoreDeal(
    {
      currentPrice: toNumber(bestListingRow.currentPrice),
      marketPrice: marketResult.marketPrice,
      sourceCount: marketResult.sourceCount,
      sellerRating: bestListingRow.sellerRating,
      lowestKnownPrice: product.lowestKnownPrice ? toNumber(product.lowestKnownPrice) : null,
      condition: bestListingRow.condition as any,
      hasWarranty: Boolean(bestListingRow.warranty),
      availability: bestListingRow.availability as any,
      matchConfidence,
      stdDev: marketResult.stdDev,
    },
    settings.thresholds
  );

  const qualifies =
    !falseDealCheck.isBlocking &&
    score.dealScore >= settings.minDealScore &&
    score.percentBelowMarket >= settings.minPercentBelowMarket;

  const existingDeal = await prisma.deal.findUnique({ where: { productId: product.id } });

  if (!qualifies) {
    if (existingDeal && existingDeal.status === 'active') {
      await prisma.deal.update({ where: { productId: product.id }, data: { status: 'expired' } });
    }
    return { dealCreated: false, notificationsSent: 0 };
  }

  const dealData = {
    bestListingId: bestListingRow.id,
    currentPrice: toNumber(bestListingRow.currentPrice),
    marketPrice: marketResult.marketPrice,
    savingsAmount: score.savingsAmount,
    savingsPercent: score.percentBelowMarket,
    dealScore: score.dealScore,
    confidence: score.confidence,
    tier: score.tier,
    reasons: score.reasons,
    disqualifiers: falseDealCheck.disqualifiers,
    sourcesUsed: marketResult.sourceCount,
    isNearAllTimeLow: score.isNearAllTimeLow,
    status: 'active' as const,
    category: product.category,
  };

  const deal = await prisma.deal.upsert({
    where: { productId: product.id },
    update: dealData,
    create: { productId: product.id, ...dealData },
  });

  const isNewDeal = !existingDeal || existingDeal.status !== 'active';

  // Watchlist / alert-rule matching decides notification eligibility for
  // deals that don't clear the global "good deal" tier on their own.
  let shouldAttemptNotify = deal.tier !== 'none';
  if (!shouldAttemptNotify) {
    const watchlistItems = await prisma.watchlistItem.findMany({ where: { enabled: true } });
    const dealForMatch = {
      brand: product.brand,
      productName: product.productName,
      category: product.category,
      currentPrice: dealData.currentPrice,
      savingsPercent: dealData.savingsPercent,
      dealScore: dealData.dealScore,
    };
    shouldAttemptNotify = watchlistItems.some((w) =>
      watchlistItemMatches(
        { type: w.type, query: w.query, priceLimit: w.priceLimit ? toNumber(w.priceLimit) : null, minDiscountPercent: w.minDiscountPercent, minDealScore: w.minDealScore, enabled: w.enabled },
        dealForMatch
      )
    );
  }

  const alertRules = await prisma.alertRule.findMany({ where: { enabled: true } });
  const alertMatch = alertRules.some((rule) =>
    alertRuleMatches(rule.conditions as unknown as AlertCondition[], {
      currentPrice: dealData.currentPrice,
      savingsPercent: dealData.savingsPercent,
      dealScore: dealData.dealScore,
      savingsAmount: dealData.savingsAmount,
      brand: product.brand,
      category: product.category,
      isNearAllTimeLow: dealData.isNearAllTimeLow,
    })
  );

  let notificationsSent = 0;
  if (shouldAttemptNotify || alertMatch) {
    const result = await dispatchDealNotification(deal.id);
    notificationsSent = result.sent;
  }

  return { dealCreated: isNewDeal, notificationsSent };
}
