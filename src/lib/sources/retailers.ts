import type { SourceAdapter } from './types';
import { createRetailerAdapter } from './retailerAdapter';
import { fetchAmazonZaListings } from './amazonPaApi';
import { fetchTakealotListings } from './takealotFeed';

/**
 * The two sources this deployment tracks — Amazon ZA and Takealot — chosen
 * because they're the only ones of the originally-requested five with a
 * real, accessible official API/feed. (Makro, Incredible Connection, and
 * VodaBucks had no publicly documented API and were removed.)
 *
 * Both fall back to clearly-labelled simulated data until real credentials
 * are supplied — see .env.example for exactly what to set.
 */

// ── Amazon ZA ────────────────────────────────────────────────────────────
// Real integration: Amazon Product Advertising API (PA-API 5.0), signed
// with AWS Signature V4 — see amazonPaApi.ts for the implementation and
// important caveats about new-account rate limits and ZA marketplace
// support. Requires all three env vars below.
const amazonZa = createRetailerAdapter({
  key: 'amazon-za',
  name: 'Amazon ZA',
  priority: 'high',
  defaultScanFrequencyMinutes: 60,
  reliabilityWeight: 0.85,
  priceBias: 1.02,
  buildProductUrl: (title) => `https://www.amazon.co.za/s?k=${encodeURIComponent(title)}`,
  apiKeyEnvVar: 'AMAZON_ZA_ACCESS_KEY',
  additionalRequiredEnvVars: ['AMAZON_ZA_SECRET_KEY', 'AMAZON_ZA_PARTNER_TAG'],
  fetchReal: () =>
    fetchAmazonZaListings({
      accessKey: process.env.AMAZON_ZA_ACCESS_KEY!,
      secretKey: process.env.AMAZON_ZA_SECRET_KEY!,
      partnerTag: process.env.AMAZON_ZA_PARTNER_TAG!,
    }),
});

// ── Takealot ─────────────────────────────────────────────────────────────
// Real integration: reads a CSV product feed URL from your Takealot
// affiliate programme access (see takealotFeed.ts for the parsing logic
// and column-name caveats — the exact feed schema hasn't been verified
// against a real sample).
const takealot = createRetailerAdapter({
  key: 'takealot',
  name: 'Takealot',
  priority: 'high',
  defaultScanFrequencyMinutes: 60,
  reliabilityWeight: 0.85,
  priceBias: 0.98,
  buildProductUrl: (title) => `https://www.takealot.com/all?qsearch=${encodeURIComponent(title)}`,
  apiKeyEnvVar: 'TAKEALOT_AFFILIATE_FEED_URL',
  fetchReal: () => fetchTakealotListings(process.env.TAKEALOT_AFFILIATE_FEED_URL!),
});

export const ALL_ADAPTERS: SourceAdapter[] = [amazonZa, takealot];
