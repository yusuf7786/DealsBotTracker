/**
 * WATCHLIST MATCHING
 *
 * Decides whether a deal matches a user's watchlist entry. A match makes
 * the deal notification-eligible even if it falls under the global
 * dashboard thresholds — the whole point of a watchlist entry is "notify
 * me about this even if it wouldn't otherwise make the cut".
 */

export interface WatchlistItemLike {
  type: string; // product | brand | category | keyword
  query: string;
  priceLimit: number | null;
  minDiscountPercent: number | null;
  minDealScore: number | null;
  enabled: boolean;
}

export interface DealForMatching {
  brand: string;
  productName: string;
  category: string;
  currentPrice: number;
  savingsPercent: number;
  dealScore: number;
}

function textMatches(query: string, ...haystacks: string[]) {
  const q = query.toLowerCase().trim();
  return haystacks.some((h) => h.toLowerCase().includes(q));
}

export function watchlistItemMatches(item: WatchlistItemLike, deal: DealForMatching): boolean {
  if (!item.enabled) return false;

  let identityMatch = false;
  switch (item.type) {
    case 'brand':
      identityMatch = textMatches(item.query, deal.brand);
      break;
    case 'category':
      identityMatch = textMatches(item.query, deal.category);
      break;
    case 'product':
    case 'keyword':
    default:
      identityMatch = textMatches(item.query, `${deal.brand} ${deal.productName}`);
      break;
  }
  if (!identityMatch) return false;

  // Any ONE of the configured conditions being satisfied is enough (per spec
  // example: "price below X OR at least Y% below market OR score above Z").
  const conditions: boolean[] = [];
  if (item.priceLimit !== null) conditions.push(deal.currentPrice <= item.priceLimit);
  if (item.minDiscountPercent !== null) conditions.push(deal.savingsPercent >= item.minDiscountPercent);
  if (item.minDealScore !== null) conditions.push(deal.dealScore >= item.minDealScore);

  if (conditions.length === 0) return true; // no extra conditions => identity match is enough
  return conditions.some(Boolean);
}
