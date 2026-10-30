import { ALL_LEVELS } from '../content/course';
import { addDays, dayKey, daysBetween, weekStart } from './dates';
import { applySessionToQuests, type Quest, questsForDay } from './quests';
import { standings, tierAfterWeek } from './league';
import type { SessionResult } from './session';
import { type SessionKind, sessionXp, type XpBreakdown, XP_BOOST_MS } from './xp';

// All learner state, persisted locally. Pure functions: (state, input, now) → state.

export const MAX_HEARTS = 5;
/** Duolingo's refill cadence is server-driven (nextHeartRefillTimestampMs); we use 30 min. */
export const HEART_REFILL_MS = 30 * 60 * 1000;
export const MAX_FREEZES = 2;
export const DAILY_GOALS = [
  { xp: 10, label: 'Casual' },
  { xp: 20, label: 'Regular' },
  { xp: 30, label: 'Serious' },
  { xp: 50, label: 'Intense' },
] as const;

export const SHOP = {
  heartRefill: { price: 350, label: 'Refill hearts' },
  streakFreeze: { price: 200, label: 'Streak freeze' },
  xpBoost: { price: 100, label: 'XP boost (15 min, 2×)' },
} as const;
export type ShopItem = keyof typeof SHOP;

export type LevelState = 'locked' | 'active' | 'passed' | 'legendary';

export interface DayRecord {
  xp: number;
  extended?: boolean;
  frozen?: boolean;
}

export interface UserState {
  version: 1;
  name: string;
  xpTotal: number;
  gems: number;
  hearts: number;
  nextHeartAt?: number;
  streak: number;
  longestStreak: number;
  /** last day that kept the streak alive (extended or frozen) */
  streakDay?: string;
  freezes: number;
  days: Record<string, DayRecord>;
  dailyGoal: number;
  levels: Record<string, { finished: number; legendary?: boolean }>;
  alphabet: Record<string, number>;
  quests: { day: string; items: Quest[] };
  league: { week: string; tier: number; xp: number; last?: { fromTier: number; toTier: number; rank: number } };
  boostUntil?: number;
  settings: { romanization: boolean; sound: boolean };
}

export const initialState = (now = Date.now()): UserState => {
  const today = dayKey(now);
  return {
    version: 1,
    name: 'You',
    xpTotal: 0,
    gems: 500,
    hearts: MAX_HEARTS,
    streak: 0,
    longestStreak: 0,
    freezes: 0,
    days: {},
    dailyGoal: 20,
    levels: {},
    alphabet: {},
    quests: { day: today, items: questsForDay(today, 20) },
    league: { week: weekStart(today), tier: 0, xp: 0 },
    settings: { romanization: true, sound: true },
  };
};

// ---------------------------------------------------------------- path

export const isLevelPassed = (s: UserState, levelId: string) => {
  const level = ALL_LEVELS.find((l) => l.id === levelId);
  return !!level && (s.levels[levelId]?.finished ?? 0) >= level.totalSessions;
};

export const activeLevelId = (s: UserState): string | undefined =>
  ALL_LEVELS.find((l) => !isLevelPassed(s, l.id))?.id;

export const levelState = (s: UserState, levelId: string): LevelState => {
  if (s.levels[levelId]?.legendary) return 'legendary';
  if (isLevelPassed(s, levelId)) return 'passed';
  return activeLevelId(s) === levelId ? 'active' : 'locked';
};

// ---------------------------------------------------------------- daily upkeep

const regenHearts = (s: UserState, now: number): UserState => {
  if (s.hearts >= MAX_HEARTS) return { ...s, hearts: MAX_HEARTS, nextHeartAt: undefined };
  let { hearts, nextHeartAt } = s;
  nextHeartAt ??= now + HEART_REFILL_MS;
  while (hearts < MAX_HEARTS && now >= nextHeartAt) {
    hearts++;
    nextHeartAt += HEART_REFILL_MS;
  }
  return { ...s, hearts, nextHeartAt: hearts >= MAX_HEARTS ? undefined : nextHeartAt };
};

