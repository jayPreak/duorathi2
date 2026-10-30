import { get, put } from '@vercel/blob';
import { json, readSession } from './_lib/session.js';

// One private blob per Google account: progress/<google sub>.json

const MAX_BYTES = 256 * 1024;
const path = (sub: string) => `progress/${sub}.json`;

export async function GET(req: Request) {
  const user = await readSession(req);
  if (!user) return json({ user: null, state: null }, { status: 401 });
  const blob = await get(path(user.sub), { access: 'private', useCache: false });
  const state = blob ? JSON.parse(await new Response(blob.stream).text()) : null;
  return json({ user, state });
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
  await put(path(user.sub), text, {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  return json({ ok: true });
}
