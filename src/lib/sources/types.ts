/**
 * SOURCE ADAPTER ARCHITECTURE
 *
 * Every retailer/marketplace integration implements this interface. The
 * scanner worker only ever talks to `SourceAdapter` — it has no idea how
 * any individual source actually fetches data, so new sources can be added
 * later by dropping a new file in this folder and registering it, with no
 * change to the scanning/matching/scoring pipeline.
 */

export interface RawListing {
  /** Exact text as shown by the source — the matching engine parses this. */
  title: string;
  brand?: string;
  category: string;
  price: number;
  currency?: string;
  url: string;
  sellerName: string;
  sellerRating?: number; // 0-5
  condition?: 'new' | 'refurbished' | 'used';
  warranty?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';
  shippingCost?: number;
  isMembershipOnly?: boolean;
  isCouponRequired?: boolean;
  isFinancingPrice?: boolean;
  isBundle?: boolean;
  imageUrl?: string;
  region?: string;
  /** True when this listing is simulated (no real retailer API connected yet) rather than live data. */
  isSimulated?: boolean;
}

export interface SourceAdapterMeta {
  key: string;
  name: string;
  type: 'demo' | 'api' | 'feed';
  priority: 'high' | 'normal' | 'low';
  defaultScanFrequencyMinutes: number;
  reliabilityWeight: number; // 0-1, trust used by the market price engine
  requiresApiKey: boolean;
  /** Env var name holding the API key, if requiresApiKey is true. */
  apiKeyEnvVar?: string;
}

export interface SourceAdapter {
  meta: SourceAdapterMeta;
  /** Returns true if the adapter will produce any data at all right now (real API OR demo fallback). */
  isConfigured(): boolean;
  /** Returns true only if a real retailer API credential is present — never true from demo fallback. */
  hasRealCredentials(): boolean;
  /** Fetch the current catalogue snapshot. Must be well-behaved: rate-limited, cached, deduped upstream. */
  fetchListings(): Promise<RawListing[]>;
}
