import { useEffect, useRef, useState } from 'react';
import { COURSE } from '../content/course';
import type { Level, Unit } from '../content/types';
import { activeLevelId, levelState, type LevelState, type SessionTarget, type UserState } from '../engine/progress';
import { speak } from './speech';

const ICON: Record<Level['type'], string> = { skill: '★', chest: '🎁', practice: '🏋️', unit_review: '🏆' };

/** zig-zag offset like the Duolingo path (sinusoidal lateral shift) */
const offset = (i: number) => Math.round(Math.sin((i * Math.PI) / 3) * 70);

interface Props {
  user: UserState;
  onStart: (t: SessionTarget) => void;
  onOpenChest: (levelId: string) => void;
}

export const Path = ({ user, onStart, onOpenChest }: Props) => {
  const [popover, setPopover] = useState<string | null>(null);
  const [guide, setGuide] = useState<Unit | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const active = activeLevelId(user);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
  }, []);

  return (
    <div className="path" onClick={() => setPopover(null)}>
      {COURSE.map((section) => (
        <section key={section.id}>
          <h2 className="section-title">{section.title}</h2>
          {section.units.map((unit, ui) => (
            <div key={unit.id} className="unit">
              <div className="unit__banner" style={{ background: unit.color }}>
                <div>
                  <div className="unit__eyebrow">
                    UNIT {COURSE.flatMap((s) => s.units).indexOf(unit) + 1}
                  </div>
                  <div className="unit__title">{unit.description}</div>
                </div>
                <button
                  type="button"
                  className="unit__guide"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGuide(unit);
                  }}
                >
                  📖<span>Guidebook</span>
                </button>
              </div>
              <div className="unit__levels">
                {unit.levels.map((level, li) => {
                  const st = levelState(user, level.id);
                  const finished = user.levels[level.id]?.finished ?? 0;
                  const isActive = level.id === active;
                  return (
                    <div
                      key={level.id}
                      className="level-wrap"
                      style={{ transform: `translateX(${offset(li + ui)}px)` }}
                      ref={isActive ? activeRef : undefined}
                    >
                      {isActive && <div className="start-bubble">START</div>}
                      <LevelNode
                        level={level}
                        state={st}
                        color={unit.color}
                        progress={finished / level.totalSessions}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (st === 'locked') return setPopover(level.id);
                          if (level.type === 'chest') return st === 'active' ? onOpenChest(level.id) : undefined;
                          setPopover(popover === level.id ? null : level.id);
                        }}
                      />
                      {popover === level.id && (
                        <LevelPopover
                          level={level}
                          state={st}
                          color={unit.color}
                          finished={finished}
                          hearts={user.hearts}
                          onStart={onStart}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
      <p className="path__end">More units coming soon · लवकरच येत आहे</p>

      {guide && <Guidebook unit={guide} romanization={user.settings.romanization} onClose={() => setGuide(null)} />}
    </div>
  );
};

const LevelNode = ({
  level,
  state,
  color,
  progress,
  onClick,
}: {
  level: Level;
  state: LevelState;
  color: string;
  progress: number;
  onClick: (e: React.MouseEvent) => void;
}) => {
  const icon = state === 'legendary' ? '👑' : state === 'passed' && level.type !== 'chest' ? '✓' : ICON[level.type];
  const ring = state === 'active' && level.type === 'skill';
  return (
    <button
      type="button"
      className={`node node--${state} node--${level.type}`}
      style={{ '--unit': color, '--p': `${progress * 360}deg` } as React.CSSProperties}
      onClick={onClick}
      aria-label={`${level.title} (${state})`}
    >
      {ring && <span className="node__ring" />}
      <span className="node__face">{level.type === 'chest' && state === 'passed' ? '📭' : icon}</span>
    </button>
  );
};

const LevelPopover = ({
  level,
  state,
  color,
  finished,
  hearts,
  onStart,
}: {
  level: Level;
  state: LevelState;
  color: string;
  finished: number;
  hearts: number;
  onStart: (t: SessionTarget) => void;
}) => {
  const usesHearts = level.type !== 'practice';
  const noHearts = usesHearts && hearts <= 0;
  if (state === 'locked') {
    return (
      <div className="popover popover--locked" onClick={(e) => e.stopPropagation()}>
        <strong>{level.title}</strong>
        <p>Complete all levels above to unlock this!</p>
        <button type="button" className="btn btn--disabled" disabled>
          Locked
        </button>
      </div>
    );
  }
  const subtitle =
    state === 'active'
      ? level.type === 'skill'
        ? `Lesson ${finished + 1} of ${level.totalSessions}`
        : level.type === 'unit_review'
          ? 'Prove your skills · +40 XP'
          : 'Practice · earns +1 ❤️'
      : state === 'legendary'
        ? 'You reached Legendary!'
        : 'Level passed — practice anytime';
  return (
    <div className="popover" style={{ background: color }} onClick={(e) => e.stopPropagation()}>
      <strong>{level.title}</strong>
      <p>{subtitle}</p>
      <button
        type="button"
        className="btn btn--white"
        style={{ color }}
        disabled={noHearts}
        onClick={() => onStart({ kind: 'level', levelId: level.id })}
      >
        {noHearts ? 'No hearts left 💔' : state === 'active' ? `Start +${level.type === 'unit_review' ? 40 : 10} XP` : 'Practice +10 XP'}
      </button>
      {state === 'passed' && level.type === 'skill' && (
        <button type="button" className="btn btn--legendary" onClick={() => onStart({ kind: 'level', levelId: level.id, legendary: true })}>
          👑 Legendary +40 XP
        </button>
      )}
    </div>
  );
};

const Guidebook = ({ unit, romanization, onClose }: { unit: Unit; romanization: boolean; onClose: () => void }) => (
  <div className="sheet-backdrop" onClick={onClose}>
    <div className="sheet sheet--tall" onClick={(e) => e.stopPropagation()}>
      <div className="sheet__head">
        <h2>📖 {unit.title} guidebook</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="guide">
        {unit.guidebook.map((t) => (
          <article key={t.heading} className="guide__tip">
            <h3>{t.heading}</h3>
            <p>{t.body}</p>
            {t.examples.map((ex) => (
              <button type="button" key={ex.mr} className="guide__ex" onClick={() => speak(ex.mr)}>
                <span className="guide__mr">🔊 {ex.mr}</span>
                {romanization && <span className="guide__tr">{ex.tr}</span>}
                <span className="guide__en">{ex.en}</span>
              </button>
            ))}
          </article>
        ))}
        <h3 className="guide__vocab-title">Key words</h3>
        <div className="guide__vocab">
          {unit.skills.flatMap((s) => s.lexemes).map((l) => (
            <button type="button" key={l.mr} className="vocab" onClick={() => speak(l.mr)}>
              <span>{l.emoji}</span>
              <span className="vocab__mr">{l.mr}</span>
              {romanization && <span className="vocab__tr">{l.tr}</span>}
              <span className="vocab__en">{l.en}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);
