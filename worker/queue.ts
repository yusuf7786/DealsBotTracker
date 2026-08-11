import 'dotenv/config';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const url = new URL(redisUrl);

export const connection: ConnectionOptions = {
  host: url.hostname,
  port: Number(url.port || 6379),
  password: url.password || undefined,
  maxRetriesPerRequest: null,
};

export const SCAN_QUEUE_NAME = 'dealbot-scan';

export const scanQueue = new Queue(SCAN_QUEUE_NAME, { connection });

export function createScanWorker(processor: (sourceKey: string) => Promise<unknown>) {
  return new Worker(
    SCAN_QUEUE_NAME,
    async (job) => {
      const { sourceKey } = job.data as { sourceKey: string };
      return processor(sourceKey);
    },
    { connection, concurrency: 2 }
  );
}
