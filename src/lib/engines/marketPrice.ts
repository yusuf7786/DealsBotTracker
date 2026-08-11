/**
 * MARKET PRICE ENGINE
 *
 * Calculates a realistic market price for a product from multiple
 * independent listings, rather than trusting any single retailer's "was"
 * price. Methodology:
 *
 *   1. Drop invalid/non-positive prices.
 *   2. Remove statistical outliers using the IQR (interquartile range)
 *      method so one absurdly cheap or expensive listing can't distort
 *      the result.
 *   3. Compute the median and a trimmed mean (trimming the top/bottom 10%)
 *      of the remaining prices.
 *   4. Compute a reliability-weighted median, weighting each source by a
 *      configured trust score (0-1).
 *   5. Blend the weighted median with the trimmed mean (60/40) as the
 *      final market price — this resists both single-outlier skew and
 *      systematic bias from a cluster of similarly-priced sources.
 *
 * The candidate price being evaluated as a "deal" is NEVER included in
 * this calculation — market price must come from independent sources.
 */

export interface MarketPriceInput {
  price: number;
  reliabilityWeight?: number; // 0-1, defaults to 0.7
  source: string;
}

export interface MarketPriceResult {
  marketPrice: number;
  median: number;
  trimmedMean: number;
  stdDev: number;
  sourceCount: number;
  outliersRemoved: number;
  usedPrices: number[];
  method: string;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function removeOutliersIQR(values: number[]): { kept: number[]; removed: number } {
  if (values.length < 4) return { kept: values, removed: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const kept = sorted.filter((v) => v >= lowerBound && v <= upperBound);
  return { kept: kept.length > 0 ? kept : sorted, removed: values.length - kept.length };
}

function trimmedMean(values: number[], trimFraction = 0.1): number {
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * trimFraction);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  const useSet = trimmed.length > 0 ? trimmed : sorted;
  return useSet.reduce((sum, v) => sum + v, 0) / useSet.length;
}

function weightedMedian(values: { price: number; weight: number }[]): number {
  const sorted = [...values].sort((a, b) => a.price - b.price);
  const totalWeight = sorted.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight === 0) return median(sorted.map((v) => v.price));
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.weight;
    if (cumulative >= totalWeight / 2) return item.price;
  }
  return sorted[sorted.length - 1].price;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function calculateMarketPrice(inputs: MarketPriceInput[]): MarketPriceResult | null {
  const valid = inputs.filter((i) => Number.isFinite(i.price) && i.price > 0);
  if (valid.length === 0) return null;

  if (valid.length === 1) {
    const only = valid[0].price;
    return {
      marketPrice: only,
      median: only,
      trimmedMean: only,
      stdDev: 0,
      sourceCount: 1,
      outliersRemoved: 0,
      usedPrices: [only],
      method: 'single-source (low confidence)',
    };
  }

  const prices = valid.map((v) => v.price);
  const { kept, removed } = removeOutliersIQR(prices);

  const keptWithWeights = valid
    .filter((v) => kept.includes(v.price))
    .map((v) => ({ price: v.price, weight: v.reliabilityWeight ?? 0.7 }));

  const med = median(kept);
  const tMean = trimmedMean(kept, 0.1);
  const wMedian = weightedMedian(keptWithWeights.length > 0 ? keptWithWeights : kept.map((p) => ({ price: p, weight: 0.7 })));

  // Blend weighted median (60%) with trimmed mean (40%) for the final figure.
  const marketPrice = Math.round(wMedian * 0.6 + tMean * 0.4);

  return {
    marketPrice,
    median: Math.round(med),
    trimmedMean: Math.round(tMean),
    stdDev: Math.round(stdDev(kept)),
    sourceCount: valid.length,
    outliersRemoved: removed,
    usedPrices: kept,
    method: 'weighted-median-trimmed-mean-blend',
  };
}
