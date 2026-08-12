import crypto from 'crypto';
import type { RawListing } from './types';
import { PRODUCT_CATALOGUE } from './productCatalogue';
import { logger } from '../utils/logger';

/**
 * Real Amazon Product Advertising API (PA-API 5.0) client — SearchItems
 * operation, signed with AWS Signature V4.
 *
 * IMPORTANT CAVEATS (read before relying on this):
 *   - PA-API access is tied to your Amazon Associates account. Brand-new
 *     Associates accounts are typically rate-limited very aggressively
 *     (sometimes ~1 request/hour) until the account has 3 qualifying
 *     sales within a rolling 180-day window. That's an Amazon policy
 *     limit, not something this code can work around.
 *   - The exact host/region PA-API expects can vary by marketplace and
 *     occasionally changes on Amazon's side. AMAZON_ZA_HOST/AMAZON_ZA_REGION
 *     are overridable via env vars with best-effort defaults below — check
 *     https://webservices.amazon.com/paapi5/documentation/locale-reference.html
 *     if requests start failing with a host/region error.
 *   - There's no "give me all current deals" endpoint — SearchItems needs a
 *     keyword, so this searches once per product in the catalogue, the same
 *     list used for simulated mode. Real Amazon prices simply take over
 *     those same products once matches are found.
 */

const SERVICE = 'ProductAdvertisingAPI';
const PATH = '/paapi5/searchitems';
const TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmac(key: crypto.BinaryLike, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function getSigningKey(secretKey: string, dateStamp: string, region: string): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

interface SearchItemsParams {
  keywords: string;
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  host: string;
  region: string;
  marketplace: string;
}

async function searchItems(params: SearchItemsParams): Promise<any> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const body = JSON.stringify({
    Keywords: params.keywords,
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.Classifications',
      'Offers.Listings.Price',
      'Offers.Listings.SavingBasis',
      'Offers.Listings.Availability.Type',
      'Offers.Listings.MerchantInfo',
      'Offers.Listings.Condition',
    ],
    SearchIndex: 'All',
    ItemCount: 3,
    PartnerTag: params.partnerTag,
    PartnerType: 'Associates',
    Marketplace: params.marketplace,
  });

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${params.host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${TARGET}\n`;
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  const canonicalRequest = ['POST', PATH, '', canonicalHeaders, signedHeaders, sha256Hex(body)].join('\n');

  const credentialScope = `${dateStamp}/${params.region}/${SERVICE}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const signingKey = getSigningKey(params.secretKey, dateStamp, params.region);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${params.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${params.host}${PATH}`, {
    method: 'POST',
    headers: {
      'content-encoding': 'amz-1.0',
      'content-type': 'application/json; charset=utf-8',
      host: params.host,
      'x-amz-date': amzDate,
      'x-amz-target': TARGET,
      Authorization: authorization,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Amazon PA-API error ${res.status}: ${text.slice(0, 500)}`);
  }

  return res.json();
}

function mapItemToListing(item: any, fallbackCategory: string): RawListing | null {
  const listing = item?.Offers?.Listings?.[0];
  const price = listing?.Price?.Amount;
  const title = item?.ItemInfo?.Title?.DisplayValue;
  const url = item?.DetailPageURL;
  if (!price || !title || !url) return null;

  return {
    title,
    category: item?.ItemInfo?.Classifications?.ProductGroup?.DisplayValue ?? fallbackCategory,
    price,
    currency: listing?.Price?.Currency ?? 'ZAR',
    url,
    sellerName: listing?.MerchantInfo?.Name ?? 'Amazon',
    condition: (listing?.Condition?.Value ?? 'New').toLowerCase().includes('used') ? 'used' : 'new',
    availability: listing?.Availability?.Type === 'Now' ? 'in_stock' : 'out_of_stock',
    isSimulated: false,
  };
}

/**
 * Runs one SearchItems call per catalogue product, sequentially with a
 * delay between calls to respect PA-API's strict per-second/per-day rate
 * limits (especially tight for new Associates accounts). A single failed
 * lookup is logged and skipped rather than aborting the whole scan.
 */
export async function fetchAmazonZaListings(credentials: {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
}): Promise<RawListing[]> {
  const host = process.env.AMAZON_ZA_HOST || 'webservices.amazon.co.za';
  const region = process.env.AMAZON_ZA_REGION || 'eu-west-1';
  const marketplace = process.env.AMAZON_ZA_MARKETPLACE || 'www.amazon.co.za';

  const listings: RawListing[] = [];

  for (const product of PRODUCT_CATALOGUE) {
    try {
      const result = await searchItems({
        keywords: product.title,
        accessKey: credentials.accessKey,
        secretKey: credentials.secretKey,
        partnerTag: credentials.partnerTag,
        host,
        region,
        marketplace,
      });

      const items = result?.SearchResult?.Items ?? [];
      for (const item of items) {
        const mapped = mapItemToListing(item, product.category);
        if (mapped) listings.push(mapped);
      }
    } catch (err) {
      logger.warn('amazon-za search failed', { product: product.title, error: err instanceof Error ? err.message : String(err) });
    }

    // Stay well under PA-API's per-second rate limit between calls.
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  return listings;
}
