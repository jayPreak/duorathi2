import type { UserState } from '../engine/progress';

// Email + password accounts. The server keeps a session cookie; progress lives
// in /api/progress as one JSON document per account.

export interface AccountUser {
  /** the account email */
  sub: string;
  name: string;
}

const postJson = async (url: string, body: unknown) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, body: (await res.json().catch(() => ({}))) as { user?: AccountUser; error?: string } };
};

export const authenticate = async (mode: 'login' | 'signup', email: string, password: string): Promise<AccountUser> => {
  const { ok, body } = await postJson(`/api/auth/${mode}`, { email, password }).catch(() => ({
    ok: false,
    body: { error: 'Could not reach the server' } as { user?: AccountUser; error?: string },
  }));
  if (!ok || !body.user) throw new Error(body.error ?? 'Sign-in failed');
  return body.user;
};

export const signOut = async () => {
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
