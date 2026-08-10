/**
 * ALERT RULES
 *
 * Generic condition-based rules, e.g. "notify when price falls below
 * R20,000" or "notify when deal score exceeds 85". Each rule is a list of
 * conditions (ALL must pass) over a fixed set of fields.
 */

export type AlertField =
  | 'currentPrice'
  | 'savingsPercent'
  | 'dealScore'
  | 'savingsAmount'
  | 'brand'
  | 'category'
  | 'isNearAllTimeLow';

export type AlertOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'contains';

export interface AlertCondition {
  field: AlertField;
  operator: AlertOperator;
  value: string | number | boolean;
}

export interface DealForAlertMatching {
  currentPrice: number;
  savingsPercent: number;
  dealScore: number;
  savingsAmount: number;
  brand: string;
  category: string;
  isNearAllTimeLow: boolean;
}

function evalCondition(condition: AlertCondition, deal: DealForAlertMatching): boolean {
  const actual = deal[condition.field];
  switch (condition.operator) {
    case 'lt':
      return Number(actual) < Number(condition.value);
    case 'lte':
      return Number(actual) <= Number(condition.value);
    case 'gt':
      return Number(actual) > Number(condition.value);
    case 'gte':
      return Number(actual) >= Number(condition.value);
    case 'eq':
      return String(actual).toLowerCase() === String(condition.value).toLowerCase();
    case 'contains':
      return String(actual).toLowerCase().includes(String(condition.value).toLowerCase());
    default:
      return false;
  }
}

export function alertRuleMatches(conditions: AlertCondition[], deal: DealForAlertMatching): boolean {
  if (conditions.length === 0) return false;
  return conditions.every((c) => evalCondition(c, deal));
}
