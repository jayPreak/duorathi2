import { ALPHABET } from '../content/alphabet';
import { ALL_LEVELS } from '../content/course';
import { dayKey } from '../engine/dates';
import { COHORT_SIZE, DEMOTE, PROMOTE, standings, TIERS } from '../engine/league';
import {
  buy,
  canBuy,
  claimQuest,
  DAILY_GOALS,
  HEART_REFILL_MS,
  isLevelPassed,
  lastSevenDays,
  MAX_FREEZES,
  MAX_HEARTS,
  SHOP,
  type SessionTarget,
  type ShopItem,
  todayXp,
  type UserState,
} from '../engine/progress';
import { questLabel } from '../engine/quests';
import { speak } from './speech';

type Update = (fn: (u: UserState) => UserState) => void;

export const Characters = ({ user, onStart }: { user: UserState; onStart: (t: SessionTarget) => void }) => (
  <div className="page">
    <h1 className="page__title">Let's learn Devanagari!</h1>
    <p className="muted center">Get to know the Marathi script — देवनागरी</p>
    {ALPHABET.map((g) => {
      const done = user.alphabet[g.id] ?? 0;
      return (
        <section key={g.id} className="chars">
          <div className="chars__head">
            <h2>{g.title}</h2>
            <button type="button" className="btn btn--green btn--sm" onClick={() => onStart({ kind: 'alphabet', groupId: g.id })}>
              {done ? `Practice +5 XP` : `Learn +10 XP`}
            </button>
          </div>
          <div className="chars__grid">
            {g.characters.map((c) => (
              <button type="button" key={c.ch} className="char" onClick={() => speak(c.example ? `${c.ch}. ${c.example.mr}` : c.ch)}>
                <span className="char__ch">{c.ch}</span>
                <span className="char__tr">{c.tr}</span>
                <span className="char__bar">
                  <span style={{ width: `${Math.min(100, done * 34)}%` }} />
                </span>
              </button>
            ))}
          </div>
        </section>
      );
    })}
  </div>
);

