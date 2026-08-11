import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';

const schema = z.object({
  name: z.string().min(1),
  conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) })),
  channels: z.array(z.string()),
});

export async function GET() {
  const rules = await prisma.alertRule.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(serialize(rules));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const rule = await prisma.alertRule.create({ data: parsed.data });
  return NextResponse.json(serialize(rule), { status: 201 });
}
