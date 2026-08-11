import type { SourceAdapter } from './types';
import { ALL_ADAPTERS as RETAILER_ADAPTERS } from './retailers';

/**
 * Central registry of every source adapter the scanner knows about. Add a
 * new retailer/marketplace by defining it in retailers.ts (or a new file)
 * and pushing it into this array — nothing else in the app needs to change.
 */
export const ALL_ADAPTERS: SourceAdapter[] = RETAILER_ADAPTERS;

export function getAdapter(key: string): SourceAdapter | undefined {
  return ALL_ADAPTERS.find((a) => a.meta.key === key);
}
