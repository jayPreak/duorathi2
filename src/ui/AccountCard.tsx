import { useEffect, useRef, useState } from 'react';
import { type AccountUser, renderGoogleButton } from './account';
import type { Account } from './store';

interface Props {
  account: Account;
  onSignedIn: (u: AccountUser) => void;
  onSignOut: () => void;
}

export const AccountCard = ({ account, onSignedIn, onSignOut }: Props) => {
  const btn = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account.status !== 'guest' || !btn.current) return;
    void renderGoogleButton(btn.current, onSignedIn, setError).catch((e: Error) => setError(e.message));
  }, [account.status, onSignedIn]);

  if (account.status === 'loading') return <div className="account muted">Checking your account…</div>;

  if (account.status === 'signedIn') {
    const { user } = account;
    return (
      <div className="account account--in">
        {user.picture ? (
          <img className="account__pic" src={user.picture} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="account__pic">🦉</span>
        )}
        <div className="account__who">
          <strong>{user.name}</strong>
          <span className="muted small">{user.email}</span>
          <span className="muted small">{account.syncing ? 'Saving…' : '✓ Progress saved to your account'}</span>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="account">
      <strong>Save your progress</strong>
      <p className="muted small">Sign in with Google to keep your streak, XP and lessons on every device.</p>
      <div ref={btn} className="account__google" />
      {error && <p className="small account__error">{error}</p>}
    </div>
  );
};
