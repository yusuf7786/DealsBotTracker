import { describe, it, expect } from 'vitest';
import { shouldNotify } from '@/lib/notifications/dispatcher';

describe('shouldNotify (notification deduplication)', () => {
  it('always notifies the first time', () => {
    expect(shouldNotify(null, null, 19999)).toBe(true);
  });

  it('does not re-notify for an unchanged price shortly after', () => {
    expect(shouldNotify(new Date(), 19999, 19999)).toBe(false);
  });

  it('does not re-notify for a trivial price wobble', () => {
    expect(shouldNotify(new Date(), 19999, 19900)).toBe(false); // <2% drop
  });

  it('re-notifies when the price drops meaningfully', () => {
    expect(shouldNotify(new Date(), 19999, 19000)).toBe(true); // >2% drop
  });

  it('re-notifies after 24h even without a price change', () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    expect(shouldNotify(twoDaysAgo, 19999, 19999)).toBe(true);
  });
});