/** Missed days are covered by equipped freezes (oldest first); otherwise the streak resets. */
const settleStreak = (s: UserState, today: string): UserState => {
  if (!s.streakDay || s.streak === 0) return s;
  const missed = daysBetween(s.streakDay, today) - 1;
  if (missed <= 0) return s;
  if (missed <= s.freezes) {
    const days = { ...s.days };
    for (let i = 1; i <= missed; i++) {
      const d = addDays(s.streakDay, i);
      days[d] = { ...(days[d] ?? { xp: 0 }), frozen: true };
    }
    return { ...s, days, freezes: s.freezes - missed, streakDay: addDays(today, -1) };
  }
  return { ...s, streak: 0 };
};

const rollQuests = (s: UserState, today: string): UserState =>
  s.quests.day === today ? s : { ...s, quests: { day: today, items: questsForDay(today, s.dailyGoal) } };

const rollLeague = (s: UserState, today: string, now: number): UserState => {
  const week = weekStart(today);
  if (s.league.week === week) return s;
  // the old week is over: settle its final standings
  const [y, m, d] = s.league.week.split('-').map(Number);
  const weekEnd = new Date(y, m - 1, d + 7).getTime() - 1;
  const table = standings(s.league.week, s.league.tier, s.name, s.league.xp, Math.min(now, weekEnd));
  const rank = table.findIndex((r) => r.isYou) + 1;
  const toTier = s.league.xp > 0 ? tierAfterWeek(s.league.tier, rank) : s.league.tier;
  return { ...s, league: { week, tier: toTier, xp: 0, last: { fromTier: s.league.tier, toTier, rank } } };
};

export const refresh = (s: UserState, now = Date.now()): UserState => {
  const today = dayKey(now);
  return rollLeague(rollQuests(settleStreak(regenHearts(s, now), today), today), today, now);
};

// ---------------------------------------------------------------- sessions

export type SessionTarget =
  | { kind: 'level'; levelId: string; legendary?: boolean }
  | { kind: 'alphabet'; groupId: string };

export interface SessionOutcome {
  xp: XpBreakdown;
  streakExtended: boolean;
  streak: number;
  levelPassed: boolean;
  becameLegendary: boolean;
  questsCompleted: Quest[];
  dailyGoalReached: boolean;
  heartRefilled: boolean;
}

export const sessionKindFor = (s: UserState, target: SessionTarget): SessionKind => {
  if (target.kind === 'alphabet') return (s.alphabet[target.groupId] ?? 0) > 0 ? 'alphabet_practice' : 'alphabet_lesson';
  if (target.legendary) return 'legendary';
  const level = ALL_LEVELS.find((l) => l.id === target.levelId);
  if (level?.type === 'unit_review') return 'unit_review';
  if (level?.type === 'practice') return 'practice';
  return 'lesson';
};

