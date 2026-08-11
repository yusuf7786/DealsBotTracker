import type { SourceAdapter } from './types';
import { createRetailerAdapter } from './retailerAdapter';

/**
 * The five sources this deployment is configured to track. Each is a real,
 * named South African retailer/marketplace — no more generic "Demo Source
 * A/B/C" placeholders.
 *
 * None of these scrape the retailer's website directly — that would violate
 * their Terms of Service, and for an app-only surface like VodaBucks it
 * would mean bypassing access controls, which this project won't do. Two
 * (Amazon ZA, Takealot) have a real, official integration path documented
 * below and ready to wire up once you have credentials. The other three
 * have no public API available at all as far as is publicly documented, so
 * they run in simulated mode until/unless that changes — clearly flagged
 * as simulated in the UI rather than presented as live prices.
 */

// ── Amazon ZA ────────────────────────────────────────────────────────────
// Real integration: Amazon Product Advertising API (PA-API 5.0).
//   1. Join the Amazon Associates programme for amazon.co.za.
//   2. Request PA-API access from https://webservices.amazon.com/paapi5/documentation/
//   3. Set AMAZON_ZA_ACCESS_KEY, AMAZON_ZA_SECRET_KEY, AMAZON_ZA_PARTNER_TAG in .env.
//   4. Implement `fetchReal` below using PA-API's SearchItems/GetItems operations
//      (requests must be signed with AWS Signature V4).
const amazonZa = createRetailerAdapter({
  key: 'amazon-za',
  name: 'Amazon ZA',
  priority: 'high',
  defaultScanFrequencyMinutes: 15,
  reliabilityWeight: 0.85,
  priceBias: 1.02,
  buildProductUrl: (title) => `https://www.amazon.co.za/s?k=${encodeURIComponent(title)}`,
  apiKeyEnvVar: 'AMAZON_ZA_ACCESS_KEY',
  // fetchReal intentionally left unimplemented until real PA-API credentials are supplied and
  // the request-signing logic is written — see notes above.
});

// ── Takealot ─────────────────────────────────────────────────────────────
// Real integration: Takealot doesn't offer an open catalogue-search API to
// arbitrary developers. Two legitimate paths exist:
//   - Marketplace Seller API (if you register as a Takealot marketplace seller)
//   - Affiliate product feeds via their affiliate programme (commonly accessed
//     through a network such as Awin) — set TAKEALOT_AFFILIATE_FEED_URL to a
//     feed URL once you have one and implement `fetchReal` to parse it.
const takealot = createRetailerAdapter({
  key: 'takealot',
  name: 'Takealot',
  priority: 'high',
  defaultScanFrequencyMinutes: 10,
  reliabilityWeight: 0.85,
  priceBias: 0.98,
  buildProductUrl: (title) => `https://www.takealot.com/all?qsearch=${encodeURIComponent(title)}`,
  apiKeyEnvVar: 'TAKEALOT_AFFILIATE_FEED_URL',
});

// ── Makro ────────────────────────────────────────────────────────────────
// No publicly documented developer/affiliate API is currently known for
// Makro South Africa (Massmart). Runs in simulated mode until that changes;
// "View Deal" links to Makro's real site search so you can check the actual
// current price yourself.
const makro = createRetailerAdapter({
  key: 'makro',
  name: 'Makro',
  priority: 'normal',
  defaultScanFrequencyMinutes: 30,
  reliabilityWeight: 0.8,
  priceBias: 1.05,
  buildProductUrl: (title) => `https://www.makro.co.za/search/?text=${encodeURIComponent(title)}`,
});

// ── Incredible Connection ───────────────────────────────────────────────
// No publicly documented developer/affiliate API is currently known.
// Simulated mode, same as Makro above.
const incredibleConnection = createRetailerAdapter({
  key: 'incredible-connection',
  name: 'Incredible Connection',
  priority: 'normal',
  defaultScanFrequencyMinutes: 30,
  reliabilityWeight: 0.75,
  priceBias: 1.03,
  buildProductUrl: (title) => `https://www.incredible.co.za/catalogsearch/result/?q=${encodeURIComponent(title)}`,
});

// ── VodaBucks (VodaPay) ──────────────────────────────────────────────────
// VodaBucks is a rewards/marketplace feature embedded inside the VodaPay
// mobile app, not a website — there is no public web catalogue and no
// known public API. Getting live data would require Vodacom's own
// partnership/API access; this project won't reverse-engineer the app.
// Runs in simulated mode; "View Deal" links to the VodaPay site with a note
// that the actual deal has to be opened in the app.
const vodabucks = createRetailerAdapter({
  key: 'vodabucks',
  name: 'VodaBucks (VodaPay)',
  priority: 'low',
  defaultScanFrequencyMinutes: 180,
  reliabilityWeight: 0.6,
  priceBias: 0.95,
  buildProductUrl: () => 'https://www.vodapay.co.za/',
});

export const ALL_ADAPTERS: SourceAdapter[] = [amazonZa, takealot, makro, incredibleConnection, vodabucks];
