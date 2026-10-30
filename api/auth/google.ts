import { json, sessionCookie, verifyGoogleCredential } from '../_lib/session.js';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { credential?: unknown } | null;
  if (typeof body?.credential !== 'string') return json({ error: 'missing credential' }, { status: 400 });
  try {
    const user = await verifyGoogleCredential(body.credential);
    return json({ user }, { headers: { 'set-cookie': await sessionCookie(user) } });
  } catch (err) {
    return json({ error: (err as Error).message }, { status: 401 });
  }
}
