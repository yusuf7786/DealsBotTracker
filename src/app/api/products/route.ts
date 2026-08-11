import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const brand = searchParams.get('brand');

  const products = await prisma.product.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(brand ? { brand } : {}),
    },
    orderBy: { lastCheckedAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(serialize(products));
}
