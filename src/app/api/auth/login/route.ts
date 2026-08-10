import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  let user = await prisma.user.findUnique({ where: { email } });

  // First-run bootstrap: if no user exists yet for this email and the
  // submitted credentials match ADMIN_EMAIL/ADMIN_PASSWORD from .env, create
  // the account automatically so there's nothing to configure by hand.
  if (!user) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(password) } });
    }
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = await createSessionToken(user.id, user.email);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
