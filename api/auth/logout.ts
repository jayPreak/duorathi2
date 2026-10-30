import { clearCookie, json } from '../_lib/session.js';

export function POST() {
  return json({ ok: true }, { headers: { 'set-cookie': clearCookie() } });
}
