import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { toNumber, formatCurrency } from '@/lib/utils/currency';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { explainDeal } from '@/lib/engines/aiExplain';
import { timeAgo } from '@/lib/utils/time';

export const dynamic = 'force-dynamic';

const TIER_LABEL: Record<string, string> = {
  exceptional: '🔥 EXCEPTIONAL DEAL',
  excellent: '⭐ EXCELLENT DEAL',
  good: '💰 GOOD DEAL',
  none: '🏷️ DEAL',
};

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: {
      product: { include: { listings: { where: { active: true }, orderBy: { currentPrice: 'asc' } }, marketPrices: { orderBy: { computedAt: 'desc' }, take: 1 } } },
      bestListing: true,
    },
  });

  if (!deal) notFound();

  const priceObservations = await prisma.priceObservation.findMany({
    where: { listing: { productId: deal.productId } },
    orderBy: { observedAt: 'asc' },
    take: 500,
  });

  const currency = deal.product.currency;
  const currentPrice = toNumber(deal.currentPrice);
  const marketPrice = toNumber(deal.marketPrice);
  const savingsAmount = toNumber(deal.savingsAmount);
  const otherListings = deal.product.listings.filter((l) => l.id !== deal.bestListingId);
  const reasons = Array.isArray(deal.reasons) ? (deal.reasons as string[]) : [];
  const disqualifiers = Array.isArray(deal.disqualifiers) ? (deal.disqualifiers as string[]) : [];

  const aiExplanation = await explainDeal({
    productName: `${deal.product.brand} ${deal.product.productName}`,
    percentBelowMarket: deal.savingsPercent,
    sourceCount: deal.sourcesUsed,
    isNearAllTimeLow: deal.isNearAllTimeLow,
    lowestKnownPrice: deal.product.lowestKnownPrice ? toNumber(deal.product.lowestKnownPrice) : null,
    currentPrice,
    dealScore: deal.dealScore,
  });

  return (
    <div className="space-y-5 pb-6">
      <Link href="/deals" className="text-xs text-accent">
        ← Back to deals
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">{TIER_LABEL[deal.tier]}</span>
          <span className="text-[11px] text-muted">Posted {timeAgo(deal.createdAt)}</span>
        </div>
        <h1 className="mt-2 text-xl font-semibold leading-snug">
          {deal.product.brand} {deal.product.productName}
        </h1>
        <p className="text-sm text-muted">
          {[deal.product.storage, deal.product.ram, deal.product.colour, deal.product.condition, deal.product.connectivity, deal.product.simType]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums">{formatCurrency(currentPrice, currency)}</span>
          <span className="text-base text-muted line-through tabular-nums">{formatCurrency(marketPrice, currency)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-good/15 px-2 py-0.5 text-xs font-semibold text-good">{deal.savingsPercent.toFixed(1)}% BELOW MARKET</span>
          <span className="text-xs font-medium text-muted">SAVE {formatCurrency(savingsAmount, currency)}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-2 p-2">
            <p className="text-lg font-bold">{deal.dealScore}</p>
            <p className="text-[10px] text-muted">Deal Score</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-2">
            <p className="text-lg font-bold">{deal.confidence}%</p>
            <p className="text-[10px] text-muted">Confidence</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-2">
            <p className="text-lg font-bold">{deal.sourcesUsed}</p>
            <p className="text-[10px] text-muted">Sources</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">Why this qualifies as a deal</h2>
        <p className="mb-3 text-sm text-muted">{aiExplanation}</p>
        <ul className="space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 text-good">✓</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
        {disqualifiers.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-1 text-xs font-semibold text-muted">Flagged for review</p>
            <ul className="space-y-1">
              {disqualifiers.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted">
                  <span className="mt-0.5">⚠️</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">Price History</h2>
        <PriceHistoryChart points={priceObservations.map((p) => ({ date: p.observedAt.toISOString(), price: toNumber(p.price) }))} marketPrice={marketPrice} currency={currency} />
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted">Lowest recorded: </span>
            <span className="font-medium">{deal.product.lowestKnownPrice ? formatCurrency(toNumber(deal.product.lowestKnownPrice), currency) : '—'}</span>
          </div>
          <div>
            <span className="text-muted">Highest recorded: </span>
            <span className="font-medium">{deal.product.highestKnownPrice ? formatCurrency(toNumber(deal.product.highestKnownPrice), currency) : '—'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Seller & Listing</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-xs">
          <dt className="text-muted">Seller</dt>
          <dd className="text-right font-medium">{deal.bestListing.seller}</dd>
          <dt className="text-muted">Rating</dt>
          <dd className="text-right font-medium">{deal.bestListing.sellerRating ? `★ ${deal.bestListing.sellerRating.toFixed(1)}` : '—'}</dd>
          <dt className="text-muted">Condition</dt>
          <dd className="text-right font-medium capitalize">{deal.bestListing.condition}</dd>
          <dt className="text-muted">Warranty</dt>
          <dd className="text-right font-medium">{deal.bestListing.warranty ?? 'Not specified'}</dd>
          <dt className="text-muted">Availability</dt>
          <dd className="text-right font-medium capitalize">{deal.bestListing.availability.replace('_', ' ')}</dd>
          <dt className="text-muted">Shipping</dt>
          <dd className="text-right font-medium">
            {deal.bestListing.shippingCost !== null ? (toNumber(deal.bestListing.shippingCost) === 0 ? 'Free' : formatCurrency(toNumber(deal.bestListing.shippingCost), currency)) : '—'}
          </dd>
        </dl>
        {deal.bestListing.isSimulated && (
          <p className="mt-3 rounded-lg bg-muted/10 px-3 py-2 text-xs text-muted">
            This price is simulated (no live {deal.bestListing.seller} API is connected yet). The button
            below takes you to a real {deal.bestListing.seller} search for this product so you can check
            the actual current price.
          </p>
        )}
        <a
          href={deal.bestListing.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block w-full rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-medium text-white hover:opacity-90"
        >
          {deal.bestListing.isSimulated ? `Search on ${deal.bestListing.seller} ↗` : 'View Deal ↗'}
        </a>
      </div>

      {otherListings.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold">Other Sellers ({otherListings.length})</h2>
          <ul className="divide-y divide-border">
            {otherListings.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{l.seller}</p>
                  <p className="text-xs text-muted">{l.availability === 'in_stock' ? 'In stock' : l.availability.replace('_', ' ')}</p>
                </div>
                <a href={l.url} target="_blank" rel="noreferrer" className="font-semibold tabular-nums text-accent">
                  {formatCurrency(toNumber(l.currentPrice), currency)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
