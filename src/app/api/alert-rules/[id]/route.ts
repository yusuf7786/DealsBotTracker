import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const rule = await prisma.alertRule.update({
    where: { id: params.id },
    data: {
      ...(body.enabled !== undefined ? { enabled: Boolean(body.enabled) } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.conditions !== undefined ? { conditions: body.conditions } : {}),
      ...(body.channels !== undefined ? { channels: body.channels } : {}),
    },
  });
  return NextResponse.json(serialize(rule));
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await prisma.alertRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
