import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';

// Google Identity Services hands the browser a signed ID token; we verify it
// against Google's JWKS, then issue our own 30-day session cookie.

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const COOKIE = 'duorathi_session';
const MAX_AGE_S = 30 * 24 * 60 * 60;

export interface SessionUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
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

export const verifyGoogleCredential = async (credential: string): Promise<SessionUser> => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');
  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });
  if (!payload.sub || typeof payload.email !== 'string' || payload.email_verified !== true) {
    throw new Error('Google account email is not verified');
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: typeof payload.name === 'string' ? payload.name : payload.email.split('@')[0],
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
  };
};

export const sessionCookie = async (user: SessionUser) => {
  const token = await new SignJWT({ ...user })
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
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    };
  } catch {
    return null;
  }
};
