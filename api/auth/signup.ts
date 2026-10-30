import { accountExists, createAccount, EMAIL_RE, MIN_PASSWORD, normalizeEmail } from '../_lib/accounts.js';
import { json, sessionCookie } from '../_lib/session.js';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  if (typeof body?.email !== 'string' || typeof body.password !== 'string') {
    return json({ error: 'Email and password are required' }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  if (!EMAIL_RE.test(email)) return json({ error: 'Enter a valid email' }, { status: 400 });
  if (body.password.length < MIN_PASSWORD) {
    return json({ error: `Password must be at least ${MIN_PASSWORD} characters` }, { status: 400 });
  }
  if (await accountExists(email)) return json({ error: 'An account with that email already exists' }, { status: 409 });
  const name = email.split('@')[0];
  try {
    await createAccount(email, name, body.password);
  } catch {
    return json({ error: 'An account with that email already exists' }, { status: 409 });
  }
  const user = { sub: email, name };
  return json({ user }, { headers: { 'set-cookie': await sessionCookie(user) } });
}
