import { useEffect, useMemo, useState } from 'react';
import { type Challenge, isAnswerAccepted, shuffle } from '../engine/challenges';
import { speak } from './speech';

export interface ChallengeProps<C extends Challenge = Challenge> {
  challenge: C;
  locked: boolean;
  romanization: boolean;
  sound: boolean;
  /** true / false = complete answer (correct or not), null = not answerable yet */
  onChange: (correct: boolean | null) => void;
  /** for self-grading types (match) */
  onSubmit: (correct: boolean) => void;
}

export const challengeTitle = (c: Challenge): string => {
  switch (c.type) {
    case 'select':
      return `Which one of these is “${c.prompt}”?`;
    case 'assist':
      return 'What does this mean?';
    case 'selectTranscription':
      return 'How is this read?';
    case 'match':
      return 'Tap the matching pairs';
    case 'translate':
      return c.target === 'en' ? 'Translate this sentence' : 'Write this in Marathi';
    case 'listenTap':
      return 'Tap what you hear';
    case 'tapComplete':
      return 'Complete the sentence';
    case 'characterSelect':
      return 'What sound does this make?';
  }
};

/** the answer shown in the "Correct solution" footer */
export const solutionText = (c: Challenge): string => {
  switch (c.type) {
    case 'select':
      return `${c.options[c.answer].mr} (${c.options[c.answer].tr})`;
    case 'assist':
    case 'selectTranscription':
    case 'characterSelect':
      return c.options[c.answer];
    case 'match':
      return '';
    case 'translate':
    case 'listenTap':
      return c.target === 'mr' ? `${c.sentence.mr} — ${c.sentence.tr}` : c.sentence.en;
    case 'tapComplete':
      return c.sentence.mr;
  }
};

/** the translation shown after answering, to reinforce meaning */
export const meaningText = (c: Challenge): string | undefined => {
  switch (c.type) {
    case 'translate':
    case 'listenTap':
    case 'tapComplete':
      return `${c.sentence.mr} = ${c.sentence.en}`;
    case 'assist':
    case 'selectTranscription':
      return `${c.word.mr} (${c.word.tr}) = ${c.word.en}`;
    default:
      return undefined;
  }
};

const SpeakButton = ({ text, big }: { text: string; big?: boolean }) => (
  <button
    type="button"
    className={`speak ${big ? 'speak--big' : ''}`}
    onClick={(e) => {
      e.stopPropagation();
      speak(text);
    }}
    aria-label="Play audio"
  >
    🔊
  </button>
);

const Mr = ({ text, tr, romanization }: { text: string; tr?: string; romanization: boolean }) => (
  <span className="mr">
    <span className="mr__text">{text}</span>
    {romanization && tr && <span className="mr__tr">{tr}</span>}
  </span>
);

const Choices = ({
  options,
  locked,
  onPick,
  picked,
  render,
  grid,
}: {
  options: unknown[];
  locked: boolean;
  picked: number | null;
  onPick: (i: number) => void;
  render: (i: number) => React.ReactNode;
  grid?: boolean;
}) => (
  <div className={grid ? 'choices choices--grid' : 'choices'}>
    {options.map((_, i) => (
      <button
        type="button"
        key={i}
        className={`choice ${picked === i ? 'choice--picked' : ''}`}
        disabled={locked}
        onClick={() => onPick(i)}
      >
        <span className="choice__key">{i + 1}</span>
        {render(i)}
      </button>
    ))}
  </div>
);

const useNumberKeys = (count: number, locked: boolean, onPick: (i: number) => void) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!locked && n >= 1 && n <= count) onPick(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, locked, onPick]);
};

const MultipleChoice = ({ challenge: c, locked, romanization, sound, onChange }: ChallengeProps) => {
  const [picked, setPicked] = useState<number | null>(null);
  const count = 'options' in c ? c.options.length : 0;
  const pick = (i: number) => {
    setPicked(i);
    onChange('answer' in c && i === c.answer);
    if (sound && c.type === 'select') speak(c.options[i].mr);
  };
  useNumberKeys(count, locked, pick);
  if (c.type !== 'select' && c.type !== 'assist' && c.type !== 'selectTranscription' && c.type !== 'characterSelect') return null;

  if (c.type === 'select') {
    return (
      <Choices
        grid
        options={c.options}
        locked={locked}
        picked={picked}
        onPick={pick}
        render={(i) => (
          <span className="card-choice">
            <span className="card-choice__emoji">{c.options[i].emoji}</span>
            <Mr text={c.options[i].mr} tr={c.options[i].tr} romanization={romanization} />
          </span>
        )}
      />
    );
  }
  const head =
    c.type === 'characterSelect' ? (
      <div className="prompt-char">
        <span>{c.char.ch}</span>
        <SpeakButton text={c.char.ch} />
      </div>
    ) : (
      <div className="prompt-word">
        <SpeakButton text={c.word.mr} big />
        <Mr text={c.word.mr} tr={c.type === 'assist' ? c.word.tr : undefined} romanization={romanization} />
      </div>
    );
  return (
    <>
      {head}
      <Choices options={c.options} locked={locked} picked={picked} onPick={pick} render={(i) => c.options[i] as string} />
    </>
  );
};

