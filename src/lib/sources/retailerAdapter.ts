import type { RawListing, SourceAdapter, SourceAdapterMeta } from './types';
import { generateSimulatedListings } from './simulatedPricing';

export interface RetailerAdapterConfig {
  key: string;
  name: string;
  priority: 'high' | 'normal' | 'low';
  defaultScanFrequencyMinutes: number;
  reliabilityWeight: number;
  /** Simulated-mode price lean relative to the catalogue's market anchor (1.0 = right at anchor). */
  priceBias: number;
  /** Builds a real, live URL to that product on the retailer's actual site (a search results page is fine). */
  buildProductUrl: (productTitle: string) => string;
  /** Primary env var holding the real API credential, if an official API integration exists for this retailer. */
  apiKeyEnvVar?: string;
  /** Any additional env vars ALSO required before the real API is considered configured (e.g. Amazon needs 3). */
  additionalRequiredEnvVars?: string[];
  /**
   * Real API implementation, called only when all required env vars are present. Left undefined for
   * retailers with no known public API (see the adapter definitions in retailers.ts for why).
   */
  fetchReal?: () => Promise<RawListing[]>;
}

/**
 * Builds a SourceAdapter for one named retailer. Behaviour:
 *   - If all required real-API env vars are present AND a real fetch implementation exists, use it.
 *   - Otherwise, in DEMO_MODE, fall back to a simulated snapshot (clearly flagged
 *     `isSimulated: true` on every listing) so the app stays usable until real
 *     credentials are added.
 *   - Otherwise, return no listings.
 */
export function createRetailerAdapter(config: RetailerAdapterConfig): SourceAdapter {
  const meta: SourceAdapterMeta = {
    key: config.key,
    name: config.name,
    type: config.apiKeyEnvVar && config.fetchReal ? 'api' : 'demo',
    priority: config.priority,
    defaultScanFrequencyMinutes: config.defaultScanFrequencyMinutes,
    reliabilityWeight: config.reliabilityWeight,
    requiresApiKey: Boolean(config.apiKeyEnvVar),
    apiKeyEnvVar: config.apiKeyEnvVar,
  };

  const hasRealCredentials = () => {
    if (!config.apiKeyEnvVar || !config.fetchReal) return false;
    const requiredVars = [config.apiKeyEnvVar, ...(config.additionalRequiredEnvVars ?? [])];
    return requiredVars.every((v) => Boolean(process.env[v]));
  };

  return {
    meta,
    isConfigured(): boolean {
      const demoModeOn = process.env.DEMO_MODE === 'true';
      return hasRealCredentials() || demoModeOn;
    },
    hasRealCredentials,
    async fetchListings(): Promise<RawListing[]> {
      if (hasRealCredentials() && config.fetchReal) {
        return config.fetchReal();
      }
      if (process.env.DEMO_MODE === 'true') {
        return generateSimulatedListings({
          sourceKey: config.key,
          sellerName: config.name,
          priceBias: config.priceBias,
          buildProductUrl: config.buildProductUrl,
        });
      }
      return [];
    },
  };
}
