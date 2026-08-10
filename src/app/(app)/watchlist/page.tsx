'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { EmptyState } from '@/components/EmptyState';

interface WatchlistItem {
  id: string;
  type: string;
  query: string;
  priceLimit: number | null;
  minDiscountPercent: number | null;
  minDealScore: number | null;
  enabled: boolean;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('product');
  const [query, setQuery] = useState('');
  const [priceLimit, setPriceLimit] = useState('');
  const [minDiscount, setMinDiscount] = useState('');
  const [minScore, setMinScore] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/watchlist');
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type,
        query,
        priceLimit: priceLimit ? Number(priceLimit) : null,
        minDiscountPercent: minDiscount ? Number(minDiscount) : null,
        minDealScore: minScore ? Number(minScore) : null,
      }),
    });
    setQuery(''); setPriceLimit(''); setMinDiscount(''); setMinScore('');
    setShowForm(false);
    setSubmitting(false);
    load();
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/watchlist/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled }) });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">⭐ Watchlist</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white">
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm">
              <option value="product">Product</option>
              <option value="brand">Brand</option>
              <option value="category">Category</option>
              <option value="keyword">Keyword</option>
            </select>
            <input
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Galaxy S26 Ultra"
              className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-muted">Notify me when ANY of these are true:</p>
          <div className="grid grid-cols-3 gap-2">
            <input value={priceLimit} onChange={(e) => setPriceLimit(e.target.value)} type="number" placeholder="Price below (R)" className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm" />
            <input value={minDiscount} onChange={(e) => setMinDiscount(e.target.value)} type="number" placeholder="Min % below market" className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm" />
            <input value={minScore} onChange={(e) => setMinScore(e.target.value)} type="number" placeholder="Min deal score" className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm" />
          </div>
          <button disabled={submitting} type="submit" className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save watch'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState emoji="⭐" title="Nothing watched yet" message="Add a product, brand, category or keyword and set your price/discount/score conditions." />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.query}</p>
                  <p className="text-xs capitalize text-muted">{item.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(item.id, !item.enabled)}
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.enabled ? 'bg-good/15 text-good' : 'bg-muted/15 text-muted'}`}
                  >
                    {item.enabled ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => remove(item.id)} className="text-xs text-danger">
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted">
                {item.priceLimit !== null && <span className="rounded bg-surface-2 px-1.5 py-0.5">Below R{item.priceLimit}</span>}
                {item.minDiscountPercent !== null && <span className="rounded bg-surface-2 px-1.5 py-0.5">≥{item.minDiscountPercent}% off</span>}
                {item.minDealScore !== null && <span className="rounded bg-surface-2 px-1.5 py-0.5">Score ≥{item.minDealScore}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
