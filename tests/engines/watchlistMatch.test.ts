import { describe, it, expect } from 'vitest';
import { watchlistItemMatches } from '@/lib/engines/watchlistMatch';

const deal = {
  brand: 'Samsung',
  productName: 'Galaxy S26 Ultra',
  category: 'Smartphones',
  currentPrice: 20500,
  savingsPercent: 18,
  dealScore: 82,
};

describe('watchlistItemMatches', () => {
  it('matches on price limit OR condition per the spec example', () => {
    const item = { type: 'product', query: 'Galaxy S26 Ultra', priceLimit: 21000, minDiscountPercent: 15, minDealScore: 80, enabled: true };
    expect(watchlistItemMatches(item, deal)).toBe(true); // price under limit
  });

  it('does not match unrelated products', () => {
    const item = { type: 'product', query: 'iPhone 17', priceLimit: null, minDiscountPercent: null, minDealScore: null, enabled: true };
    expect(watchlistItemMatches(item, deal)).toBe(false);
  });

  it('matches by brand', () => {
    const item = { type: 'brand', query: 'Samsung', priceLimit: null, minDiscountPercent: null, minDealScore: null, enabled: true };
    expect(watchlistItemMatches(item, deal)).toBe(true);
  });

  it('ignores disabled items', () => {
    const item = { type: 'brand', query: 'Samsung', priceLimit: null, minDiscountPercent: null, minDealScore: null, enabled: false };
    expect(watchlistItemMatches(item, deal)).toBe(false);
  });

  it('requires at least one condition to pass when conditions are set', () => {
    const item = { type: 'brand', query: 'Samsung', priceLimit: 100, minDiscountPercent: 99, minDealScore: 100, enabled: true };
    expect(watchlistItemMatches(item, deal)).toBe(false);
  });
});
