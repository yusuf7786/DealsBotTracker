import Link from 'next/link';
import { clsx } from 'clsx';
import { formatCurrency } from '@/lib/utils/currency';

export interface DealCardData {
  id: string;
  productName: string;
  brand: string;
  storage: string | null;
  currentPrice: number;
  marketPrice: number;
  savingsAmount: number;
  savingsPercent: number;
  dealScore: number;
  tier: 'exceptional' | 'excellent' | 'good' | 'none';
  sellerName: string;
  sellerRating: number | null;
  currency: string;
}

const TIER_META: Record<DealCardData['tier'], { label: string; className: string; emoji: string }> = {
  exceptional: { label: 'EXCEPTIONAL DEAL', className: 'bg-exceptional/15 text-exceptional', emoji: '🔥' },
  excellent: { label: 'EXCELLENT DEAL', className: 'bg-excellent/15 text-excellent', emoji: '⭐' },
  good: { label: 'GOOD DEAL', className: 'bg-good/15 text-good', emoji: '💰' },
  none: { label: 'DEAL', className: 'bg-muted/15 text-muted', emoji: '🏷️' },
};

export function DealCard({ deal }: { deal: DealCardData }) {
  const tier = TIER_META[deal.tier];
  return (
    <Link
      href={`/deals/${deal.id}`}
      className="block animate-fade-in rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide', tier.className)}>
          {tier.emoji} {tier.label}
        </span>
        <span className="text-[11px] font-medium text-muted">Score {deal.dealScore}/100</span>
      </div>

      <h3 className="mb-0.5 text-sm font-medium leading-snug">
        {deal.brand} {deal.productName}
        {deal.storage ? ` · ${deal.storage}` : ''}
      </h3>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums">{formatCurrency(deal.currentPrice, deal.currency)}</span>
        <span className="text-sm text-muted line-through tabular-nums">{formatCurrency(deal.marketPrice, deal.currency)}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-md bg-good/15 px-2 py-0.5 text-xs font-semibold text-good">
          {deal.savingsPercent.toFixed(0)}% BELOW MARKET
        </span>
        <span className="text-xs font-medium text-muted">SAVE {formatCurrency(deal.savingsAmount, deal.currency)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs text-muted">
        <span>{deal.sellerName}</span>
        {deal.sellerRating !== null && <span>★ {deal.sellerRating.toFixed(1)}</span>}
      </div>
    </Link>
  );
}