const Match = ({ challenge: c, locked, romanization, sound, onSubmit }: ChallengeProps) => {
  const pairs = c.type === 'match' ? c.pairs : [];
  const left = useMemo(() => shuffle(pairs.map((p, i) => ({ i, text: p.left, tr: p.leftTr }))), [pairs]);
  const right = useMemo(() => shuffle(pairs.map((p, i) => ({ i, text: p.right }))), [pairs]);
  const [sel, setSel] = useState<{ side: 'l' | 'r'; i: number } | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null);

  const tap = (side: 'l' | 'r', i: number, text: string) => {
    if (locked || done.includes(i)) return;
    if (side === 'l' && sound) speak(text);
    if (!sel || sel.side === side) return setSel({ side, i });
    if (sel.i === i) {
      const next = [...done, i];
      setDone(next);
      setSel(null);
      if (next.length === pairs.length) setTimeout(() => onSubmit(true), 250);
    } else {
      setWrong(side === 'r' ? { l: sel.i, r: i } : { l: i, r: sel.i });
      setSel(null);
      setTimeout(() => setWrong(null), 500);
    }
  };
  const cls = (side: 'l' | 'r', i: number) =>
    [
      'tile tile--match',
      done.includes(i) ? 'tile--done' : '',
      sel?.side === side && sel.i === i ? 'tile--selected' : '',
      wrong && (side === 'l' ? wrong.l : wrong.r) === i ? 'tile--wrong' : '',
    ].join(' ');
  return (
    <div className="match">
      <div className="match__col">
        {left.map((x) => (
          <button type="button" key={x.i} className={cls('l', x.i)} onClick={() => tap('l', x.i, x.text)}>
            <Mr text={x.text} tr={x.tr} romanization={romanization} />
          </button>
        ))}
      </div>
      <div className="match__col">
        {right.map((x) => (
          <button type="button" key={x.i} className={cls('r', x.i)} onClick={() => tap('r', x.i, x.text)}>
            {x.text}
          </button>
        ))}
      </div>
    </div>
  );
};

const WordBank = ({ challenge: c, locked, romanization, sound, onChange }: ChallengeProps) => {
  const [chosen, setChosen] = useState<number[]>([]);
  const isTiles = c.type === 'translate' || c.type === 'listenTap';
  useEffect(() => {
    if (sound && c.type === 'listenTap') speak(c.sentence.mr);
  }, [c, sound]);
  if (!isTiles) return null;

  const update = (next: number[]) => {
    setChosen(next);
    onChange(next.length ? isAnswerAccepted(next.map((i) => c.bank[i]).join(' '), c.accepted) : null);
  };
  const source = c.target === 'en' ? c.sentence.mr : c.sentence.en;

  return (
    <>
      {c.type === 'listenTap' ? (
        <div className="listen">
          <button type="button" className="listen__btn" onClick={() => speak(c.sentence.mr)}>
            🔊
          </button>
          <button type="button" className="listen__btn listen__btn--slow" onClick={() => speak(c.sentence.mr, 0.55)}>
            🐢
          </button>
        </div>
      ) : (
        <div className="bubble-row">
          <div className="owl" aria-hidden>
            🦉
          </div>
          <div className="bubble">
            {c.target === 'en' && <SpeakButton text={c.sentence.mr} />}
            {c.target === 'en' ? (
              <Mr text={source} tr={c.sentence.tr} romanization={romanization} />
            ) : (
              <span>{source}</span>
            )}
          </div>
        </div>
      )}
      <div className="answer-line">
        {chosen.map((i) => (
          <button type="button" key={i} className="tile" disabled={locked} onClick={() => update(chosen.filter((x) => x !== i))}>
            {c.bank[i]}
          </button>
        ))}
      </div>
      <div className="bank">
        {c.bank.map((w, i) => (
          <button
            type="button"
            key={i}
            className={`tile ${chosen.includes(i) ? 'tile--ghost' : ''}`}
            disabled={locked || chosen.includes(i)}
            onClick={() => {
              if (sound && c.target === 'mr') speak(w);
              update([...chosen, i]);
            }}
          >
            {w}
          </button>
        ))}
      </div>
    </>
  );
};

const TapComplete = ({ challenge: c, locked, romanization, onChange }: ChallengeProps) => {
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (i: number) => {
    setPicked(i);
    onChange('answer' in c && i === c.answer);
  };
  useNumberKeys('options' in c ? c.options.length : 0, locked, pick);
  if (c.type !== 'tapComplete') return null;
  return (
    <>
      <p className="hint-en">“{c.sentence.en}”</p>
      <div className="cloze">
        <SpeakButton text={c.sentence.mr} />
        {c.tokens.map((t, i) =>
          i === c.blank ? (
            <span key={i} className={`cloze__blank ${picked !== null ? 'cloze__blank--filled' : ''}`}>
              {picked !== null ? c.options[picked] : ' '}
            </span>
          ) : (
            <span key={i} className="cloze__word">
              {t}
            </span>
          ),
        )}
      </div>
      {romanization && <p className="cloze__tr">{c.sentence.tr}</p>}
      <Choices options={c.options} locked={locked} picked={picked} onPick={pick} render={(i) => c.options[i]} />
    </>
  );
};

export const ChallengeView = (props: ChallengeProps) => {
  switch (props.challenge.type) {
    case 'match':
      return <Match {...props} />;
    case 'translate':
    case 'listenTap':
      return <WordBank {...props} />;
    case 'tapComplete':
      return <TapComplete {...props} />;
    default:
      return <MultipleChoice {...props} />;
  }
};
