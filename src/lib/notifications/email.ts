import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { formatDealMessage, type DealNotificationPayload } from './types';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.NOTIFY_EMAIL_TO);
}

export async function sendEmailNotification(payload: DealNotificationPayload): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('Email is not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD/NOTIFY_EMAIL_TO missing)');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  const text = formatDealMessage(payload);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL_TO,
    subject: `🔥 New Deal: ${payload.productName} — ${payload.savingsPercent.toFixed(0)}% below market`,
    text,
    html: text.replace(/\n/g, '<br/>'),
  });

  logger.info('email notification sent', { dealId: payload.dealId });
}
