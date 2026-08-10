/**
 * PRODUCT MATCHING / NORMALIZATION ENGINE
 *
 * Turns a messy raw retailer listing title (plus whatever structured hints
 * a source adapter can supply) into a canonical product identity. Two
 * listings are only ever considered "the same product" for market-price
 * comparison when every distinguishing attribute matches:
 *
 *   brand, model line, variant, storage, RAM, colour, condition, region,
 *   connectivity (wifi/cellular), SIM type (single/dual).
 *
 * This deliberately avoids "fuzzy" title-similarity matching for identity
 * purposes — fuzzy matching is how a 512GB phone ends up compared against
 * a 256GB one. Instead we extract concrete attributes and require an exact
 * match on the canonical key.
 */

export interface RawProductInput {
  title: string;
  brand?: string;
  category: string;
  condition?: string; // "new" | "refurbished" | "used" if known from source
  region?: string;
}

export interface NormalizedProduct {
  canonicalKey: string;
  brand: string;
  productName: string;
  modelNumber: string | null;
  variant: string | null;
  storage: string | null;
  ram: string | null;
  colour: string | null;
  condition: 'new' | 'refurbished' | 'used';
  region: string;
  connectivity: 'wifi' | 'cellular' | null;
  simType: 'single-sim' | 'dual-sim' | null;
  category: string;
}

const KNOWN_COLOURS = [
  'black', 'white', 'silver', 'gold', 'rose gold', 'graphite', 'midnight',
  'starlight', 'blue', 'red', 'green', 'purple', 'yellow', 'pink', 'grey',
  'gray', 'titanium', 'natural titanium', 'blue titanium', 'white titanium',
  'phantom black', 'cream', 'lavender', 'mint',
];

function extractStorage(title: string): string | null {
  const match = title.match(/(\d+)\s?(TB|GB)\b/i);
  if (!match) return null;
  return `${match[1]}${match[2].toUpperCase()}`;
}

function extractRam(title: string): string | null {
  const match = title.match(/(\d+)\s?GB\s?RAM\b/i);
  return match ? `${match[1]}GB` : null;
}

function extractColour(title: string): string | null {
  const lower = title.toLowerCase();
  const found = KNOWN_COLOURS.find((c) => lower.includes(c));
  return found ?? null;
}

function extractCondition(title: string, hint?: string): 'new' | 'refurbished' | 'used' {
  if (hint) return hint as 'new' | 'refurbished' | 'used';
  const lower = title.toLowerCase();
  if (/refurb|renewed|certified pre-owned/.test(lower)) return 'refurbished';
  if (/\bused\b|second\s?hand|pre-?owned(?!\s+certified)/.test(lower)) return 'used';
  return 'new';
}

function extractConnectivity(title: string): 'wifi' | 'cellular' | null {
  const lower = title.toLowerCase();
  if (/cellular|4g|5g|lte/.test(lower)) return 'cellular';
  if (/wi-?fi only|wi-?fi\b/.test(lower)) return 'wifi';
  return null;
}

function extractSimType(title: string): 'single-sim' | 'dual-sim' | null {
  const lower = title.toLowerCase();
  if (/dual[\s-]?sim/.test(lower)) return 'dual-sim';
  if (/single[\s-]?sim/.test(lower)) return 'single-sim';
  return null;
}

function extractModelNumber(title: string): string | null {
  // e.g. "SM-S938B", "A2849", "MQ8K3"
  const match = title.match(/\b([A-Z]{1,4}-?[A-Z0-9]{3,10})\b/);
  return match ? match[1] : null;
}

function extractVariant(title: string): string | null {
  const lower = title.toLowerCase();
  const variants = ['pro max', 'ultra', 'pro', 'plus', 'max', 'mini', 'se', 'lite', 'air'];
  for (const v of variants) {
    if (new RegExp(`\\b${v}\\b`, 'i').test(lower)) return v;
  }
  return null;
}

function stripKnownTokens(title: string): string {
  return title
    .replace(/\(.*?\)/g, ' ')
    .replace(/\d+\s?(TB|GB)\s?RAM/gi, ' ')
    .replace(/\d+\s?(TB|GB)/gi, ' ')
    .replace(/dual[\s-]?sim|single[\s-]?sim/gi, ' ')
    .replace(/wi-?fi\s?(\+\s?cellular)?|cellular/gi, ' ')
    .replace(/refurb(ished)?|renewed|certified pre-owned|used|second\s?hand|pre-?owned|brand\s?new/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * How confident we are that this normalization correctly identifies the
 * exact product (as opposed to merging two subtly different variants
 * together). Missing attributes lower confidence rather than being
 * silently ignored — a product with unknown storage/colour should not be
 * blindly compared against one where those attributes are known.
 */
export function computeMatchConfidence(product: NormalizedProduct): number {
  let score = 0.55; // base confidence from brand + product name alone
  if (product.modelNumber) score += 0.15;
  if (product.storage) score += 0.15;
  if (product.colour) score += 0.05;
  if (product.variant) score += 0.05;
  if (product.condition) score += 0.05;
  return Math.min(1, score);
}

export function normalizeProduct(input: RawProductInput): NormalizedProduct {
  const title = input.title.trim();
  const brand = (input.brand ?? title.split(' ')[0]).trim();
  const storage = extractStorage(title);
  const ram = extractRam(title);
  const colour = extractColour(title);
  const condition = extractCondition(title, input.condition);
  const connectivity = extractConnectivity(title);
  const simType = extractSimType(title);
  const modelNumber = extractModelNumber(title);
  const variant = extractVariant(title);
  const region = input.region ?? 'ZA';

  const productName = stripKnownTokens(title) || title;

  const canonicalKey = [
    slugify(brand),
    slugify(productName),
    variant ? slugify(variant) : 'novariant',
    storage ? slugify(storage) : 'nostorage',
    ram ? slugify(ram) : 'noram',
    colour ? slugify(colour) : 'nocolour',
    condition,
    region,
    connectivity ?? 'noconn',
    simType ?? 'nosim',
  ].join('__');

  return {
    canonicalKey,
    brand,
    productName,
    modelNumber,
    variant,
    storage,
    ram,
    colour,
    condition,
    region,
    connectivity,
    simType,
    category: input.category,
  };
}
