import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const source = await prisma.source.update({
    where: { id: params.id },
    data: {
      ...(body.enabled !== undefined ? { enabled: Boolean(body.enabled) } : {}),
      ...(body.scanFrequencyMinutes !== undefined ? { scanFrequencyMinutes: Number(body.scanFrequencyMinutes) } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
    },
  });
  return NextResponse.json(serialize(source));
}
