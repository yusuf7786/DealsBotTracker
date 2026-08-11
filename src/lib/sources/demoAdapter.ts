import type { RawListing, SourceAdapter, SourceAdapterMeta } from './types';
import { DEMO_CATALOGUE, DEMO_SOURCES } from './demoData';

/**
 * Deterministic seeded PRNG (mulberry32) so a given hour always produces the
 * same "scan" — this keeps demo data stable within a scan cycle but lets it
 * drift hour to hour, simulating real market movement for the dashboard,
 * price history charts, and deal detection without hitting any real site.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
}

function makeAdapter(sourceKey: string): SourceAdapter {
  const sourceDef = DEMO_SOURCES.find((s) => s.key === sourceKey)!;

  const meta: SourceAdapterMeta = {
    key: sourceDef.key,
    name: sourceDef.name,
    type: 'demo',
    priority: sourceDef.key === 'demo-source-a' ? 'high' : 'normal',
    defaultScanFrequencyMinutes: sourceDef.key === 'demo-source-a' ? 10 : 30,
    reliabilityWeight: sourceDef.reliabilityWeight,
    requiresApiKey: false,
  };

  return {
    meta,
    isConfigured: () => true,
    async fetchListings(): Promise<RawListing[]> {
      // Hour-bucketed seed => stable-but-drifting demo prices, no network calls.
      const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
      const listings: RawListing[] = [];

      for (const product of DEMO_CATALOGUE) {
        const seed = hashString(`${sourceKey}:${product.title}:${hourBucket}`);
        const rand = mulberry32(seed);

        // Not every source stocks every product.
        if (rand() < 0.12) continue;

        const noise = 0.94 + rand() * 0.12; // +/-6%
        let price = Math.round(product.marketAnchor * sourceDef.bias * noise);

        // Occasionally simulate a genuine deep discount (real deal) on this source.
        const isDeepDiscount = rand() < 0.08;
        if (isDeepDiscount) {
          price = Math.round(product.marketAnchor * (0.72 + rand() * 0.1));
        }

        // Occasionally simulate a "false deal" pattern to exercise the filters.
        const flagRoll = rand();
        const isBundle = flagRoll < 0.04;
        const isCouponRequired = flagRoll >= 0.04 && flagRoll < 0.07;
        const isFinancingPrice = flagRoll >= 0.07 && flagRoll < 0.09;
        const isMembershipOnly = flagRoll >= 0.09 && flagRoll < 0.11;
        const outOfStock = rand() < 0.05;

        listings.push({
          title: product.title,
          brand: product.brand,
          category: product.category,
          price,
          currency: 'ZAR',
          url: `https://example-${sourceKey}.invalid/product/${encodeURIComponent(product.title)}`,
          sellerName: sourceDef.name,
          sellerRating: Math.round((3.2 + rand() * 1.7) * 10) / 10,
          condition: product.condition ?? 'new',
          warranty: product.condition === 'refurbished' ? '6 Month Seller Warranty' : '12 Month Manufacturer Warranty',
          availability: outOfStock ? 'out_of_stock' : 'in_stock',
          shippingCost: rand() < 0.5 ? 0 : Math.round(99 + rand() * 150),
          isMembershipOnly,
          isCouponRequired,
          isFinancingPrice,
          isBundle,
          region: 'ZA',
        });
      }

      return listings;
    },
  };
}

export const demoAdapters: SourceAdapter[] = DEMO_SOURCES.map((s) => makeAdapter(s.key));