export const Quests = ({ user, update }: { user: UserState; update: Update }) => {
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const hoursLeft = Math.ceil((midnight.getTime() - Date.now()) / 3_600_000);
  return (
    <div className="page">
      <div className="hero-card hero-card--quests">
        <div>
          <h1>Daily Quests</h1>
          <p>Complete quests to earn gems 💎</p>
        </div>
        <div className="hero-card__emoji">🎯</div>
      </div>
      <div className="row-between">
        <h2>Today</h2>
        <span className="muted">⏳ {hoursLeft} hours left</span>
      </div>
      {user.quests.items.map((q) => {
        const done = q.progress >= q.threshold;
        return (
          <div key={q.id} className={`quest ${done ? 'quest--done' : ''}`}>
            <div className="quest__main">
              <div className="quest__label">{questLabel(q)}</div>
              <div className="quest__bar">
                <span style={{ width: `${(100 * q.progress) / q.threshold}%` }} />
                <em>
                  {q.progress} / {q.threshold}
                </em>
              </div>
            </div>
            {done && !q.claimed ? (
              <button type="button" className="btn btn--gold btn--sm" onClick={() => update((u) => claimQuest(u, q.id))}>
                Claim 💎{q.reward}
              </button>
            ) : (
              <span className="quest__reward">{q.claimed ? '✅' : `🎁 ${q.reward}`}</span>
            )}
          </div>
        );
      })}
      <h2>Daily goal</h2>
      <div className="goal-grid">
        {DAILY_GOALS.map((g) => (
          <button
            type="button"
            key={g.xp}
            className={`goal ${user.dailyGoal === g.xp ? 'goal--on' : ''}`}
            onClick={() => update((u) => ({ ...u, dailyGoal: g.xp }))}
          >
            <strong>{g.label}</strong>
            <span>{g.xp} XP / day</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const Leagues = ({ user }: { user: UserState }) => {
  const tier = TIERS[user.league.tier];
  const table = standings(user.league.week, user.league.tier, user.name, user.league.xp);
  const [y, m, d] = user.league.week.split('-').map(Number);
  const daysLeft = Math.max(0, Math.ceil((new Date(y, m - 1, d + 7).getTime() - Date.now()) / 86_400_000));
  const last = user.league.last;
  return (
    <div className="page">
      <div className="tiers">
        {TIERS.map((t, i) => (
          <span
            key={t.name}
            className={`tier ${i === user.league.tier ? 'tier--on' : ''} ${i > user.league.tier ? 'tier--locked' : ''}`}
            style={{ background: i <= user.league.tier ? t.color : undefined }}
            title={t.name}
          >
            🛡️
          </span>
        ))}
      </div>
      <h1 className="page__title">{tier.name} League</h1>
      <p className="muted center">
        Top {PROMOTE} advance to the next league · {daysLeft} day{daysLeft === 1 ? '' : 's'} left
      </p>
      {last && (
        <div className="tag tag--goal center-block">
          Last week: #{last.rank} in {TIERS[last.fromTier].name}
          {last.toTier > last.fromTier ? ' — promoted! 🎉' : last.toTier < last.fromTier ? ' — demoted' : ''}
        </div>
      )}
      <ol className="board">
        {table.map((r, i) => {
          const rank = i + 1;
          const zone = rank <= PROMOTE ? 'up' : rank > COHORT_SIZE - DEMOTE && user.league.tier > 0 ? 'down' : '';
          return (
            <li key={`${r.name}-${i}`} className={`board__row ${r.isYou ? 'board__row--you' : ''} board__row--${zone}`}>
              <span className="board__rank">{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}</span>
              <span className="board__avatar">{r.emoji}</span>
              <span className="board__name">{r.isYou && r.name !== 'You' ? `${r.name} (you)` : r.name}</span>
              <span className="board__xp">{r.xp} XP</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export const Shop = ({ user, update }: { user: UserState; update: Update }) => {
  const now = Date.now();
  const items: { id: ShopItem; emoji: string; desc: string }[] = [
    {
      id: 'heartRefill',
      emoji: '❤️',
      desc: user.hearts >= MAX_HEARTS ? 'You have full hearts' : `Get full hearts so you can worry less about making mistakes`,
    },
    { id: 'streakFreeze', emoji: '🧊', desc: `Protects your streak for one missed day · ${user.freezes}/${MAX_FREEZES} equipped` },
    {
      id: 'xpBoost',
      emoji: '⚡',
      desc: (user.boostUntil ?? 0) > now ? `Active · ${Math.ceil(((user.boostUntil ?? 0) - now) / 60000)} min left` : 'Earn double XP for 15 minutes',
    },
  ];
  return (
    <div className="page">
      <h1 className="page__title">Shop</h1>
      <p className="muted center">You have 💎 {user.gems} gems</p>
      {items.map((it) => (
        <div key={it.id} className="shop-item">
          <span className="shop-item__emoji">{it.emoji}</span>
          <div className="shop-item__main">
            <strong>{SHOP[it.id].label}</strong>
            <span className="muted">{it.desc}</span>
          </div>
          <button type="button" className="btn btn--blue btn--sm" disabled={!canBuy(user, it.id, now)} onClick={() => update((u) => buy(u, it.id))}>
            💎 {SHOP[it.id].price}
          </button>
        </div>
      ))}
    </div>
  );
};

export const Profile = ({ user, update, reset }: { user: UserState; update: Update; reset: () => void }) => {
  const week = lastSevenDays(user);
  const max = Math.max(user.dailyGoal, ...week.map((d) => d.xp));
  const passed = ALL_LEVELS.filter((l) => isLevelPassed(user, l.id)).length;
  const legendary = Object.values(user.levels).filter((l) => l.legendary).length;
  const today = dayKey();
  return (
    <div className="page">
      <div className="profile-head">
        <div className="profile-head__avatar">🦉</div>
        <input
          className="profile-head__name"
          value={user.name}
          maxLength={20}
          onChange={(e) => update((u) => ({ ...u, name: e.target.value || 'You' }))}
          aria-label="Display name"
        />
      </div>
      <h2>Statistics</h2>
      <div className="stats-grid">
        <div className="stat">🔥 <strong>{user.streak}</strong><span>Day streak</span></div>
        <div className="stat">⚡ <strong>{user.xpTotal}</strong><span>Total XP</span></div>
        <div className="stat">🛡️ <strong>{TIERS[user.league.tier].name}</strong><span>Current league</span></div>
        <div className="stat">🏅 <strong>{user.longestStreak}</strong><span>Longest streak</span></div>
        <div className="stat">✅ <strong>{passed}/{ALL_LEVELS.length}</strong><span>Levels passed</span></div>
        <div className="stat">👑 <strong>{legendary}</strong><span>Legendary</span></div>
      </div>
      <h2>Last 7 days</h2>
      <div className="week-chart">
        {week.map((d) => (
          <div key={d.day} className={`week-chart__col ${d.day === today ? 'week-chart__col--today' : ''}`}>
            <span className="week-chart__xp">{d.xp || ''}</span>
            <span className="week-chart__bar" style={{ height: `${(100 * d.xp) / max}%` }} />
            <span className="week-chart__day">
              {d.frozen ? '🧊' : d.extended ? '🔥' : ''}
              {new Date(`${d.day}T12:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
          </div>
        ))}
      </div>
      <p className="muted">Today: {todayXp(user)} / {user.dailyGoal} XP</p>
      <h2>Settings</h2>
      <label className="toggle">
        <span>Show romanization (transliteration)</span>
        <input type="checkbox" checked={user.settings.romanization} onChange={(e) => update((u) => ({ ...u, settings: { ...u.settings, romanization: e.target.checked } }))} />
      </label>
      <label className="toggle">
        <span>Sound effects & auto-play audio</span>
        <input type="checkbox" checked={user.settings.sound} onChange={(e) => update((u) => ({ ...u, settings: { ...u.settings, sound: e.target.checked } }))} />
      </label>
      <p className="muted small">Hearts refill 1 every {HEART_REFILL_MS / 60000} min. Progress is saved on this device.</p>
      <button
        type="button"
        className="btn btn--text btn--danger"
        onClick={() => {
          if (confirm('Reset all progress? This cannot be undone.')) reset();
        }}
      >
        Reset progress
      </button>
    </div>
  );
};
