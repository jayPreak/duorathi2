import { describe, expect, it } from 'vitest';
import { ALL_UNITS } from '../content/course';
import { generateSkillSession, isAnswerAccepted } from './challenges';
import { dayKey } from './dates';
import { buy, completeSession, initialState, levelState, MAX_HEARTS, refresh } from './progress';
import { createSession, sessionReducer, summarize, type SessionState } from './session';
import { comboBonus, heartsBonus, sessionXp } from './xp';

const DAY = 86_400_000;
const T0 = new Date(2026, 9, 26, 10).getTime(); // a Monday

describe('xp (constants from the client bundle)', () => {
  it('combo bonus = ceil(5 * maxStreak / len)', () => {
    expect(comboBonus(10, 10)).toBe(5);
    expect(comboBonus(12, 5)).toBe(3);
    expect(comboBonus(10, 0)).toBe(0);
    expect(comboBonus(5, 9)).toBe(0);
  });
  it('hearts bonus capped at 4 for beginners, 3 otherwise', () => {
    expect(heartsBonus(5, true)).toBe(4);
    expect(heartsBonus(5, false)).toBe(3);
    expect(heartsBonus(-1, false)).toBe(0);
  });
  it('lesson xp = (10 + hearts + combo) × boost', () => {
    expect(sessionXp({ kind: 'lesson', challengeCount: 10, maxInLessonStreak: 10, heartsLeft: 5, beginner: false, hasBoost: false }).total).toBe(18);
    expect(sessionXp({ kind: 'lesson', challengeCount: 10, maxInLessonStreak: 10, heartsLeft: 5, beginner: false, hasBoost: true }).total).toBe(36);
    expect(sessionXp({ kind: 'practice', challengeCount: 10, maxInLessonStreak: 10, heartsLeft: 5, beginner: false, hasBoost: false }).total).toBe(10);
  });
});

const run = (s: SessionState, answers: boolean[]) => {
  for (const correct of answers) {
    s = sessionReducer(s, { type: 'GRADE', correct });
    s = sessionReducer(s, { type: 'ADVANCE' });
  }
  return s;
};

describe('session reducer', () => {
  const challenges = generateSkillSession({
    skills: ALL_UNITS[0].skills.slice(0, 1),
    sessionIndex: 0,
    totalSessions: 3,
    mode: 'learn',
    unitLexemes: ALL_UNITS[0].skills.flatMap((s) => s.lexemes),
  });

  it('generates a full session', () => {
    expect(challenges.length).toBe(10);
    expect(challenges[0].type).toBe('match');
  });

  it('recycles mistakes to the end and ends only when all are fixed', () => {
    let s = createSession(challenges, { heartsLeft: 5, heartsType: 'sessionHearts' });
    s = run(s, [false, ...Array(9).fill(true)]);
    expect(s.status).toBe('guessing');
    expect(s.challenges.length).toBe(11);
    expect(s.coach).toBe('mistakes_review');
    s = run(s, [true]);
    expect(s.status).toBe('ended');
    const r = summarize(s);
    expect(r.failed).toBe(false);
    expect(r.accuracy).toBe(90);
    expect(r.heartsLeft).toBe(4);
    expect(r.challengeCount).toBe(11);
  });

  it('fails when hearts run out', () => {
    let s = createSession(challenges, { heartsLeft: 2, heartsType: 'sessionHearts' });
    s = run(s, [false, false]);
    expect(s.status).toBe('ended');
    expect(s.failed).toBe(true);
  });
});

describe('progress', () => {
  const perfect = { failed: false, endedEarly: false, accuracy: 100, challengeCount: 10, maxInLessonStreak: 10, heartsLeft: 5, listenCorrect: 0, durationMs: 60_000 };
  const firstLevel = ALL_UNITS[0].levels[0].id;

  it('passes a level after its sessions and unlocks the next', () => {
    let s = initialState(T0);
    expect(levelState(s, firstLevel)).toBe('active');
    for (let i = 0; i < 3; i++) s = completeSession(s, { kind: 'level', levelId: firstLevel }, perfect, 'sessionHearts', T0).state;
    expect(levelState(s, firstLevel)).toBe('passed');
    expect(levelState(s, ALL_UNITS[0].levels[1].id)).toBe('active');
  });

  it('extends streak once per day and resets after a missed day', () => {
    let s = initialState(T0);
    const r1 = completeSession(s, { kind: 'level', levelId: firstLevel }, perfect, 'sessionHearts', T0);
    expect(r1.outcome?.streakExtended).toBe(true);
    s = r1.state;
    const r2 = completeSession(s, { kind: 'level', levelId: firstLevel }, perfect, 'sessionHearts', T0 + 1000);
    expect(r2.outcome?.streakExtended).toBe(false);
    s = completeSession(r2.state, { kind: 'level', levelId: firstLevel }, perfect, 'sessionHearts', T0 + DAY).state;
    expect(s.streak).toBe(2);
    s = refresh(s, T0 + 3 * DAY);
    expect(s.streak).toBe(0);
  });

  it('streak freeze covers a missed day', () => {
    let s = { ...initialState(T0), gems: 1000 };
    s = buy(s, 'streakFreeze', T0);
    s = completeSession(s, { kind: 'level', levelId: firstLevel }, perfect, 'sessionHearts', T0).state;
    s = refresh(s, T0 + 2 * DAY);
    expect(s.streak).toBe(1);
    expect(s.freezes).toBe(0);
    expect(s.days[dayKey(T0 + DAY)].frozen).toBe(true);
  });

  it('hearts lost in a session persist and regenerate', () => {
    let s = initialState(T0);
    s = completeSession(s, { kind: 'level', levelId: firstLevel }, { ...perfect, failed: true, heartsLeft: 0 }, 'sessionHearts', T0).state;
    expect(s.hearts).toBe(0);
    s = refresh(s, T0 + 31 * 60 * 1000);
    expect(s.hearts).toBe(1);
    s = refresh(s, T0 + 10 * 60 * 60 * 1000);
    expect(s.hearts).toBe(MAX_HEARTS);
  });
});

describe('grading', () => {
  it('normalizes punctuation and case', () => {
    expect(isAnswerAccepted("I'm fine.", ["i'm fine"])).toBe(true);
    expect(isAnswerAccepted('Yes, thank you!', ['yes thank you'])).toBe(true);
  });
});
