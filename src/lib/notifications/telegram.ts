import { logger } from '../utils/logger';
import { formatDealMessage, type DealNotificationPayload } from './types';

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegramNotification(payload: DealNotificationPayload): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('Telegram is not configured (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID missing)');
  }

  const text = formatDealMessage(payload);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }

  logger.info('telegram notification sent', { dealId: payload.dealId });
}
