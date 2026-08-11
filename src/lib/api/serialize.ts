import { toNumber } from '../utils/currency';

/** Recursively converts Prisma Decimal fields (and Dates) into plain JSON-safe values. */
export function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString() as unknown as T;
  if (Array.isArray(value)) return value.map((v) => serialize(v)) as unknown as T;
  if (typeof value === 'object') {
    // Prisma's Decimal (decimal.js) survives production minification with an
    // unpredictable constructor name, so detect it structurally instead.
    const maybeDecimal = value as { toNumber?: unknown; toFixed?: unknown; d?: unknown; e?: unknown; s?: unknown };
    if (typeof maybeDecimal.toNumber === 'function' && typeof maybeDecimal.toFixed === 'function') {
      return toNumber(value) as unknown as T;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serialize(v);
    }
    return out as T;
  }
  return value;
}
