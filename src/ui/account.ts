import type { UserState } from '../engine/progress';

// Google sign-in (Google Identity Services) + server-side progress per account.
// The server verifies Google's ID token and keeps a session cookie; progress
// lives in /api/progress as one JSON document per Google account.

export interface AccountUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

interface GoogleId {
  initialize(cfg: { client_id: string; callback: (r: { credential: string }) => void; auto_select?: boolean }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
  disableAutoSelect(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let gisLoading: Promise<GoogleId> | undefined;
const loadGis = () =>
  (gisLoading ??= new Promise<GoogleId>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in unavailable')));
    s.onerror = () => reject(new Error('Could not load Google sign-in'));
    document.head.appendChild(s);
  }));

let clientIdPromise: Promise<string | null> | undefined;
export const googleClientId = () =>
  (clientIdPromise ??= fetch('/api/config')
    .then((r) => (r.ok ? r.json() : { googleClientId: null }))
    .then((c: { googleClientId: string | null }) => c.googleClientId)
    .catch(() => null));

/** Render the "Continue with Google" button into `el`; resolves with the signed-in user. */
export const renderGoogleButton = async (el: HTMLElement, onSignedIn: (u: AccountUser) => void, onError: (m: string) => void) => {
  const clientId = await googleClientId();
  if (!clientId) return onError('Google sign-in is not configured yet.');
  const gis = await loadGis();
  gis.initialize({
    client_id: clientId,
    callback: async ({ credential }) => {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const body = (await res.json().catch(() => ({}))) as { user?: AccountUser; error?: string };
      if (res.ok && body.user) onSignedIn(body.user);
      else onError(body.error ?? 'Sign-in failed');
    },
  });
  el.innerHTML = '';
  gis.renderButton(el, { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with', width: 280 });
};

export const signOut = async () => {
  window.google?.accounts.id.disableAutoSelect();
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
};

/** null user → not signed in (or the API is unreachable, e.g. plain `vite` dev) */
export const fetchProgress = async (): Promise<{ user: AccountUser | null; state: UserState | null }> => {
  try {
    const res = await fetch('/api/progress', { cache: 'no-store' });
    if (!res.ok) return { user: null, state: null };
    return (await res.json()) as { user: AccountUser; state: UserState | null };
  } catch {
    return { user: null, state: null };
  }
};

export const saveProgress = (state: UserState, keepalive = false) =>
  fetch('/api/progress', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state),
    keepalive,
  }).then((r) => r.ok);
