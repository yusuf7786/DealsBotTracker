import { describe, it, expect } from 'vitest';
import { alertRuleMatches } from '@/lib/engines/alertRuleMatch';

const deal = {
  currentPrice: 19500,
  savingsPercent: 18,
  dealScore: 88,
  savingsAmount: 4500,
  brand: 'Samsung',
  category: 'Smartphones',
  isNearAllTimeLow: true,
};

describe('alertRuleMatches', () => {
  it('matches "falls below R20,000"', () => {
    expect(alertRuleMatches([{ field: 'currentPrice', operator: 'lt', value: 20000 }], deal)).toBe(true);
  });

  it('matches "deal score exceeds 85"', () => {
    expect(alertRuleMatches([{ field: 'dealScore', operator: 'gt', value: 85 }], deal)).toBe(true);
  });

  it('requires ALL conditions in a rule to pass', () => {
    const conditions = [
      { field: 'dealScore' as const, operator: 'gt' as const, value: 85 },
      { field: 'brand' as const, operator: 'eq' as const, value: 'Apple' },
    ];
    expect(alertRuleMatches(conditions, deal)).toBe(false);
  });

  it('returns false for a rule with no conditions', () => {
    expect(alertRuleMatches([], deal)).toBe(false);
  });
});
