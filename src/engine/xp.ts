// XP rules recovered from the Duolingo web client's offline XP calculator
// (chunk 179, module 7432) and its constants module (app chunk, module 97106).
// See docs/REVERSE_ENGINEERING.md §XP for the exact source excerpts.

export const XP = {
  /** `b` — Lesson / LexemePractice / SpacedRepetition / UnitPractice base */
  LESSON: 10,
  /** `S` — AlphabetLesson base */
  ALPHABET_LESSON: 10,
  /** `y` — AlphabetPractice base */
  ALPHABET_PRACTICE: 5,
  /** `L` — GlobalPractice base */
  PRACTICE: 10,
  /** `A` — UnitReview base */
  UNIT_REVIEW: 40,
  /** `O` — Legendary base */
  LEGENDARY: 40,
  /** `D` / `F` — cap on the hearts-left bonus (beginner / everyone else) */
  HEART_BONUS_CAP_BEGINNER: 4,
  HEART_BONUS_CAP: 3,
  /** `M` — XP boost multiplier */
  BOOST_MULTIPLIER: 2,
} as const;

/** `u` = 9e5 ms — the 15-minute XP boost item ("xp_boost_15") */
export const XP_BOOST_MS = 15 * 60 * 1000;

export type SessionKind = 'lesson' | 'practice' | 'unit_review' | 'legendary' | 'alphabet_lesson' | 'alphabet_practice';

export interface XpInput {
  kind: SessionKind;
  /** total challenges graded in the session, including recycled mistakes */
  challengeCount: number;
  maxInLessonStreak: number;
  heartsLeft: number;
  beginner: boolean;
  hasBoost: boolean;
}

/** Hearts bonus `c(e)`: min(max(0, heartsLeft), cap). */
export const heartsBonus = (heartsLeft: number, beginner: boolean): number =>
  Math.min(Math.max(0, heartsLeft), beginner ? XP.HEART_BONUS_CAP_BEGINNER : XP.HEART_BONUS_CAP);

/** Combo bonus `p(e)` / `CT(len, streak)`: ceil(5 * maxStreak / len), 0..5. */
export const comboBonus = (challengeCount: number, maxInLessonStreak: number): number =>
  challengeCount > 0 && maxInLessonStreak > 0 && maxInLessonStreak <= challengeCount
    ? Math.ceil((5 * maxInLessonStreak) / challengeCount)
    : 0;

const BASE: Record<SessionKind, number> = {
  lesson: XP.LESSON,
  practice: XP.PRACTICE,
  unit_review: XP.UNIT_REVIEW,
  legendary: XP.LEGENDARY,
  alphabet_lesson: XP.ALPHABET_LESSON,
  alphabet_practice: XP.ALPHABET_PRACTICE,
};

export interface XpBreakdown {
  base: number;
  heartsBonus: number;
  comboBonus: number;
  multiplier: number;
  total: number;
}

/** `h(e)` — per session-type XP. Practice gets no hearts/combo bonus, like GlobalPractice. */
export const sessionXp = (input: XpInput): XpBreakdown => {
  const base = BASE[input.kind];
  const multiplier = input.hasBoost ? XP.BOOST_MULTIPLIER : 1;
  const bonuses = input.kind !== 'practice';
  const hb = bonuses ? heartsBonus(input.heartsLeft, input.beginner) : 0;
  const cb = bonuses ? comboBonus(input.challengeCount, input.maxInLessonStreak) : 0;
  return { base, heartsBonus: hb, comboBonus: cb, multiplier, total: (base + hb + cb) * multiplier };
};
