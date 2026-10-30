import { json } from './_lib/session.js';

/** public runtime config, so the Google client ID can change without a rebuild */
export function GET() {
  return json({ googleClientId: process.env.GOOGLE_CLIENT_ID ?? null });
}
