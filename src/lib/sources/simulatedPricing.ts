import type { RawListing } from './types';
import { PRODUCT_CATALOGUE } from './productCatalogue';

/**
 * Deterministic seeded PRNG (mulberry32) so a given hour always produces the
 * same simulated snapshot — stable within a scan cycle, drifting hour to
 * hour like a real market would, without any network calls.
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

export interface SimulatedPricingConfig {
  sourceKey: string;
  sellerName: string;
  /** Multiplier applied to each product's market anchor to give this retailer a consistent price lean. */
  priceBias: number;
  buildProductUrl: (productTitle: string) => string;
}

/**
 * Generates a realistic simulated catalogue snapshot for a retailer that
 * doesn't have a live API connected. Every listing is flagged
 * `isSimulated: true` so the UI can be explicit that this isn't a real,
 * current price — and the "View Deal" link always points at a real, live
 * search-results page on the retailer's actual site.
 */
export function generateSimulatedListings(config: SimulatedPricingConfig): RawListing[] {
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
  const listings: RawListing[] = [];

  for (const product of PRODUCT_CATALOGUE) {
    const seed = hashString(`${config.sourceKey}:${product.title}:${hourBucket}`);
    const rand = mulberry32(seed);

    // Not every retailer stocks every product.
    if (rand() < 0.12) continue;

    const noise = 0.94 + rand() * 0.12; // +/-6%
    let price = Math.round(product.marketAnchor * config.priceBias * noise);

    const isDeepDiscount = rand() < 0.08;
    if (isDeepDiscount) {
      price = Math.round(product.marketAnchor * (0.72 + rand() * 0.1));
    }

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
      url: config.buildProductUrl(product.title),
      sellerName: config.sellerName,
      sellerRating: Math.round((3.2 + rand() * 1.7) * 10) / 10,
      condition: product.condition ?? 'new',
      warranty: product.condition === 'refurbished' ? '6 Month Seller Warranty' : '12 Month Manufacturer Warranty',
      availability: outOfStock ? 'out_of_stock' : 'in_stock',
      shippingCost: rand() < 0.5 ? 0 : Math.round(99 + rand() * 150),
      isMembershipOnly,
      isCouponRequired,
      isFinancingPrice,
      isBundle,
      isSimulated: true,
      region: 'ZA',
    });
  }

  return listings;
}
