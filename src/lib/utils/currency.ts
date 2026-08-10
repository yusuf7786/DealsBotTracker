/**
 * Currency abstraction. The app defaults to ZAR (South Africa) per the
 * initial focus, but every amount carries its own currency code so more
 * countries/currencies can be added later without touching call sites.
 */

export const DEFAULT_CURRENCY = 'ZAR';

const CURRENCY_LOCALES: Record<string, string> = {
  ZAR: 'en-ZA',
  USD: 'en-US',
  GBP: 'en-GB',
  EUR: 'de-DE',
};

export function formatCurrency(amount: number | string, currency = DEFAULT_CURRENCY): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  const locale = CURRENCY_LOCALES[currency] ?? 'en-ZA';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  // Prisma.Decimal / Decimal.js-like objects implement toString()
  return Number(value.toString());
}
