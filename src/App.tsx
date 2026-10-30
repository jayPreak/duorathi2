import { useCallback, useEffect, useState } from 'react';
import { completeSession, MAX_HEARTS, openChest, type SessionTarget, todayXp } from './engine/progress';
import { TIERS } from './engine/league';
import { AccountCard } from './ui/AccountCard';
import { Path } from './ui/Path';
import { Session } from './ui/Session';
import { useUser } from './ui/store';
import { Characters, Leagues, Profile, Quests, Shop } from './ui/Tabs';

const TABS = [
  { id: 'learn', label: 'Learn', icon: '🏠' },
  { id: 'characters', label: 'Letters', icon: 'अ' },
  { id: 'leagues', label: 'Leagues', icon: '🛡️' },
  { id: 'quests', label: 'Quests', icon: '🎯' },
  { id: 'shop', label: 'Shop', icon: '🛍️' },
  { id: 'profile', label: 'Profile', icon: '🦉' },
] as const;
type Tab = (typeof TABS)[number]['id'];

const readTab = (): Tab => {
  const h = location.hash.replace('#/', '') as Tab;
  return TABS.some((t) => t.id === h) ? h : 'learn';
};

const fmtCountdown = (ms: number) => {
  const m = Math.max(0, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

export const App = () => {
  const { user, update, reset, account, onSignedIn, signOut } = useUser();
  const [tab, setTab] = useState<Tab>(readTab);
  const [session, setSession] = useState<{ target: SessionTarget; key: number } | null>(null);
  const [heartsOpen, setHeartsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // the path scrolls itself to the active level; every other tab starts at the top
  useEffect(() => {
    if (tab !== 'learn') window.scrollTo(0, 0);
  }, [tab]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const start = useCallback((target: SessionTarget) => setSession({ target, key: Date.now() }), []);

  if (session) {
    return (
      <Session
        key={session.key}
        user={user}
        target={session.target}
        onComplete={(result, heartsType) => {
          // compute synchronously so the end screen can show the outcome
          const { state, outcome } = completeSession(user, session.target, result, heartsType);
          update(() => state);
          return outcome;
        }}
        onExit={() => setSession(null)}
      />
    );
  }

  const goal = todayXp(user);
  const goalPct = Math.min(100, (100 * goal) / user.dailyGoal);

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav__brand">
          duorathi<span>मराठी</span>
        </div>
        {TABS.map((t) => (
          <a key={t.id} href={`#/${t.id}`} className={`nav__item ${tab === t.id ? 'nav__item--on' : ''}`}>
            <span className="nav__icon">{t.icon}</span>
            <span className="nav__label">{t.label}</span>
          </a>
        ))}
      </nav>

      <div className="main">
        <header className="topbar" onClick={() => setHeartsOpen(false)}>
          <span className="topbar__flag" title="Marathi">
            🇮🇳<small>MR</small>
          </span>
          <span className={`topbar__stat ${user.streak ? 'on-fire' : 'muted'}`} title="Day streak">
            🔥 {user.streak}
            {user.freezes > 0 && <small>🧊{user.freezes}</small>}
          </span>
          <span className="topbar__stat gems" title="Gems">
            💎 {user.gems}
          </span>
          <button
            type="button"
            className="topbar__stat hearts"
            onClick={(e) => {
              e.stopPropagation();
              setHeartsOpen((o) => !o);
            }}
          >
            ❤️ {user.hearts}
          </button>
          {heartsOpen && (
            <div className="hearts-pop" onClick={(e) => e.stopPropagation()}>
              <strong>Hearts</strong>
              <div className="hearts-pop__row">
                {Array.from({ length: MAX_HEARTS }, (_, i) => (
                  <span key={i} className={i < user.hearts ? '' : 'dim'}>
                    ❤️
                  </span>
                ))}
              </div>
              <p className="muted">
                {user.hearts >= MAX_HEARTS
                  ? 'You have full hearts'
                  : `Next heart in ${fmtCountdown((user.nextHeartAt ?? Date.now()) - Date.now())}`}
              </p>
              <a href="#/shop" className="btn btn--blue btn--sm" onClick={() => setHeartsOpen(false)}>
                Refill in shop
              </a>
            </div>
          )}
        </header>

        {tab === 'learn' && (
          <>
            <div className="goal-strip">
              <span>🎯 Daily goal</span>
              <span className="goal-strip__bar">
                <span style={{ width: `${goalPct}%` }} />
              </span>
              <span className="goal-strip__num">
                {goal}/{user.dailyGoal} XP
              </span>
              <span className="goal-strip__league" style={{ color: TIERS[user.league.tier].color }}>
                🛡️ {TIERS[user.league.tier].name}
              </span>
            </div>
            {account.status === 'guest' && user.xpTotal > 0 && (
              <a href="#/profile" className="save-banner">
                💾 Sign in with Google to save your progress
              </a>
            )}
            <Path
              user={user}
              onStart={start}
              onOpenChest={(id) => {
                update((u) => openChest(u, id));
                setToast('🎁 +20 gems!');
              }}
            />
          </>
        )}
        {tab === 'characters' && <Characters user={user} onStart={start} />}
        {tab === 'quests' && <Quests user={user} update={update} />}
        {tab === 'leagues' && <Leagues user={user} />}
        {tab === 'shop' && <Shop user={user} update={update} />}
        {tab === 'profile' && (
          <Profile
            user={user}
            update={update}
            reset={reset}
            account={<AccountCard account={account} onSignedIn={onSignedIn} onSignOut={signOut} />}
          />
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
