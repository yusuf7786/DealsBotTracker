import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dispatchDealNotification } from '@/lib/notifications/dispatcher';

/**
 * Sends a real test notification through every configured channel, using
 * the most recent active deal as the payload (or a synthetic one if there
 * are no deals yet). Lets the user verify notification setup from Settings
 * without waiting for a real scan.
 */
export async function POST() {
  const deal = await prisma.deal.findFirst({ where: { status: 'active' }, orderBy: { createdAt: 'desc' } });

  if (!deal) {
    return NextResponse.json(
      { error: 'No deals exist yet to send a test notification for. Trigger a scan first (Settings → Sources → Scan now).' },
      { status: 400 }
    );
  }

  const result = await dispatchDealNotification(deal.id);
  return NextResponse.json(result);
}
