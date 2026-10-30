import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { ALPHABET, findCharacterGroup } from '../content/alphabet';
import { findLevel, findUnitForLevel } from '../content/course';
import { type Challenge, generateAlphabetSession, generateSkillSession } from '../engine/challenges';
import type { SessionOutcome, SessionTarget, UserState } from '../engine/progress';
import { questLabel } from '../engine/quests';
import {
  type CoachMessage,
  createSession,
  type HeartsType,
  progress,
  type SessionResult,
  sessionReducer,
  summarize,
} from '../engine/session';
import { ChallengeView, challengeTitle, meaningText, solutionText } from './Challenges';
import { blip } from './speech';

const LEGENDARY_LIVES = 3;

export const buildChallenges = (user: UserState, target: SessionTarget): Challenge[] => {
  if (target.kind === 'alphabet') {
    const group = findCharacterGroup(target.groupId);
    return group ? generateAlphabetSession(group.characters, ALPHABET.flatMap((g) => g.characters)) : [];
  }
  const level = findLevel(target.levelId);
  const unit = findUnitForLevel(target.levelId);
  if (!level || !unit) return [];
  const unitLexemes = unit.skills.flatMap((s) => s.lexemes);
  const skill = unit.skills.find((s) => s.id === level.skillId);
  if (target.legendary) {
    return generateSkillSession({
      skills: skill ? [skill] : unit.skills,
      sessionIndex: 0,
      totalSessions: 1,
      mode: 'legendary',
      unitLexemes,
      length: 12,
    });
  }
  if (level.type === 'skill' && skill) {
    return generateSkillSession({
      skills: [skill],
      sessionIndex: (user.levels[level.id]?.finished ?? 0) % level.totalSessions,
      totalSessions: level.totalSessions,
      mode: 'learn',
      unitLexemes,
    });
  }
  return generateSkillSession({
    skills: unit.skills,
    sessionIndex: 0,
    totalSessions: 1,
    mode: 'review',
    unitLexemes,
    length: level.type === 'unit_review' ? 14 : 10,
  });
};

export const heartsSetup = (user: UserState, target: SessionTarget): { heartsType: HeartsType; hearts: number } => {
  if (target.kind === 'alphabet') return { heartsType: 'unlimitedHearts', hearts: 0 };
  if (target.legendary) return { heartsType: 'sessionHearts', hearts: LEGENDARY_LIVES };
  if (findLevel(target.levelId)?.type === 'practice') return { heartsType: 'unlimitedHearts', hearts: 0 };
  return { heartsType: 'sessionHearts', hearts: user.hearts };
};

const COACH: Record<CoachMessage, (n: number) => string> = {
  small_right_streak: () => 'Nice! 3 in a row 🔥',
  big_right_streak: (n) => `${n} in a row! You're on fire 🔥`,
  wrong_streak: () => "Don't worry, mistakes help you learn 💪",
  mid_point: () => "Halfway there! Keep going 🚀",
  mistakes_review: () => "Let's fix those mistakes 🔁",
};

interface Props {
  user: UserState;
  target: SessionTarget;
  onComplete: (result: SessionResult, heartsType: HeartsType) => SessionOutcome | undefined;
  onExit: () => void;
}

