import { useCallback, useEffect, useState } from 'react';
import { initialState, refresh, type UserState } from '../engine/progress';

const KEY = 'duorathi2:user';

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

export const useUser = () => {
  const [user, setUser] = useState<UserState>(load);

  useEffect(() => save(user), [user]);

  // hearts regen / day + week rollover while the tab stays open
  useEffect(() => {
    const id = setInterval(() => setUser((u) => refresh(u)), 15_000);
    return () => clearInterval(id);
  }, []);

  const update = useCallback((fn: (u: UserState) => UserState) => setUser((u) => fn(refresh(u))), []);
  const reset = useCallback(() => setUser(initialState()), []);
  return { user, update, reset };
};
