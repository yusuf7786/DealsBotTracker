'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const TIERS = [
  { value: '', label: 'All tiers' },
  { value: 'exceptional', label: '🔥 Exceptional' },
  { value: 'excellent', label: '⭐ Excellent' },
  { value: 'good', label: '💰 Good' },
];

const SORTS = [
  { value: 'score', label: 'Deal score' },
  { value: 'discount', label: 'Discount %' },
  { value: 'savings', label: 'Savings amount' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'recent', label: 'Recently found' },
];

const CONDITIONS = [
  { value: '', label: 'Any condition' },
  { value: 'new', label: 'New' },
  { value: 'refurbished', label: 'Refurbished' },
  { value: 'used', label: 'Used' },
];

export function DealFilters({ categories, brands }: { categories: string[]; brands: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function select(key: string, label: string, options: { value: string; label: string }[]) {
    return (
      <select
        aria-label={label}
        value={searchParams.get(key) ?? ''}
        onChange={(e) => setParam(key, e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {select('tier', 'Tier', TIERS)}
      {select('category', 'Category', [{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))])}
      {select('brand', 'Brand', [{ value: '', label: 'All brands' }, ...brands.map((b) => ({ value: b, label: b }))])}
      {select('condition', 'Condition', CONDITIONS)}
      {select('sort', 'Sort', SORTS)}
    </div>
  );
}
