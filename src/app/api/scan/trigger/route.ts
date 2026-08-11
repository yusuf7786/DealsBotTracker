import { NextResponse } from 'next/server';
import { ALL_ADAPTERS } from '@/lib/sources/registry';
import { runScanForSource } from '@/lib/pipeline/scanSource';

/**
 * Manual "scan now" — runs the exact same pipeline the background worker
 * uses, synchronously, so it works even before the worker process/Redis is
 * up (useful right after first install). Pass { sourceKey } to scan just
 * one source, or omit it to scan every configured source.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}) as { sourceKey?: string });
  const targets = body.sourceKey ? ALL_ADAPTERS.filter((a) => a.meta.key === body.sourceKey) : ALL_ADAPTERS;

  const results = [];
  for (const adapter of targets) {
    const result = await runScanForSource(adapter.meta.key);
    results.push({ source: adapter.meta.key, ...result });
  }

  return NextResponse.json({ results });
}
