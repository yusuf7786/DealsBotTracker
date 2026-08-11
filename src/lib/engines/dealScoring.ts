/**
 * DEAL SCORING ENGINE
 *
 * Produces a deterministic 0-100 score plus a human-readable confidence
 * percentage and a list of reasons. AI (see lib/engines/aiExplain.ts) may
 * later generate a natural-language summary of these same numbers, but it
 * never influences the score itself — the numeric comparison stays
 * deterministic per the spec.
 */

export interface DealScoreInput {
  currentPrice: number;
  marketPrice: number;
  sourceCount: number;
  sellerRating: number | null; // 0-5
  lowestKnownPrice: number | null;
  condition: 'new' | 'refurbished' | 'used';
  hasWarranty: boolean;
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';
  matchConfidence: number; // 0-1, how sure the matching engine is
  stdDev: number; // market price stddev, used as a dispersion penalty
}

export interface DealScoreResult {
  dealScore: number; // 0-100
  confidence: number; // 0-100
  tier: 'exceptional' | 'excellent' | 'good' | 'none';
  reasons: string[];
  percentBelowMarket: number;
  savingsAmount: number;
  isNearAllTimeLow: boolean;
}

const THRESHOLDS_DEFAULT = { exceptional: 90, excellent: 75, good: 60 };

export function scoreDeal(
  input: DealScoreInput,
  thresholds: { exceptional: number; excellent: number; good: number } = THRESHOLDS_DEFAULT
): DealScoreResult {
  const savingsAmount = Math.max(0, input.marketPrice - input.currentPrice);
  const percentBelowMarket = input.marketPrice > 0 ? (savingsAmount / input.marketPrice) * 100 : 0;

  const reasons: string[] = [];

  // 1. Percent below market — primary driver, up to 45 points.
  const percentScore = Math.min(45, percentBelowMarket * 1.8);
  if (percentBelowMarket > 0) {
    reasons.push(`${percentBelowMarket.toFixed(1)}% below the calculated market price`);
  }

  // 2. Source confidence — more independent sources = more trustworthy market price, up to 15 points.
  const sourceScore = Math.min(15, input.sourceCount * 3);
  reasons.push(`Market price calculated from ${input.sourceCount} independent source${input.sourceCount === 1 ? '' : 's'}`);

  // 3. Seller reliability, up to 10 points.
  const sellerScore = input.sellerRating !== null ? (input.sellerRating / 5) * 10 : 5;
  if (input.sellerRating !== null) {
    reasons.push(`Seller rating ${input.sellerRating.toFixed(1)}/5`);
  }

  // 4. Near all-time low, up to 15 points.
  const isNearAllTimeLow =
    input.lowestKnownPrice !== null && input.currentPrice <= input.lowestKnownPrice * 1.02;
  const lowScore = isNearAllTimeLow ? 15 : input.lowestKnownPrice ? 5 : 0;
  if (isNearAllTimeLow) reasons.push('Price is at or near its all-time low');

  // 5. Condition / warranty, up to 10 points.
  let conditionScore = input.condition === 'new' ? 5 : input.condition === 'refurbished' ? 2 : 0;
  if (input.hasWarranty) {
    conditionScore += 5;
    reasons.push('Includes manufacturer or retailer warranty');
  } else {
    reasons.push('No warranty confirmed — factored into score');
  }

  // 6. Stock availability, up to 5 points (out-of-stock deals shouldn't rank highly).
  const stockScore = input.availability === 'in_stock' ? 5 : 0;
  if (input.availability !== 'in_stock') reasons.push('Not currently in stock — score reduced');

  // 7. Match confidence multiplier — a low-confidence product match caps the whole score.
  const rawScore = percentScore + sourceScore + sellerScore + lowScore + conditionScore + stockScore;
  const dealScore = Math.round(Math.max(0, Math.min(100, rawScore * input.matchConfidence)));

  // Confidence = blend of source count, match confidence, and price dispersion (lower stddev = tighter agreement).
  const dispersionFactor =
    input.marketPrice > 0 ? Math.max(0, 1 - input.stdDev / input.marketPrice) : 1;
  const confidence = Math.round(
    Math.min(
      100,
      (Math.min(1, input.sourceCount / 5) * 40 + dispersionFactor * 30 + input.matchConfidence * 30)
    )
  );

  let tier: DealScoreResult['tier'] = 'none';
  if (dealScore >= thresholds.exceptional) tier = 'exceptional';
  else if (dealScore >= thresholds.excellent) tier = 'excellent';
  else if (dealScore >= thresholds.good) tier = 'good';

  return {
    dealScore,
    confidence,
    tier,
    reasons,
    percentBelowMarket: Math.round(percentBelowMarket * 10) / 10,
    savingsAmount: Math.round(savingsAmount),
    isNearAllTimeLow,
  };
}
