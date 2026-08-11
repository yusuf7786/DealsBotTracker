import { logger } from '../utils/logger';
import { formatDealMessage, type DealNotificationPayload } from './types';

/**
 * WhatsApp via Twilio's WhatsApp Business API — a legitimate, permitted
 * integration (not a bypass of WhatsApp's own protections). Disabled unless
 * all four Twilio env vars are set.
 */
export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM &&
      process.env.TWILIO_WHATSAPP_TO
  );
}

export async function sendWhatsAppNotification(payload: DealNotificationPayload): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.TWILIO_WHATSAPP_TO;
  if (!sid || !token || !from || !to) {
    throw new Error('WhatsApp is not configured (TWILIO_* env vars missing)');
  }

  const body = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${to}`,
    Body: formatDealMessage(payload),
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twilio API error ${res.status}: ${errBody}`);
  }

  logger.info('whatsapp notification sent', { dealId: payload.dealId });
}
