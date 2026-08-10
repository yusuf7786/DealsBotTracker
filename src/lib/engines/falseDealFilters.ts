/**
 * FALSE DEAL PROTECTION
 *
 * Runs before a Deal is created/updated. Never trusts a retailer's "X% off"
 * label — flags listings that are technically cheap but not a genuine deal
 * for the reasons in spec section 7 (inflated "was" price handled by the
 * market-price engine itself; the rest are handled here).
 */

export interface FalseDealCheckInput {
  currentPrice: number;
  marketPrice: number;
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';
  isMembershipOnly: boolean;
  isCouponRequired: boolean;
  isFinancingPrice: boolean;
  isBundle: boolean;
  matchConfidence: number; // 0-1
  rawTitle: string;
  condition: 'new' | 'refurbished' | 'used';
  expectedCondition?: 'new' | 'refurbished' | 'used';
}

export interface FalseDealCheckResult {
  disqualifiers: string[];
  isBlocking: boolean; // when true, do not create/notify a Deal at all
}

const MISLEADING_TITLE_PATTERNS = [/\bmystery\b/i, /\bassorted\b/i, /\bmay vary\b/i, /\bas[\s-]?is\b/i];

export function checkFalseDeal(input: FalseDealCheckInput): FalseDealCheckResult {
  const disqualifiers: string[] = [];
  let isBlocking = false;

  if (input.currentPrice >= input.marketPrice) {
    disqualifiers.push('Current price is not below the calculated market price');
    isBlocking = true;
  }

  if (input.availability === 'out_of_stock') {
    disqualifiers.push('Listing is out of stock');
    isBlocking = true;
  }

  if (input.isMembershipOnly) {
    disqualifiers.push('Price requires a paid membership — shown but not treated as the headline price');
  }

  if (input.isCouponRequired) {
    disqualifiers.push('Price requires a coupon code at checkout');
  }

  if (input.isFinancingPrice) {
    disqualifiers.push('Price reflects a financing/instalment plan, not the cash price');
  }

  if (input.isBundle) {
    disqualifiers.push('Listing is a bundle and was excluded from standalone market-price comparison');
  }

  if (input.expectedCondition && input.condition !== input.expectedCondition) {
    disqualifiers.push(
      `Condition mismatch: listing is ${input.condition}, expected ${input.expectedCondition}`
    );
    isBlocking = true;
  }

  if (input.matchConfidence < 0.6) {
    disqualifiers.push('Low product-matching confidence — market price comparison may be unreliable');
    isBlocking = true;
  }

  if (MISLEADING_TITLE_PATTERNS.some((p) => p.test(input.rawTitle))) {
    disqualifiers.push('Listing title looks non-specific or misleading');
    isBlocking = true;
  }

  // Sudden implausible drops (>75% off) are far more often pricing errors than
  // genuine deals — flag for review rather than silently trusting them.
  const percentOff = ((input.marketPrice - input.currentPrice) / input.marketPrice) * 100;
  if (percentOff > 75) {
    disqualifiers.push('Discount exceeds 75% — likely a pricing error, flagged for manual review');
  }

  return { disqualifiers, isBlocking };
}