export const Session = ({ user, target, onComplete, onExit }: Props) => {
  const setup = useMemo(() => heartsSetup(user, target), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [state, dispatch] = useReducer(
    sessionReducer,
    undefined,
    () => createSession(buildChallenges(user, target), { heartsLeft: setup.hearts, heartsType: setup.heartsType }),
  );
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [finished, setFinished] = useState<{ result: SessionResult; outcome?: SessionOutcome } | null>(null);

  const challenge = state.challenges[state.currentIndex];
  const { romanization, sound } = user.settings;
  if (import.meta.env.DEV) (window as unknown as { __duorathiSession?: unknown }).__duorathiSession = { challenge, status: state.status };

  const grade = useCallback(
    (correct: boolean) => {
      if (sound) blip(correct ? 'correct' : 'wrong');
      dispatch({ type: 'GRADE', correct });
    },
    [sound],
  );

  const check = useCallback(() => {
    if (state.status === 'guessing' && answer !== null) grade(answer);
    else if (state.status === 'correct' || state.status === 'blaming') {
      setAnswer(null);
      dispatch({ type: 'ADVANCE' });
    }
  }, [answer, grade, state.status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [check]);

  // persist exactly once when the session ends
  useEffect(() => {
    if (state.status !== 'ended' || finished) return;
    const result = summarize(state);
    const outcome = onComplete(result, setup.heartsType);
    if (!result.failed && sound) blip('done');
    setFinished({ result, outcome });
  }, [state, finished, onComplete, setup.heartsType, sound]);

  if (finished) {
    return finished.result.failed && !finished.result.endedEarly ? (
      <OutOfHearts legendary={target.kind === 'level' && !!target.legendary} onExit={onExit} />
    ) : finished.result.endedEarly ? null : (
      <SessionEnd result={finished.result} outcome={finished.outcome} onExit={onExit} />
    );
  }
  if (!challenge) return null;

  const pct = Math.round(progress(state) * 100);
  const graded = state.status === 'correct' || state.status === 'blaming';
  const coach = state.coach && (state.status === 'correct' || state.status === 'blaming' || state.coach === 'mistakes_review');
  const legendary = target.kind === 'level' && !!target.legendary;

  return (
    <div className={`session ${legendary ? 'session--legendary' : ''}`}>
      <header className="session__top">
        <button type="button" className="icon-btn" aria-label="Quit" onClick={() => setConfirmQuit(true)}>
          ✕
        </button>
        <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="bar__fill" style={{ width: `${Math.max(pct, 3)}%` }} />
          {state.currentCorrectStreak >= 3 && <span className="bar__combo">{state.currentCorrectStreak} IN A ROW</span>}
        </div>
        <div className="session__hearts">
          {setup.heartsType === 'unlimitedHearts' ? '❤️ ∞' : `${legendary ? '💜' : '❤️'} ${state.heartsLeft}`}
        </div>
      </header>

      <main className="session__body" key={challenge.id}>
        {state.recycledFrom[state.currentIndex] !== undefined && <div className="tag tag--mistake">🔁 Previous mistake</div>}
        <h1 className="session__title">{challengeTitle(challenge)}</h1>
        {coach && state.coach && <div className="coach">🦉 {COACH[state.coach](state.currentCorrectStreak)}</div>}
        <ChallengeView
          challenge={challenge}
          locked={state.status !== 'guessing'}
          romanization={romanization}
          sound={sound}
          onChange={setAnswer}
          onSubmit={(correct) => {
            grade(correct);
            setAnswer(null);
          }}
        />
      </main>

      <footer className={`session__foot ${state.status === 'correct' ? 'foot--correct' : ''} ${state.status === 'blaming' ? 'foot--wrong' : ''}`}>
        <div className="foot__inner">
          {graded && (
            <div className="foot__msg">
              <strong>{state.status === 'correct' ? 'Excellent! ✓' : 'Correct solution:'}</strong>
              {state.status === 'blaming' && <span className="foot__sol">{solutionText(challenge)}</span>}
              {meaningText(challenge) && <span className="foot__meaning">{meaningText(challenge)}</span>}
            </div>
          )}
          {!graded && challenge.type !== 'match' && (
            <button type="button" className="btn btn--ghost foot__skip" onClick={() => grade(false)}>
              Skip
            </button>
          )}
          {(graded || challenge.type !== 'match') && (
            <button
              type="button"
              className={`btn ${state.status === 'blaming' ? 'btn--red' : 'btn--green'}`}
              disabled={!graded && answer === null}
              onClick={check}
            >
              {graded ? 'Continue' : 'Check'}
            </button>
          )}
        </div>
      </footer>

      {confirmQuit && (
        <div className="sheet-backdrop" onClick={() => setConfirmQuit(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__emoji">🥺</div>
            <h2>Wait, don't go! You'll lose your progress if you quit now</h2>
            <button type="button" className="btn btn--blue" onClick={() => setConfirmQuit(false)}>
              Keep learning
            </button>
            <button
              type="button"
              className="btn btn--text btn--danger"
              onClick={() => {
                // persist hearts already lost, then leave
                onComplete(summarize(sessionReducer(state, { type: 'QUIT' })), setup.heartsType);
                onExit();
              }}
            >
              End session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const fmtTime = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const SessionEnd = ({ result, outcome, onExit }: { result: SessionResult; outcome?: SessionOutcome; onExit: () => void }) => {
  // slide order follows the client's sessionEndMessage ordering:
  // sessionComplete → dailyQuestComplete → streakExtended
  const slides = useMemo(() => {
    const out: ('complete' | 'quests' | 'streak')[] = ['complete'];
    if (outcome?.questsCompleted.length) out.push('quests');
    if (outcome?.streakExtended) out.push('streak');
    return out;
  }, [outcome]);
  const [i, setI] = useState(0);
  const slide = slides[i];
  const next = () => (i + 1 < slides.length ? setI(i + 1) : onExit());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Enter' && next();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="end">
      <div className="end__body">
        {slide === 'complete' && outcome && (
          <>
            <div className="end__hero">{outcome.becameLegendary ? '👑' : result.accuracy === 100 ? '🏆' : '🎉'}</div>
            <h1 className="end__title">
              {outcome.becameLegendary ? 'Legendary!' : result.accuracy === 100 ? 'Perfect lesson!' : 'Lesson complete!'}
            </h1>
            <div className="stat-cards">
              <div className="stat-card stat-card--xp">
                <div className="stat-card__label">Total XP</div>
                <div className="stat-card__value">⚡ {outcome.xp.total}</div>
              </div>
              <div className="stat-card stat-card--acc">
                <div className="stat-card__label">{result.accuracy === 100 ? 'Amazing' : 'Accuracy'}</div>
                <div className="stat-card__value">🎯 {result.accuracy}%</div>
              </div>
              <div className="stat-card stat-card--time">
                <div className="stat-card__label">Time</div>
                <div className="stat-card__value">⏱ {fmtTime(result.durationMs)}</div>
              </div>
            </div>
            <ul className="xp-breakdown">
              <li>
                Lesson <span>+{outcome.xp.base}</span>
              </li>
              {outcome.xp.heartsBonus > 0 && (
                <li>
                  Hearts bonus <span>+{outcome.xp.heartsBonus}</span>
                </li>
              )}
              {outcome.xp.comboBonus > 0 && (
                <li>
                  Combo bonus ({result.maxInLessonStreak} in a row) <span>+{outcome.xp.comboBonus}</span>
                </li>
              )}
              {outcome.xp.multiplier > 1 && (
                <li>
                  XP boost <span>×{outcome.xp.multiplier}</span>
                </li>
              )}
              {outcome.heartRefilled && (
                <li>
                  Practice refill <span>+1 ❤️</span>
                </li>
              )}
            </ul>
          </>
        )}
        {slide === 'quests' && outcome && (
          <>
            <div className="end__hero">🎁</div>
            <h1 className="end__title">Daily quest complete!</h1>
            {outcome.questsCompleted.map((q) => (
              <div className="quest quest--done" key={q.id}>
                <span>{questLabel(q)}</span>
                <span className="quest__reward">💎 {q.reward}</span>
              </div>
            ))}
            <p className="muted">Claim your rewards on the Quests tab.</p>
          </>
        )}
        {slide === 'streak' && outcome && (
          <>
            <div className="end__hero end__hero--flame">🔥</div>
            <div className="end__streak">{outcome.streak}</div>
            <h1 className="end__title">day streak!</h1>
            <p className="muted">
              {outcome.streak === 1 ? 'You started a streak. Come back tomorrow to keep it going!' : 'Practice each day so your streak won’t reset.'}
            </p>
            {outcome.dailyGoalReached && <div className="tag tag--goal">🎯 Daily goal reached</div>}
          </>
        )}
      </div>
      <div className="end__foot">
        <button type="button" className="btn btn--green" onClick={next}>
          Continue
        </button>
      </div>
    </div>
  );
};

const OutOfHearts = ({ legendary, onExit }: { legendary: boolean; onExit: () => void }) => (
  <div className="end">
    <div className="end__body">
      <div className="end__hero">{legendary ? '💜' : '💔'}</div>
      <h1 className="end__title">{legendary ? 'Legendary attempt failed' : 'You ran out of hearts!'}</h1>
      <p className="muted">
        {legendary
          ? 'Legendary allows only 3 mistakes. Try again when you feel ready.'
          : 'Practice a passed level’s Practice node to earn hearts, wait for them to refill, or buy a refill in the shop.'}
      </p>
    </div>
    <div className="end__foot">
      <button type="button" className="btn btn--blue" onClick={onExit}>
        Back to learn
      </button>
    </div>
  </div>
);
