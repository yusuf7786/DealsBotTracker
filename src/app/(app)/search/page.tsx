'use client';

import { useState } from 'react';
import { DealCard, type DealCardData } from '@/components/DealCard';
import { EmptyState } from '@/components/EmptyState';
import { toNumber } from '@/lib/utils/currency';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ deals: any[]; products: any[]; sources: any[]; watchlist: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(value: string) {
    setQ(value);
    if (!value.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
    setResults(await res.json());
    setLoading(false);
  }

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

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">🔍 Search</h1>
      <input
        autoFocus
        value={q}
        onChange={(e) => runSearch(e.target.value)}
        placeholder="Samsung S26 Ultra, iPhone, PS5, Dyson…"
        className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
      />

      {loading && <p className="text-sm text-muted">Searching…</p>}

      {results && !loading && (
        <div className="space-y-5">
          {results.deals.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted">Deals ({results.deals.length})</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {results.deals.map((d) => (
                  <DealCard key={d.id} deal={toDealCard(d)} />
                ))}
              </div>
            </section>
          )}

          {results.products.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted">Products ({results.products.length})</h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                {results.products.map((p) => (
                  <li key={p.id} className="px-3 py-2 text-sm">
                    {p.brand} {p.productName} {p.storage ? `· ${p.storage}` : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.deals.length === 0 && results.products.length === 0 && (
            <EmptyState title="No results" message={`Nothing matched "${q}" yet — new products appear here as the scanner discovers them.`} />
          )}
        </div>
      )}
    </div>
  );
}
