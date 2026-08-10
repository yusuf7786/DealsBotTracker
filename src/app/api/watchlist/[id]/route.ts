import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const item = await prisma.watchlistItem.update({
    where: { id: params.id },
    data: {
      ...(body.enabled !== undefined ? { enabled: Boolean(body.enabled) } : {}),
      ...(body.priceLimit !== undefined ? { priceLimit: body.priceLimit } : {}),
      ...(body.minDiscountPercent !== undefined ? { minDiscountPercent: body.minDiscountPercent } : {}),
      ...(body.minDealScore !== undefined ? { minDealScore: body.minDealScore } : {}),
      ...(body.query !== undefined ? { query: body.query } : {}),
    },
  });
  return NextResponse.json(serialize(item));
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await prisma.watchlistItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
