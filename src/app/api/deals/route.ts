import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const tier = searchParams.get('tier');
  const condition = searchParams.get('condition');
  const availability = searchParams.get('availability');
  const source = searchParams.get('source');
  const country = searchParams.get('country');
  const minScore = searchParams.get('minScore');
  const minDiscount = searchParams.get('minDiscount');
  const q = searchParams.get('q');
  const sort = searchParams.get('sort') || 'score';
  const status = searchParams.get('status') || 'active';

  const where: Record<string, unknown> = { status };
  if (category) where.category = category;
  if (tier) where.tier = tier;
  if (minScore) where.dealScore = { gte: Number(minScore) };
  if (minDiscount) where.savingsPercent = { gte: Number(minDiscount) };

  const productWhere: Record<string, unknown> = {};
  if (brand) productWhere.brand = brand;
  if (country) productWhere.region = country;
  if (condition) productWhere.condition = condition;
  if (q) {
    productWhere.OR = [
      { productName: { contains: q, mode: 'insensitive' } },
      { brand: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (Object.keys(productWhere).length > 0) where.product = { is: productWhere };

  if (availability || source) {
    where.bestListing = {
      is: {
        ...(availability ? { availability } : {}),
        ...(source ? { source } : {}),
      },
    };
  }

  const orderBy =
    sort === 'savings'
      ? [{ savingsAmount: 'desc' as const }]
      : sort === 'discount'
        ? [{ savingsPercent: 'desc' as const }]
        : sort === 'recent'
          ? [{ createdAt: 'desc' as const }]
          : sort === 'price-asc'
            ? [{ currentPrice: 'asc' as const }]
            : [{ dealScore: 'desc' as const }];

  const deals = await prisma.deal.findMany({
    where,
    include: { product: true, bestListing: true },
    orderBy,
    take: 100,
  });

  return NextResponse.json(serialize(deals));
}
