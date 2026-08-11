import { describe, it, expect } from 'vitest';
import { scoreDeal } from '@/lib/engines/dealScoring';

const base = {
  currentPrice: 19999,
  marketPrice: 24999,
  sourceCount: 6,
  sellerRating: 4.6,
  lowestKnownPrice: 19499,
  condition: 'new' as const,
  hasWarranty: true,
  availability: 'in_stock' as const,
  matchConfidence: 1,
  stdDev: 400,
};

describe('scoreDeal', () => {
  it('scores the spec example as a strong deal', () => {
    const result = scoreDeal(base);
    expect(result.percentBelowMarket).toBeCloseTo(20, 0);
    expect(result.savingsAmount).toBe(5000);
    expect(result.dealScore).toBeGreaterThanOrEqual(60);
    expect(['good', 'excellent', 'exceptional']).toContain(result.tier);
  });

  it('never marks a not-actually-cheaper price as a deal', () => {
    const result = scoreDeal({ ...base, currentPrice: 24999 });
    expect(result.tier).toBe('none');
    expect(result.savingsAmount).toBe(0);
  });

  it('penalizes low match confidence heavily', () => {
    const confident = scoreDeal(base);
    const unsure = scoreDeal({ ...base, matchConfidence: 0.3 });
    expect(unsure.dealScore).toBeLessThan(confident.dealScore);
  });

  it('rewards being at an all-time low', () => {
    const atLow = scoreDeal({ ...base, currentPrice: 19499, lowestKnownPrice: 19499 });
    expect(atLow.isNearAllTimeLow).toBe(true);
  });

  it('penalizes out-of-stock listings', () => {
    const inStock = scoreDeal(base);
    const outOfStock = scoreDeal({ ...base, availability: 'out_of_stock' });
    expect(outOfStock.dealScore).toBeLessThan(inStock.dealScore);
  });

  it('respects custom thresholds', () => {
    const result = scoreDeal(base, { exceptional: 99, excellent: 98, good: 97 });
    expect(result.tier).not.toBe('exceptional');
  });
});
