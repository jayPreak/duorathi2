import { useCallback, useEffect, useRef, useState } from 'react';
import { initialState, refresh, type UserState } from '../engine/progress';
import { type AccountUser, fetchProgress, saveProgress, signOut as gisSignOut } from './account';

const KEY = 'duorathi2:user';
const SAVE_DEBOUNCE_MS = 1500;

const load = (): UserState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserState;
      if (parsed.version === 1) return refresh(parsed);
    }
  } catch {
    // storage unavailable or corrupt → start fresh
  }
  return initialState();
};

const save = (s: UserState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore (private mode etc.)
  }
};

export type Account = { status: 'loading' } | { status: 'guest' } | { status: 'signedIn'; user: AccountUser; syncing: boolean };

/** first sign-in on an account with no saved progress adopts the guest progress; otherwise the account wins */
const adopt = (server: UserState | null, local: UserState, user: AccountUser): { state: UserState; upload: boolean } =>
  server?.version === 1
    ? { state: refresh(server), upload: false }
    : { state: { ...local, name: local.name === 'You' ? user.name.split(' ')[0] : local.name }, upload: true };

export const useUser = () => {
  const [user, setUser] = useState<UserState>(load);
  const [account, setAccount] = useState<Account>({ status: 'loading' });
  const latest = useRef(user);
  latest.current = user;
  const signedIn = account.status === 'signedIn';

  useEffect(() => save(user), [user]);

  // hearts regen / day + week rollover while the tab stays open
  useEffect(() => {
    const id = setInterval(() => setUser((u) => refresh(u)), 15_000);
    return () => clearInterval(id);
  }, []);

  const connect = useCallback(async (known?: AccountUser) => {
    const { user: me, state } = await fetchProgress();
    const who = me ?? known;
    if (!who || !me) return setAccount({ status: 'guest' });
    const { state: next, upload } = adopt(state, latest.current, who);
    setUser(next);
    setAccount({ status: 'signedIn', user: who, syncing: false });
    if (upload) await saveProgress(next);
  }, []);

  useEffect(() => {
    void connect();
  }, [connect]);

  // debounced save to the account on every change
  useEffect(() => {
    if (!signedIn) return;
    setAccount((a) => (a.status === 'signedIn' ? { ...a, syncing: true } : a));
    const id = setTimeout(async () => {
      await saveProgress(user);
      setAccount((a) => (a.status === 'signedIn' ? { ...a, syncing: false } : a));
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [user, signedIn]);

  // flush when the tab is hidden/closed so the last lesson isn't lost
  useEffect(() => {
    if (!signedIn) return;
    const flush = () => document.visibilityState === 'hidden' && void saveProgress(latest.current, true);
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [signedIn]);

  const update = useCallback((fn: (u: UserState) => UserState) => setUser((u) => fn(refresh(u))), []);
  const reset = useCallback(() => setUser(initialState()), []);

  const signOut = useCallback(async () => {
    await saveProgress(latest.current);
    await gisSignOut();
    // don't leave this account's progress behind for the next person on the device
    setUser(initialState());
    setAccount({ status: 'guest' });
  }, []);

  return { user, update, reset, account, onSignedIn: connect, signOut };
};
