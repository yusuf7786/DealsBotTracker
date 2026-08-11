/**
 * DEAL DEDUPLICATION
 *
 * A Product may have many active Listings (one per source/seller). Rather
 * than generating one Deal per listing, we group them all under the
 * product's single Deal record, pick the best (lowest, in-stock, non-
 * disqualified) listing as the headline price, and keep every other
 * listing available as "other sellers" on the deal detail page.
 */

export interface ListingLike {
  id: string;
  currentPrice: number;
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';
  active: boolean;
}

export function pickBestListing<T extends ListingLike>(listings: T[]): T | null {
  const candidates = listings.filter((l) => l.active && l.availability === 'in_stock');
  const pool = candidates.length > 0 ? candidates : listings.filter((l) => l.active);
  if (pool.length === 0) return null;
  return pool.reduce((best, current) => (current.currentPrice < best.currentPrice ? current : best));
}
