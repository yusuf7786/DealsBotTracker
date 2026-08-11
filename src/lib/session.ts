import 'server-only';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from './auth';

/** Server Components / Route Handlers only — do not import from middleware. */
export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
