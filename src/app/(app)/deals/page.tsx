import { prisma } from '@/lib/prisma';
import { toNumber } from '@/lib/utils/currency';
import { DealCard, type DealCardData } from '@/components/DealCard';
import { EmptyState } from '@/components/EmptyState';
import { DealFilters } from '@/components/DealFilters';

export const dynamic = 'force-dynamic';

const CATEGORY_EMOJI: Record<string, string> = {
  Smartphones: '📱', Laptops: '💻', Gaming: '🎮', TVs: '📺', Audio: '🎧',
  Appliances: '🏠', Wearables: '⌚', Tablets: '📱',
};

function toDealCard(deal: any): DealCardData {
  return {
    id: deal.id,
    productName: deal.product.productName,
    brand: deal.product.brand,
    storage: deal.product.storage,
    currentPrice: toNumber(deal.currentPrice),
    marketPrice: toNumber(deal.marketPrice),
    savingsAmount: toNumber(deal.savingsAmount),
    savingsPercent: deal.savingsPercent,
    dealScore: deal.dealScore,
    tier: deal.tier,
    sellerName: deal.bestListing.seller,
    sellerRating: deal.bestListing.sellerRating,
    currency: deal.product.currency,
    isSimulated: deal.bestListing.isSimulated,
    createdAt: deal.createdAt.toISOString(),
  };
}

export default async function DealsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const where: Record<string, unknown> = { status: 'active' };
  if (searchParams.tier) where.tier = searchParams.tier;
  if (searchParams.category) where.category = searchParams.category;
  if (searchParams.minScore) where.dealScore = { gte: Number(searchParams.minScore) };
  if (searchParams.minDiscount) where.savingsPercent = { gte: Number(searchParams.minDiscount) };

  const productFilter: Record<string, unknown> = {};
  if (searchParams.brand) productFilter.brand = searchParams.brand;
  if (searchParams.condition) productFilter.condition = searchParams.condition;
  if (Object.keys(productFilter).length > 0) where.product = { is: productFilter };

  const sort = searchParams.sort || 'score';
  const orderBy =
    sort === 'savings' ? { savingsAmount: 'desc' as const }
    : sort === 'discount' ? { savingsPercent: 'desc' as const }
    : sort === 'recent' ? { createdAt: 'desc' as const }
    : sort === 'price-asc' ? { currentPrice: 'asc' as const }
    : { dealScore: 'desc' as const };

  const [deals, categories, brands] = await Promise.all([
    prisma.deal.findMany({ where, include: { product: true, bestListing: true }, orderBy, take: 100 }),
    prisma.product.findMany({ distinct: ['category'], select: { category: true } }),
    prisma.product.findMany({ distinct: ['brand'], select: { brand: true } }),
  ]);

  const grouped = new Map<string, typeof deals>();
  for (const deal of deals) {
    const list = grouped.get(deal.category) ?? [];
    list.push(deal);
    grouped.set(deal.category, list);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">All Deals</h1>
      <DealFilters categories={categories.map((c) => c.category)} brands={brands.map((b) => b.brand)} />

      {deals.length === 0 ? (
        <EmptyState title="No deals match these filters" message="Try widening your filters, or run a scan from the dashboard." />
      ) : searchParams.category ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {deals.map((d) => (
            <DealCard key={d.id} deal={toDealCard(d)} />
          ))}
        </div>
      ) : (
        Array.from(grouped.entries()).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold text-muted">
              {CATEGORY_EMOJI[category] ?? '🏷️'} {category}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((d) => (
                <DealCard key={d.id} deal={toDealCard(d)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
