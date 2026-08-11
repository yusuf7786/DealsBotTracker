import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';

const createSchema = z.object({
  type: z.enum(['product', 'brand', 'category', 'keyword']),
  query: z.string().min(1),
  priceLimit: z.number().positive().nullable().optional(),
  minDiscountPercent: z.number().min(0).max(100).nullable().optional(),
  minDealScore: z.number().min(0).max(100).nullable().optional(),
});

export async function GET() {
  const items = await prisma.watchlistItem.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(serialize(items));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const item = await prisma.watchlistItem.create({
    data: {
      type: parsed.data.type,
      query: parsed.data.query,
      priceLimit: parsed.data.priceLimit ?? null,
      minDiscountPercent: parsed.data.minDiscountPercent ?? null,
      minDealScore: parsed.data.minDealScore ?? null,
    },
  });
  return NextResponse.json(serialize(item), { status: 201 });
}
