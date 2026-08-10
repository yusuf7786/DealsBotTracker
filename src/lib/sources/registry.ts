import type { SourceAdapter } from './types';
import { demoAdapters } from './demoAdapter';
import { exampleApiAdapter } from './exampleApiAdapter';

/**
 * Central registry of every source adapter the scanner knows about. Add a
 * new retailer/marketplace by creating an adapter file next to this one and
 * pushing it into this array — nothing else in the app needs to change.
 */
export const ALL_ADAPTERS: SourceAdapter[] = [...demoAdapters, exampleApiAdapter];

export function getAdapter(key: string): SourceAdapter | undefined {
  return ALL_ADAPTERS.find((a) => a.meta.key === key);
}
