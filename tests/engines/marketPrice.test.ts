import { describe, it, expect } from 'vitest';
import { calculateMarketPrice } from '@/lib/engines/marketPrice';

describe('calculateMarketPrice', () => {
  it('returns null for no valid prices', () => {
    expect(calculateMarketPrice([])).toBeNull();
    expect(calculateMarketPrice([{ price: 0, source: 'a' }, { price: -5, source: 'b' }])).toBeNull();
  });

  it('handles a single source with low confidence', () => {
    const result = calculateMarketPrice([{ price: 1000, source: 'a' }]);
    expect(result?.marketPrice).toBe(1000);
    expect(result?.method).toContain('low confidence');
  });

  it('computes a sensible blended market price from the spec example', () => {
    // Source A: 24999, B: 23999, C: 25499, D: 24499
    const result = calculateMarketPrice([
      { price: 24999, source: 'a', reliabilityWeight: 0.8 },
      { price: 23999, source: 'b', reliabilityWeight: 0.7 },
      { price: 25499, source: 'c', reliabilityWeight: 0.8 },
      { price: 24499, source: 'd', reliabilityWeight: 0.75 },
    ]);
    expect(result).not.toBeNull();
    expect(result!.marketPrice).toBeGreaterThan(23999);
    expect(result!.marketPrice).toBeLessThan(25499);
    expect(result!.sourceCount).toBe(4);
  });

  it('resists a single extreme outlier skewing the market price', () => {
    const withoutOutlier = calculateMarketPrice([
      { price: 10000, source: 'a' },
      { price: 10200, source: 'b' },
      { price: 9900, source: 'c' },
      { price: 10100, source: 'd' },
    ])!;

    const withOutlier = calculateMarketPrice([
      { price: 10000, source: 'a' },
      { price: 10200, source: 'b' },
      { price: 9900, source: 'c' },
      { price: 10100, source: 'd' },
      { price: 1000, source: 'e' }, // absurdly cheap outlier / pricing error
    ])!;

    expect(withOutlier.outliersRemoved).toBeGreaterThanOrEqual(1);
    // The outlier should not drag the market price down by more than ~5%.
    expect(Math.abs(withOutlier.marketPrice - withoutOutlier.marketPrice) / withoutOutlier.marketPrice).toBeLessThan(0.05);
  });

  it('never lets an expensive outlier inflate the market price much', () => {
    const result = calculateMarketPrice([
      { price: 5000, source: 'a' },
      { price: 5100, source: 'b' },
      { price: 4900, source: 'c' },
      { price: 5050, source: 'd' },
      { price: 50000, source: 'e' }, // wildly overpriced listing
    ])!;
    expect(result.marketPrice).toBeLessThan(6000);
  });
});
