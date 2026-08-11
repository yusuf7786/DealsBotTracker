import { SignJWT, jwtVerify } from 'jose';

// Edge-safe (used by middleware): no bcrypt here — see password.ts for hashing.

const SESSION_COOKIE = 'dealbot_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET is not set (or too short). Set a random 32+ character string in your .env file.'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { userId: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
