import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { toNumber } from '@/lib/utils/currency';
import { DealCard, type DealCardData } from '@/components/DealCard';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { ScanNowButton } from '@/components/ScanNowButton';

export const dynamic = 'force-dynamic';

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
  };
}

export default async function DashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [activeDeals, todayDeals, watchlistCount, latestSource, sources] = await Promise.all([
    prisma.deal.findMany({
      where: { status: 'active' },
      include: { product: true, bestListing: true },
      orderBy: { dealScore: 'desc' },
      take: 12,
    }),
    prisma.deal.count({ where: { status: 'active', createdAt: { gte: startOfToday } } }),
    prisma.watchlistItem.count({ where: { enabled: true } }),
    prisma.scanRun.findFirst({ orderBy: { startedAt: 'desc' }, include: { source: true } }),
    prisma.source.findMany(),
  ]);

  const bestToday = activeDeals[0] ? toDealCard(activeDeals[0]) : null;
  const exceptional = activeDeals.filter((d) => d.tier === 'exceptional').length;
  const nextScan = sources
    .filter((s) => s.nextScanAt)
    .sort((a, b) => (a.nextScanAt! < b.nextScanAt! ? -1 : 1))[0];

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">🔥 {activeDeals.length} New Deals</h1>
          <ScanNowButton />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Today's Deals" value={String(todayDeals)} />
          <StatCard label="Exceptional" value={String(exceptional)} sub="90+ score" />
          <StatCard label="Watchlist Alerts" value={String(watchlistCount)} sub="active items" />
          <StatCard
            label="Last Scan"
            value={latestSource?.startedAt ? new Date(latestSource.startedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '—'}
            sub={latestSource?.source.name}
          />
        </div>
      </section>

      {bestToday && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Best Deal Today</h2>
          <DealCard deal={bestToday} />
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">New Deals</h2>
          <Link href="/deals" className="text-xs font-medium text-accent">
            View all →
          </Link>
        </div>
        {activeDeals.length === 0 ? (
          <EmptyState
            emoji="🛰️"
            title="No deals yet"
            message="Run a scan to populate demo deals, or wait for the background worker's next scheduled scan."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeDeals.map((d) => (
              <DealCard key={d.id} deal={toDealCard(d)} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 text-xs text-muted">
        <div className="flex items-center justify-between">
          <span>Scanner status</span>
          <span className="flex items-center gap-1 font-medium text-good">
            <span className="h-1.5 w-1.5 rounded-full bg-good" /> Online
          </span>
        </div>
        {nextScan?.nextScanAt && (
          <div className="mt-1 flex items-center justify-between">
            <span>Next scan</span>
            <span>{new Date(nextScan.nextScanAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        <Link href="/system" className="mt-2 inline-block text-accent">
          View full system status →
        </Link>
      </section>
    </div>
  );
}