export const completeSession = (
  prev: UserState,
  target: SessionTarget,
  result: SessionResult,
  heartsType: 'sessionHearts' | 'unlimitedHearts',
  now = Date.now(),
): { state: UserState; outcome?: SessionOutcome } => {
  let s = refresh(prev, now);
  // hearts lost in the session are lost even if the learner quit or failed
  if (heartsType === 'sessionHearts' && target.kind === 'level' && !target.legendary) {
    s = regenHearts({ ...s, hearts: Math.max(0, result.heartsLeft) }, now);
  }
  if (result.failed) return { state: s };

  const kind = sessionKindFor(s, target);
  const beginner = s.xpTotal < 100;
  const xp = sessionXp({
    kind,
    challengeCount: result.challengeCount,
    maxInLessonStreak: result.maxInLessonStreak,
    heartsLeft: result.heartsLeft,
    beginner,
    hasBoost: (s.boostUntil ?? 0) > now,
  });

  const today = dayKey(now);
  const day = s.days[today] ?? { xp: 0 };
  const streakExtended = !day.extended;
  const continuing = s.streakDay === addDays(today, -1) || s.streakDay === today;
  const streak = streakExtended ? (continuing ? s.streak + 1 : 1) : s.streak;
  const dayXp = day.xp + xp.total;

  let levelPassed = false;
  let becameLegendary = false;
  const levels = { ...s.levels };
  const alphabet = { ...s.alphabet };
  let hearts = s.hearts;
  let heartRefilled = false;

  if (target.kind === 'level') {
    const level = ALL_LEVELS.find((l) => l.id === target.levelId);
    const cur = levels[target.levelId] ?? { finished: 0 };
    if (target.legendary) {
      becameLegendary = !cur.legendary;
      levels[target.levelId] = { ...cur, legendary: true };
    } else if (level) {
      const finished = Math.min(level.totalSessions, cur.finished + 1);
      levelPassed = cur.finished < level.totalSessions && finished >= level.totalSessions;
      levels[target.levelId] = { ...cur, finished };
      if (level.type === 'practice' && hearts < MAX_HEARTS) {
        hearts += 1; // "health_refill_method: practice"
        heartRefilled = true;
      }
    }
  } else {
    alphabet[target.groupId] = (alphabet[target.groupId] ?? 0) + 1;
  }

  const before = s.quests.items;
  const items = applySessionToQuests(before, {
    xp: xp.total,
    comboXp: xp.comboBonus * xp.multiplier,
    accuracy: result.accuracy,
    maxInLessonStreak: result.maxInLessonStreak,
    listenCorrect: result.listenCorrect,
    streakExtended,
  });
  const questsCompleted = items.filter((q, i) => q.progress >= q.threshold && before[i].progress < before[i].threshold);

  s = regenHearts(
    {
      ...s,
      xpTotal: s.xpTotal + xp.total,
      hearts,
      streak,
      longestStreak: Math.max(s.longestStreak, streak),
      streakDay: today,
      days: { ...s.days, [today]: { ...day, xp: dayXp, extended: true } },
      levels,
      alphabet,
      quests: { ...s.quests, items },
      league: { ...s.league, xp: s.league.xp + xp.total },
    },
    now,
  );

  return {
    state: s,
    outcome: {
      xp,
      streakExtended,
      streak,
      levelPassed,
      becameLegendary,
      questsCompleted,
      dailyGoalReached: day.xp < s.dailyGoal && dayXp >= s.dailyGoal,
      heartRefilled,
    },
  };
};

// ---------------------------------------------------------------- economy

export const CHEST_GEMS = 20;

export const openChest = (s: UserState, levelId: string): UserState =>
  isLevelPassed(s, levelId) ? s : { ...s, gems: s.gems + CHEST_GEMS, levels: { ...s.levels, [levelId]: { finished: 1 } } };

export const claimQuest = (s: UserState, questId: string): UserState => {
  const q = s.quests.items.find((x) => x.id === questId);
  if (!q || q.claimed || q.progress < q.threshold) return s;
  return {
    ...s,
    gems: s.gems + q.reward,
    quests: { ...s.quests, items: s.quests.items.map((x) => (x.id === questId ? { ...x, claimed: true } : x)) },
  };
};

export const canBuy = (s: UserState, item: ShopItem, now = Date.now()): boolean => {
  if (s.gems < SHOP[item].price) return false;
  if (item === 'heartRefill') return s.hearts < MAX_HEARTS;
  if (item === 'streakFreeze') return s.freezes < MAX_FREEZES;
  return (s.boostUntil ?? 0) <= now;
};

export const buy = (s: UserState, item: ShopItem, now = Date.now()): UserState => {
  if (!canBuy(s, item, now)) return s;
  const paid = { ...s, gems: s.gems - SHOP[item].price };
  if (item === 'heartRefill') return { ...paid, hearts: MAX_HEARTS, nextHeartAt: undefined };
  if (item === 'streakFreeze') return { ...paid, freezes: s.freezes + 1 };
  return { ...paid, boostUntil: now + XP_BOOST_MS };
};

/** last 7 days of XP, oldest first (the client's weekly XP chart, `v()`) */
export const lastSevenDays = (s: UserState, now = Date.now()) => {
  const today = dayKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return { day: d, xp: s.days[d]?.xp ?? 0, extended: !!s.days[d]?.extended, frozen: !!s.days[d]?.frozen };
  });
};

export const todayXp = (s: UserState, now = Date.now()) => s.days[dayKey(now)]?.xp ?? 0;
