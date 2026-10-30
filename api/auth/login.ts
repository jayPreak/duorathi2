import { checkPassword, normalizeEmail } from '../_lib/accounts.js';
import { json, sessionCookie } from '../_lib/session.js';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  if (typeof body?.email !== 'string' || typeof body.password !== 'string') {
    return json({ error: 'Email and password are required' }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  const account = await checkPassword(email, body.password);
  if (!account) return json({ error: 'Wrong email or password' }, { status: 401 });
  const user = { sub: email, name: account.name };
  return json({ user }, { headers: { 'set-cookie': await sessionCookie(user) } });
}
