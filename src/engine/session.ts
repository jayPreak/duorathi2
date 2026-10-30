import { type Challenge, LISTEN_TYPES, recycle } from './challenges';

// Session player state machine, modelled on the Duolingo web client's session
// reducer (actions START_SESSION / UPDATE_GRADED_CHALLENGE / ADVANCE_SESSION /
// END_SESSION / QUIT_SESSION; status Guessing → Grading → Blaming|Correct →
// Sliding). Wrong answers are recycled to the end of the queue
// (`recycledMistakeIndexToOriginalMistakeIndex`) and must be fixed before the
// session can end. The coach messages mirror the checkpoint enum
// (small_right_streak, big_right_streak, wrong_streak, mid_point, mistakes_review).

export type HeartsType = 'sessionHearts' | 'unlimitedHearts';
export type Status = 'guessing' | 'correct' | 'blaming' | 'ended';
export type CoachMessage = 'small_right_streak' | 'big_right_streak' | 'wrong_streak' | 'mid_point' | 'mistakes_review';

export interface SessionState {
  challenges: Challenge[];
  /** recycled index → original index */
  recycledFrom: Record<number, number>;
  /** original challenge indices that have been answered correctly */
  solved: number[];
  originalCount: number;
  currentIndex: number;
  status: Status;
  heartsType: HeartsType;
  heartsLeft: number;
  currentCorrectStreak: number;
  currentIncorrectStreak: number;
  maxInLessonStreak: number;
  numChallengesAnswered: number;
  numChallengesCorrect: number;
  numListenCorrect: number;
  coach?: CoachMessage;
  startTime: number;
  endTime?: number;
  failed: boolean;
  endedEarly: boolean;
}

export type SessionAction =
  | { type: 'GRADE'; correct: boolean }
  | { type: 'ADVANCE' }
  | { type: 'QUIT' };

export const createSession = (
  challenges: Challenge[],
  opts: { heartsLeft: number; heartsType: HeartsType; now?: number },
): SessionState => ({
  challenges,
  recycledFrom: {},
  solved: [],
  originalCount: challenges.length,
  currentIndex: 0,
  status: 'guessing',
  heartsType: opts.heartsType,
  heartsLeft: opts.heartsLeft,
  currentCorrectStreak: 0,
  currentIncorrectStreak: 0,
  maxInLessonStreak: 0,
  numChallengesAnswered: 0,
  numChallengesCorrect: 0,
  numListenCorrect: 0,
  startTime: opts.now ?? Date.now(),
  failed: false,
  endedEarly: false,
});

export const originalIndex = (s: SessionState, i = s.currentIndex) => s.recycledFrom[i] ?? i;

/** progress bar fill, 0..1 — only correct answers move it, like Duolingo's "strength" bar */
export const progress = (s: SessionState) => s.solved.length / Math.max(1, s.originalCount);

const coachAfterCorrect = (streak: number, s: SessionState): CoachMessage | undefined => {
  if (streak === 3) return 'small_right_streak';
  if (streak > 0 && streak % 5 === 0) return 'big_right_streak';
  if (s.solved.length === Math.ceil(s.originalCount / 2)) return 'mid_point';
  return undefined;
};

export const sessionReducer = (s: SessionState, a: SessionAction): SessionState => {
  switch (a.type) {
    case 'GRADE': {
      if (s.status !== 'guessing') return s;
      const current = s.challenges[s.currentIndex];
      const answered = s.numChallengesAnswered + 1;
      if (a.correct) {
        const streak = s.currentCorrectStreak + 1;
        const orig = originalIndex(s);
        const next: SessionState = {
          ...s,
          status: 'correct',
          numChallengesAnswered: answered,
          numChallengesCorrect: s.numChallengesCorrect + 1,
          numListenCorrect: s.numListenCorrect + (LISTEN_TYPES.includes(current.type) ? 1 : 0),
          currentCorrectStreak: streak,
          currentIncorrectStreak: 0,
          maxInLessonStreak: Math.max(s.maxInLessonStreak, streak),
          solved: s.solved.includes(orig) ? s.solved : [...s.solved, orig],
        };
        return { ...next, coach: coachAfterCorrect(streak, next) };
      }
      const heartsLeft = s.heartsType === 'sessionHearts' ? s.heartsLeft - 1 : s.heartsLeft;
      const incorrect = s.currentIncorrectStreak + 1;
      const recycledIndex = s.challenges.length;
      return {
        ...s,
        status: 'blaming',
        numChallengesAnswered: answered,
        currentCorrectStreak: 0,
        currentIncorrectStreak: incorrect,
        heartsLeft,
        challenges: [...s.challenges, recycle(current)],
        recycledFrom: { ...s.recycledFrom, [recycledIndex]: originalIndex(s) },
        coach: incorrect >= 2 ? 'wrong_streak' : undefined,
      };
    }
    case 'ADVANCE': {
      if (s.status === 'guessing' || s.status === 'ended') return s;
      const outOfHearts = s.heartsType === 'sessionHearts' && s.heartsLeft <= 0;
      const now = Date.now();
      if (outOfHearts) return { ...s, status: 'ended', failed: true, endTime: now };
      const nextIndex = s.currentIndex + 1;
      if (nextIndex >= s.challenges.length) return { ...s, status: 'ended', endTime: now };
      const enteringMistakes = nextIndex === s.originalCount && s.challenges.length > s.originalCount;
      return {
        ...s,
        currentIndex: nextIndex,
        status: 'guessing',
        coach: enteringMistakes ? 'mistakes_review' : undefined,
      };
    }
    case 'QUIT':
      return { ...s, status: 'ended', endedEarly: true, failed: true, endTime: Date.now() };
  }
};

export interface SessionResult {
  failed: boolean;
  endedEarly: boolean;
  /** first-try accuracy percent over original challenges */
  accuracy: number;
  challengeCount: number;
  maxInLessonStreak: number;
  heartsLeft: number;
  listenCorrect: number;
  durationMs: number;
}

export const summarize = (s: SessionState): SessionResult => {
  const mistakes = Object.keys(s.recycledFrom).length;
  const firstTryCorrect = Math.max(0, s.originalCount - new Set(Object.values(s.recycledFrom)).size);
  return {
    failed: s.failed,
    endedEarly: s.endedEarly,
    accuracy: Math.round((100 * firstTryCorrect) / Math.max(1, s.originalCount)),
    challengeCount: s.originalCount + mistakes,
    maxInLessonStreak: s.maxInLessonStreak,
    heartsLeft: s.heartsLeft,
    listenCorrect: s.numListenCorrect,
    durationMs: (s.endTime ?? Date.now()) - s.startTime,
  };
};
