import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { runScanForSource } from '@/lib/pipeline/scanSource';

/**
 * Integration test: runs the real pipeline (normalize -> upsert -> market
 * price -> score -> dedup -> deal) against the takealot adapter (in simulated
 * mode, since no live API key is configured in tests) using
 * the real (local dev) Postgres database, then asserts the invariants the
 * spec cares about most: deals only exist when genuinely below market, and
 * duplicate scans don't create duplicate Deal rows per product.
 */
describe('runScanForSource (integration)', () => {
  beforeAll(async () => {
    // Isolate: wipe scan-related tables so this test is deterministic
    // regardless of what demo seeding already did.
    await prisma.notificationLog.deleteMany();
    await prisma.deal.deleteMany();
    await prisma.priceObservation.deleteMany();
    await prisma.marketPrice.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.product.deleteMany();
    await prisma.scanRun.deleteMany();
    await prisma.source.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('populates products, listings and (for some products) deals', async () => {
    const result = await runScanForSource('takealot');
    expect(result.status).not.toBe('failed');
    expect(result.productsChecked).toBeGreaterThan(0);

    const productCount = await prisma.product.count();
    expect(productCount).toBeGreaterThan(0);
  });

  it('never records a deal whose current price is not below its market price', async () => {
    const deals = await prisma.deal.findMany();
    for (const deal of deals) {
      expect(Number(deal.currentPrice)).toBeLessThan(Number(deal.marketPrice));
    }
  });

  it('creates at most one active Deal per product (deduplication)', async () => {
    const deals = await prisma.deal.findMany();
    const productIds = deals.map((d) => d.productId);
    expect(new Set(productIds).size).toBe(productIds.length);
  });

  it('re-scanning the same source does not duplicate listings', async () => {
    const before = await prisma.listing.count();
    await runScanForSource('takealot');
    const after = await prisma.listing.count();
    expect(after).toBe(before);
  });
});
