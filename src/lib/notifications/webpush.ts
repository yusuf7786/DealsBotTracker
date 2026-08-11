import webpush from 'web-push';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import { formatDealMessage, type DealNotificationPayload } from './types';

export function isWebPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export async function sendWebPushNotification(payload: DealNotificationPayload): Promise<void> {
  if (!isWebPushConfigured()) {
    throw new Error('Web push is not configured (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY missing)');
  }
  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) {
    throw new Error('No push subscriptions registered yet — open the app and enable push notifications');
  }

  const body = JSON.stringify({
    title: `🔥 New Deal: ${payload.productName}`,
    body: formatDealMessage(payload),
    url: payload.url,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      )
    )
  );

  const failures = results.filter((r) => r.status === 'rejected');
  // Clean up subscriptions that are no longer valid (410 Gone / 404).
  await Promise.all(
    results.map((r, i) => {
      if (r.status === 'rejected') {
        const reason = r.reason as { statusCode?: number };
        if (reason?.statusCode === 410 || reason?.statusCode === 404) {
          return prisma.pushSubscription.delete({ where: { id: subscriptions[i].id } }).catch(() => undefined);
        }
      }
      return undefined;
    })
  );

  if (failures.length === subscriptions.length) {
    throw new Error('All web push deliveries failed');
  }

  logger.info('webpush notification sent', { dealId: payload.dealId, delivered: subscriptions.length - failures.length });
}
