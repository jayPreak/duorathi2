import { seeded } from './dates';

// Daily quests. Metric names and per-session progress rules mirror the client's
// quest metric evaluator (metrics: XP, LESSONS, NINETY_ACCURACY_LESSONS,
// PERFECT_LESSONS, COMBO_XP, FIVE_CORRECT_IN_A_ROW, TEN_CORRECT_IN_A_ROW,
// LISTEN_CHALLENGES, EXTEND_STREAK, …) and its three daily slots
// (DAILY_QUEST_FIRST / SECOND / THIRD).

export type QuestMetric =
  | 'XP'
  | 'LESSONS'
  | 'NINETY_ACCURACY_LESSONS'
  | 'PERFECT_LESSONS'
  | 'COMBO_XP'
  | 'FIVE_CORRECT_IN_A_ROW'
  | 'TEN_CORRECT_IN_A_ROW'
  | 'LISTEN_CHALLENGES'
  | 'EXTEND_STREAK';

export interface Quest {
  id: string;
  metric: QuestMetric;
  threshold: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface QuestSessionInput {
  xp: number;
  comboXp: number;
  accuracy: number;
  maxInLessonStreak: number;
  listenCorrect: number;
  streakExtended: boolean;
}

const TEMPLATES: { metric: QuestMetric; threshold: number }[] = [
  { metric: 'LESSONS', threshold: 2 },
  { metric: 'NINETY_ACCURACY_LESSONS', threshold: 2 },
  { metric: 'PERFECT_LESSONS', threshold: 1 },
  { metric: 'COMBO_XP', threshold: 10 },
  { metric: 'FIVE_CORRECT_IN_A_ROW', threshold: 2 },
  { metric: 'TEN_CORRECT_IN_A_ROW', threshold: 1 },
  { metric: 'LISTEN_CHALLENGES', threshold: 5 },
];

export const questLabel = (q: Pick<Quest, 'metric' | 'threshold'>): string => {
  const n = q.threshold;
  switch (q.metric) {
    case 'XP':
      return `Earn ${n} XP`;
    case 'LESSONS':
      return `Complete ${n} lessons`;
    case 'NINETY_ACCURACY_LESSONS':
      return `Score 90% or higher in ${n} lessons`;
    case 'PERFECT_LESSONS':
      return n === 1 ? 'Complete a lesson with no mistakes' : `Complete ${n} perfect lessons`;
    case 'COMBO_XP':
      return `Earn ${n} combo bonus XP`;
    case 'FIVE_CORRECT_IN_A_ROW':
      return `Get 5 in a row in ${n} lessons`;
    case 'TEN_CORRECT_IN_A_ROW':
      return `Get 10 in a row in ${n} lesson${n > 1 ? 's' : ''}`;
    case 'LISTEN_CHALLENGES':
      return `Correctly answer ${n} listening challenges`;
    case 'EXTEND_STREAK':
      return 'Extend your streak';
  }
};

/** three quests for a day: XP (scaled to the daily goal) + two seeded picks */
export const questsForDay = (day: string, dailyGoal: number): Quest[] => {
  const rng = seeded(`quests:${day}`);
  const pool = [...TEMPLATES];
  const picks = [0, 1].map(() => pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return [{ metric: 'XP' as QuestMetric, threshold: Math.max(10, dailyGoal) }, ...picks].map((t, i) => ({
    id: `${day}:${i}`,
    metric: t.metric,
    threshold: t.threshold,
    progress: 0,
    reward: [10, 15, 20][i],
    claimed: false,
  }));
};

/** quantity a finished session contributes to `metric` (undefined → none) */
export const metricDelta = (metric: QuestMetric, s: QuestSessionInput): number => {
  switch (metric) {
    case 'XP':
      return s.xp;
    case 'LESSONS':
      return 1;
    case 'NINETY_ACCURACY_LESSONS':
      return s.accuracy >= 90 ? 1 : 0;
    case 'PERFECT_LESSONS':
      return s.accuracy >= 100 ? 1 : 0;
    case 'COMBO_XP':
      return s.comboXp;
    case 'FIVE_CORRECT_IN_A_ROW':
      return s.maxInLessonStreak >= 5 ? 1 : 0;
    case 'TEN_CORRECT_IN_A_ROW':
      return s.maxInLessonStreak >= 10 ? 1 : 0;
    case 'LISTEN_CHALLENGES':
      return s.listenCorrect;
    case 'EXTEND_STREAK':
      return s.streakExtended ? 1 : 0;
  }
};

export const applySessionToQuests = (quests: Quest[], s: QuestSessionInput): Quest[] =>
  quests.map((q) => ({ ...q, progress: Math.min(q.threshold, q.progress + metricDelta(q.metric, s)) }));
