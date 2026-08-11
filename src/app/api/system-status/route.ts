import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [
    productCount,
    listingCount,
    activeDealCount,
    notificationsSent,
    sources,
    recentScans,
    dbOk,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.listing.count(),
    prisma.deal.count({ where: { status: 'active' } }),
    prisma.notificationLog.count({ where: { status: 'sent' } }),
    prisma.source.findMany({ orderBy: { name: 'asc' } }),
    prisma.scanRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20, include: { source: true } }),
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
  ]);

  const failedSources = sources.filter((s) => s.status === 'error');
  const recentErrors = recentScans
    .flatMap((r) => (Array.isArray(r.errors) ? (r.errors as string[]).map((e) => ({ scanId: r.id, source: r.source.name, error: e, at: r.startedAt })) : []))
    .slice(0, 25);

  return NextResponse.json(
    serialize({
      database: { status: dbOk ? 'healthy' : 'down' },
      redisConfigured: Boolean(process.env.REDIS_URL),
      productsTracked: productCount,
      pricesTracked: listingCount,
      dealsDetected: activeDealCount,
      notificationsSent,
      sources,
      failedSources,
      recentScans,
      recentErrors,
    })
  );
}
