import { describe, it, expect } from 'vitest';
import { pickBestListing } from '@/lib/engines/dedup';

describe('pickBestListing', () => {
  it('picks the cheapest in-stock listing', () => {
    const listings = [
      { id: 'a', currentPrice: 21999, availability: 'in_stock' as const, active: true },
      { id: 'b', currentPrice: 19999, availability: 'in_stock' as const, active: true },
      { id: 'c', currentPrice: 15999, availability: 'out_of_stock' as const, active: true },
    ];
    expect(pickBestListing(listings)?.id).toBe('b');
  });

  it('falls back to out-of-stock listings only when nothing is in stock', () => {
    const listings = [
      { id: 'a', currentPrice: 21999, availability: 'out_of_stock' as const, active: true },
      { id: 'b', currentPrice: 19999, availability: 'preorder' as const, active: true },
    ];
    expect(pickBestListing(listings)?.id).toBe('b');
  });

  it('ignores inactive listings', () => {
    const listings = [
      { id: 'a', currentPrice: 9999, availability: 'in_stock' as const, active: false },
      { id: 'b', currentPrice: 19999, availability: 'in_stock' as const, active: true },
    ];
    expect(pickBestListing(listings)?.id).toBe('b');
  });

  it('returns null for an empty list', () => {
    expect(pickBestListing([])).toBeNull();
  });
});
