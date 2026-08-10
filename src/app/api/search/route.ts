import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ deals: [], products: [], sources: [], watchlist: [] });

  const [deals, products, sources, watchlist] = await Promise.all([
    prisma.deal.findMany({
      where: { status: 'active', product: { is: { OR: [{ productName: { contains: q, mode: 'insensitive' } }, { brand: { contains: q, mode: 'insensitive' } }] } } },
      include: { product: true, bestListing: true },
      take: 30,
    }),
    prisma.product.findMany({
      where: { OR: [{ productName: { contains: q, mode: 'insensitive' } }, { brand: { contains: q, mode: 'insensitive' } }, { category: { contains: q, mode: 'insensitive' } }] },
      take: 20,
    }),
    prisma.source.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, take: 10 }),
    prisma.watchlistItem.findMany({ where: { query: { contains: q, mode: 'insensitive' } }, take: 10 }),
  ]);

  return NextResponse.json(serialize({ deals, products, sources, watchlist }));
}
