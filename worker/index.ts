import 'dotenv/config';
import { createScanWorker, scanQueue } from './queue';
import { rescheduleAll } from './scheduler';
import { runScanForSource } from '../src/lib/pipeline/scanSource';
import { logger } from '../src/lib/utils/logger';

async function main() {
  logger.info('dealbot worker starting');

  await rescheduleAll();

  const worker = createScanWorker(async (sourceKey: string) => {
    logger.info('scan started', { source: sourceKey });
    const result = await runScanForSource(sourceKey);
    logger.info('scan finished', { source: sourceKey, ...result });
    return result;
  });

  worker.on('failed', (job, err) => {
    logger.error('scan job failed', { jobId: job?.id, error: err.message });
  });

  // Re-sync the schedule periodically in case Settings/Source frequencies
  // changed via the app (cheap: reads from Postgres, not the network).
  setInterval(() => {
    rescheduleAll().catch((err) => logger.error('reschedule failed', { error: String(err) }));
  }, 5 * 60_000);

  const shutdown = async () => {
    logger.info('dealbot worker shutting down');
    await worker.close();
    await scanQueue.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('dealbot worker ready');
}

main().catch((err) => {
  logger.error('worker fatal error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
