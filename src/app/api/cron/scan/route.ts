import { NextResponse } from 'next/server';
import { ALL_ADAPTERS } from '@/lib/sources/registry';
import { runScanForSource } from '@/lib/pipeline/scanSource';

/**
 * Cron-triggered scan endpoint — for deployments (e.g. Vercel free tier)
 * that have no always-on worker process to run the BullMQ scheduler. An
 * external scheduler (GitHub Actions, cron-job.org, Vercel Cron on a paid
 * plan, etc.) calls this on an interval instead. Runs the exact same
 * pipeline as the worker and the in-app "Scan now" button.
 *
 * Not session-protected (middleware allow-lists this path) since a cron
 * job can't hold a login cookie — instead it requires a bearer token
 * matching CRON_SECRET. Refuses to run if CRON_SECRET isn't configured, so
 * this endpoint is never accidentally left open.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured on the server' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = [];
  for (const adapter of ALL_ADAPTERS) {
    const result = await runScanForSource(adapter.meta.key);
    results.push({ source: adapter.meta.key, ...result });
  }

  return NextResponse.json({ results });
}
