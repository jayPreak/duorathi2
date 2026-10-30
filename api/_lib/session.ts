import { jwtVerify, SignJWT } from 'jose';

// Email + password accounts. A successful sign-in/up issues a 30-day
// HttpOnly session cookie (HS256 JWT signed with AUTH_SECRET).

const COOKIE = 'duorathi_session';
const MAX_AGE_S = 30 * 24 * 60 * 60;

export interface SessionUser {
  /** normalized email, also the storage key */
  sub: string;
  name: string;
}

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s);
};

export const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...init.headers },
  });

export const sessionCookie = async (user: SessionUser) => {
  const token = await new SignJWT({ name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(secret());
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_S}`;
};

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export const readSession = async (req: Request): Promise<SessionUser | null> => {
  const raw = req.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret());
    return { sub: String(payload.sub), name: String(payload.name) };
  } catch {
    return null;
  }
};
