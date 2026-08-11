import type { RawListing, SourceAdapter, SourceAdapterMeta } from './types';

/**
 * TEMPLATE FOR A REAL RETAILER/MARKETPLACE INTEGRATION
 * ─────────────────────────────────────────────────────
 * This adapter is disabled by default (isConfigured() returns false until
 * an API key is supplied) and is NOT registered in the scanner by default —
 * see lib/sources/registry.ts. It exists as a working template for adding a
 * real, permitted integration later (an official retailer/marketplace API,
 * affiliate feed, or RSS/XML price feed).
 *
 * We intentionally do NOT build scrapers that bypass CAPTCHAs, logins, or
 * anti-bot protection — only official, permitted access methods. To wire up
 * a real source:
 *
 *   1. Get an API key from the retailer/marketplace's developer program.
 *   2. Add it to `.env` as EXAMPLE_RETAILER_API_KEY=... (see .env.example).
 *   3. Replace the fetch call below with that API's real endpoint/response
 *      shape, mapping each result into a `RawListing`.
 *   4. Register the adapter in lib/sources/registry.ts.
 *
 * The rest of the pipeline (matching, market price, scoring, notifications)
 * needs no changes — it only ever talks to the SourceAdapter interface.
 */

const API_KEY_ENV_VAR = 'EXAMPLE_RETAILER_API_KEY';

const meta: SourceAdapterMeta = {
  key: 'example-retailer-api',
  name: 'Example Retailer (official API — requires key)',
  type: 'api',
  priority: 'normal',
  defaultScanFrequencyMinutes: 30,
  reliabilityWeight: 0.9,
  requiresApiKey: true,
  apiKeyEnvVar: API_KEY_ENV_VAR,
};

export const exampleApiAdapter: SourceAdapter = {
  meta,
  isConfigured(): boolean {
    return Boolean(process.env[API_KEY_ENV_VAR]);
  },
  async fetchListings(): Promise<RawListing[]> {
    const apiKey = process.env[API_KEY_ENV_VAR];
    if (!apiKey) return [];

    // Example only — replace with the real endpoint once you have credentials.
    // const res = await fetch('https://api.example-retailer.invalid/v1/catalogue', {
    //   headers: { Authorization: `Bearer ${apiKey}` },
    // });
    // const data = await res.json();
    // return data.products.map((p): RawListing => ({ ...map fields here... }));

    return [];
  },
};
