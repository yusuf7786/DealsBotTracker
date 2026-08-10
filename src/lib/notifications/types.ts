export interface DealNotificationPayload {
  dealId: string;
  productName: string;
  currentPrice: number;
  marketPrice: number;
  savingsAmount: number;
  savingsPercent: number;
  dealScore: number;
  sellerName: string;
  reason: string;
  currency: string;
  url: string; // deep link into the app
}

export type NotificationChannel = 'email' | 'telegram' | 'webpush' | 'whatsapp';

export interface ChannelSendResult {
  channel: NotificationChannel;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

export function formatDealMessage(payload: DealNotificationPayload): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: payload.currency, maximumFractionDigits: 0 }).format(n);

  return [
    '🔥 NEW DEAL FOUND',
    '',
    payload.productName,
    '',
    `Current Price: ${fmt(payload.currentPrice)}`,
    `Market Price: ${fmt(payload.marketPrice)}`,
    `Below Market: ${payload.savingsPercent.toFixed(1)}%`,
    `Deal Score: ${payload.dealScore}/100`,
    `Seller: ${payload.sellerName}`,
    '',
    `Why it's a deal: ${payload.reason}`,
    '',
    `View Deal: ${payload.url}`,
  ].join('\n');
}
