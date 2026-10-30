import { readJsonBlob, writeJsonBlob } from './_lib/accounts.js';
import { json, readSession } from './_lib/session.js';

// One private blob per account: progress/<email>.json

const MAX_BYTES = 256 * 1024;
const path = (sub: string) => `progress/${sub}.json`;

export async function GET(req: Request) {
  const user = await readSession(req);
  if (!user) return json({ user: null, state: null }, { status: 401 });
  return json({ user, state: await readJsonBlob(path(user.sub)) });
}

export async function PUT(req: Request) {
  const user = await readSession(req);
  if (!user) return json({ error: 'not signed in' }, { status: 401 });
  const text = await req.text();
  if (text.length > MAX_BYTES) return json({ error: 'progress too large' }, { status: 413 });
  let state: { version?: unknown };
  try {
    state = JSON.parse(text);
  } catch {
    return json({ error: 'invalid json' }, { status: 400 });
  }
  if (state?.version !== 1) return json({ error: 'unsupported progress version' }, { status: 400 });
  await writeJsonBlob(path(user.sub), text, true);
  return json({ ok: true });
}
