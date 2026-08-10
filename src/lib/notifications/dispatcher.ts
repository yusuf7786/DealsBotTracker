import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import { getSettings } from '../settings';
import type { DealNotificationPayload, NotificationChannel } from './types';
import { isEmailConfigured, sendEmailNotification } from './email';
import { isTelegramConfigured, sendTelegramNotification } from './telegram';
import { isWebPushConfigured, sendWebPushNotification } from './webpush';
import { isWhatsAppConfigured, sendWhatsAppNotification } from './whatsapp';

const SENDERS: Record<NotificationChannel, (p: DealNotificationPayload) => Promise<void>> = {
  email: sendEmailNotification,
  telegram: sendTelegramNotification,
  webpush: sendWebPushNotification,
  whatsapp: sendWhatsAppNotification,
};

const CONFIGURED: Record<NotificationChannel, () => boolean> = {
  email: isEmailConfigured,
  telegram: isTelegramConfigured,
  webpush: isWebPushConfigured,
  whatsapp: isWhatsAppConfigured,
};

/**
 * DEAL DEDUPLICATION FOR NOTIFICATIONS (spec section 15/16)
 *
 * Never re-notify for a deal that hasn't meaningfully changed. "Meaningful"
 * means: never notified before, OR price dropped by >= 2% since the last
 * notification, OR it's been more than 24h and the deal is still active.
 */
export function shouldNotify(
  lastNotifiedAt: Date | null,
  lastNotifiedPrice: number | null,
  currentPrice: number
): boolean {
  if (!lastNotifiedAt || lastNotifiedPrice === null) return true;
  const priceDropped = currentPrice <= lastNotifiedPrice * 0.98;
  const hoursSince = (Date.now() - lastNotifiedAt.getTime()) / 36e5;
  return priceDropped || hoursSince >= 24;
}

export async function dispatchDealNotification(dealId: string): Promise<{ sent: number; skipped: number; failed: number }> {
  const settings = await getSettings();
  const enabledChannels = (Object.keys(SENDERS) as NotificationChannel[]).filter(
    (c) => settings.notificationChannels[c] && CONFIGURED[c]()
  );

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { product: true, bestListing: true },
  });
  if (!deal) return { sent: 0, skipped: 0, failed: 0 };

  const currentPrice = Number(deal.currentPrice);
  if (!shouldNotify(deal.lastNotifiedAt, deal.lastNotifiedPrice ? Number(deal.lastNotifiedPrice) : null, currentPrice)) {
    return { sent: 0, skipped: enabledChannels.length, failed: 0 };
  }

  const payload: DealNotificationPayload = {
    dealId: deal.id,
    productName: `${deal.product.brand} ${deal.product.productName}${deal.product.storage ? ' ' + deal.product.storage : ''}`,
    currentPrice,
    marketPrice: Number(deal.marketPrice),
    savingsAmount: Number(deal.savingsAmount),
    savingsPercent: deal.savingsPercent,
    dealScore: deal.dealScore,
    sellerName: deal.bestListing.seller,
    reason: Array.isArray(deal.reasons) ? (deal.reasons as string[])[0] ?? 'Below market price' : 'Below market price',
    currency: deal.product.currency,
    url: `${process.env.APP_URL ?? 'http://localhost:3000'}/deals/${deal.id}`,
  };

  let sent = 0;
  let failed = 0;

  for (const channel of enabledChannels) {
    try {
      await SENDERS[channel](payload);
      sent++;
      await prisma.notificationLog.create({
        data: { dealId: deal.id, channel, status: 'sent', message: payload.productName },
      });
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      logger.error('notification failed', { channel, dealId: deal.id, error: message });
      await prisma.notificationLog.create({
        data: { dealId: deal.id, channel, status: 'failed', error: message },
      });
    }
  }

  if (sent > 0) {
    await prisma.deal.update({
      where: { id: deal.id },
      data: { lastNotifiedAt: new Date(), lastNotifiedPrice: currentPrice },
    });
  }

  return { sent, skipped: 0, failed };
}
