import { scanQueue } from './queue';
import { ALL_ADAPTERS } from '../src/lib/sources/registry';
import { prisma } from '../src/lib/prisma';
import { logger } from '../src/lib/utils/logger';

/**
 * Registers one BullMQ repeatable job per configured, enabled source. Reads
 * the scan frequency from the Source table (falls back to the adapter's
 * default) so the interval is configurable from Settings/System Status
 * without a restart — repeatable jobs are re-registered on every worker
 * boot and whenever `rescheduleAll()` is called.
 */
export async function rescheduleAll(): Promise<void> {
  const existing = await scanQueue.getRepeatableJobs();
  for (const job of existing) {
    await scanQueue.removeRepeatableByKey(job.key);
  }

  for (const adapter of ALL_ADAPTERS) {
    const source = await prisma.source.upsert({
      where: { key: adapter.meta.key },
      update: {},
      create: {
        key: adapter.meta.key,
        name: adapter.meta.name,
        type: adapter.meta.type,
        priority: adapter.meta.priority,
        scanFrequencyMinutes: adapter.meta.defaultScanFrequencyMinutes,
        reliabilityWeight: adapter.meta.reliabilityWeight,
        requiresApiKey: adapter.meta.requiresApiKey,
        apiKeyConfigured: adapter.isConfigured(),
      },
    });

    if (!source.enabled) continue;

    await scanQueue.add(
      `scan:${adapter.meta.key}`,
      { sourceKey: adapter.meta.key },
      { repeat: { every: source.scanFrequencyMinutes * 60_000 }, jobId: `repeat:${adapter.meta.key}` }
    );
    logger.info('scheduled source', { source: adapter.meta.key, everyMinutes: source.scanFrequencyMinutes });
  }
}
