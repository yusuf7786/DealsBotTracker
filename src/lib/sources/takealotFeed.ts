import type { RawListing } from './types';
import { logger } from '../utils/logger';

/**
 * Real Takealot integration — reads a CSV product feed from
 * TAKEALOT_AFFILIATE_FEED_URL (the URL you get once approved for
 * Takealot's affiliate programme, typically distributed through a
 * network such as Awin).
 *
 * IMPORTANT: Takealot doesn't publish a general catalogue-search API for
 * arbitrary developers, and this project hasn't seen a real feed sample —
 * the column names below are a best-effort guess at common affiliate feed
 * conventions (title/price/url/etc.), matched case-insensitively against
 * several likely variants. If your real feed uses different column names,
 * either rename its header row to match one of the variants below, or
 * adjust COLUMN_ALIASES to match your feed exactly.
 */

const COLUMN_ALIASES: Record<string, string[]> = {
  title: ['title', 'name', 'product_name', 'product_title'],
  price: ['price', 'current_price', 'sale_price', 'selling_price'],
  url: ['url', 'product_url', 'link', 'deeplink', 'affiliate_url'],
  brand: ['brand', 'manufacturer'],
  category: ['category', 'product_category', 'category_name'],
  availability: ['availability', 'stock_status', 'in_stock'],
  image: ['image', 'image_url', 'imageurl'],
  sku: ['sku', 'product_id', 'id'],
};

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells.map((c) => c.trim());
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ''));
    return row;
  });
}

function findColumn(row: Record<string, string>, field: keyof typeof COLUMN_ALIASES): string | undefined {
  const aliases = COLUMN_ALIASES[field];
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== '') return row[alias];
  }
  return undefined;
}

function mapRowToListing(row: Record<string, string>): RawListing | null {
  const title = findColumn(row, 'title');
  const priceRaw = findColumn(row, 'price');
  const url = findColumn(row, 'url');
  if (!title || !priceRaw || !url) return null;

  const price = Number(priceRaw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(price) || price <= 0) return null;

  const availabilityRaw = (findColumn(row, 'availability') ?? '').toLowerCase();
  const outOfStock = ['out of stock', 'unavailable', 'false', '0', 'no'].includes(availabilityRaw);

  return {
    title,
    brand: findColumn(row, 'brand'),
    category: findColumn(row, 'category') ?? 'General',
    price,
    currency: 'ZAR',
    url,
    sellerName: 'Takealot',
    condition: 'new',
    availability: outOfStock ? 'out_of_stock' : 'in_stock',
    isSimulated: false,
  };
}

export async function fetchTakealotListings(feedUrl: string): Promise<RawListing[]> {
  const res = await fetch(feedUrl);
  if (!res.ok) {
    throw new Error(`Takealot feed fetch failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const rows = parseCsv(text);

  const listings: RawListing[] = [];
  for (const row of rows) {
    const mapped = mapRowToListing(row);
    if (mapped) listings.push(mapped);
  }

  if (rows.length > 0 && listings.length === 0) {
    logger.warn('takealot feed parsed 0 usable listings — column names likely need adjusting', {
      sampleColumns: Object.keys(rows[0]),
    });
  }

  return listings;
}
