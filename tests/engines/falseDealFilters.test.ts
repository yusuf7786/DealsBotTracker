import { describe, it, expect } from 'vitest';
import { checkFalseDeal } from '@/lib/engines/falseDealFilters';

const base = {
  currentPrice: 19999,
  marketPrice: 24999,
  availability: 'in_stock' as const,
  isMembershipOnly: false,
  isCouponRequired: false,
  isFinancingPrice: false,
  isBundle: false,
  matchConfidence: 0.9,
  rawTitle: 'Samsung Galaxy S26 Ultra 256GB',
  condition: 'new' as const,
};

describe('checkFalseDeal', () => {
  it('passes a genuinely cheaper, well-matched, in-stock listing', () => {
    const result = checkFalseDeal(base);
    expect(result.isBlocking).toBe(false);
  });

  it('blocks when the price is not actually below market', () => {
    const result = checkFalseDeal({ ...base, currentPrice: 25999 });
    expect(result.isBlocking).toBe(true);
  });

  it('blocks out-of-stock listings', () => {
    const result = checkFalseDeal({ ...base, availability: 'out_of_stock' });
    expect(result.isBlocking).toBe(true);
  });

  it('blocks low product-matching confidence', () => {
    const result = checkFalseDeal({ ...base, matchConfidence: 0.4 });
    expect(result.isBlocking).toBe(true);
  });

  it('flags but does not block coupon-required / membership / financing prices', () => {
    const coupon = checkFalseDeal({ ...base, isCouponRequired: true });
    expect(coupon.isBlocking).toBe(false);
    expect(coupon.disqualifiers.some((d) => d.includes('coupon'))).toBe(true);

    const membership = checkFalseDeal({ ...base, isMembershipOnly: true });
    expect(membership.disqualifiers.some((d) => d.includes('membership'))).toBe(true);
  });

  it('flags implausibly large discounts as likely pricing errors', () => {
    const result = checkFalseDeal({ ...base, currentPrice: 2000, marketPrice: 24999 });
    expect(result.disqualifiers.some((d) => d.includes('pricing error'))).toBe(true);
  });

  it('flags misleading / non-specific titles', () => {
    const result = checkFalseDeal({ ...base, rawTitle: 'Mystery Electronics Box' });
    expect(result.isBlocking).toBe(true);
  });
});
