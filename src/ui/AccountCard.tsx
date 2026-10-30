import { useState } from 'react';
import { type AccountUser, authenticate } from './account';
import type { Account } from './store';

interface Props {
  account: Account;
  onSignedIn: (u: AccountUser) => void;
  onSignOut: () => void;
}

export const AccountCard = ({ account, onSignedIn, onSignOut }: Props) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (account.status === 'loading') return <div className="account muted">Checking your account…</div>;

  if (account.status === 'signedIn') {
    const { user } = account;
    return (
      <div className="account account--in">
        <span className="account__pic">🦉</span>
        <div className="account__who">
          <strong>{user.name}</strong>
          <span className="muted small">{user.sub}</span>
          <span className="muted small">{account.syncing ? 'Saving…' : '✓ Progress saved to your account'}</span>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await authenticate(mode, email, password));
      setPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="account" onSubmit={submit}>
      <strong>{mode === 'login' ? 'Log in to save your progress' : 'Create your profile'}</strong>
      <p className="muted small">Keep your streak, XP and lessons on every device.</p>
      <input
        className="field"
        type="email"
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="field"
        type="password"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        placeholder={mode === 'login' ? 'Password' : 'Password (6+ characters)'}
        minLength={mode === 'signup' ? 6 : undefined}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="small account__error">{error}</p>}
      <button type="submit" className="btn btn--blue" disabled={busy}>
        {busy ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
      </button>
      <button
        type="button"
        className="btn btn--text"
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login');
          setError(null);
        }}
      >
        {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
      </button>
    </form>
  );
};
