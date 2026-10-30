import type { Character, Lexeme, Sentence, Skill } from '../content/types';

// Challenge type names match Duolingo's client-side challenge enum
// (`e.Translate="translate"`, `e.SelectTranscription="selectTranscription"`, …).

export type Challenge =
  | { id: string; type: 'select'; prompt: string; options: Lexeme[]; answer: number }
  | { id: string; type: 'assist'; word: Lexeme; options: string[]; answer: number }
  | { id: string; type: 'selectTranscription'; word: Lexeme; options: string[]; answer: number }
  | { id: string; type: 'match'; pairs: { left: string; leftTr?: string; right: string }[] }
  | {
      id: string;
      type: 'translate' | 'listenTap';
      /** direction of the answer tiles */
      target: 'mr' | 'en';
      sentence: Sentence;
      bank: string[];
      accepted: string[];
    }
  | { id: string; type: 'tapComplete'; sentence: Sentence; tokens: string[]; blank: number; options: string[]; answer: number }
  | { id: string; type: 'characterSelect'; char: Character; options: string[]; answer: number };

export type ChallengeType = Challenge['type'];

/** challenge types that need audio (the "listen" quest metric counts these) */
export const LISTEN_TYPES: ChallengeType[] = ['listenTap'];

export type Rng = () => number;

let seq = 0;
const nextId = () => `c${++seq}`;

export const shuffle = <T>(items: readonly T[], rng: Rng = Math.random): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const sample = <T>(items: readonly T[], n: number, rng: Rng): T[] => shuffle(items, rng).slice(0, n);

/** pick `n` distractors (unique by key) from `pool`, excluding `correct` */
const distractors = <T>(pool: readonly T[], correct: T, n: number, key: (x: T) => string, rng: Rng): T[] => {
  const seen = new Set([key(correct)]);
  const out: T[] = [];
  for (const x of shuffle(pool, rng)) {
    if (out.length >= n) break;
    if (seen.has(key(x))) continue;
    seen.add(key(x));
    out.push(x);
  }
  return out;
};

const withAnswer = <T>(correct: T, others: T[], rng: Rng): { options: T[]; answer: number } => {
  const options = shuffle([correct, ...others], rng);
  return { options, answer: options.indexOf(correct) };
};

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.,!?।'"’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const tokenize = (s: string) => normalize(s).split(' ').filter(Boolean);

export const isAnswerAccepted = (guess: string, accepted: string[]) =>
  accepted.some((a) => normalize(a) === normalize(guess));

const select = (word: Lexeme, pool: Lexeme[], rng: Rng): Challenge => {
  const { options, answer } = withAnswer(word, distractors(pool, word, 2, (l) => l.mr, rng), rng);
  return { id: nextId(), type: 'select', prompt: word.en, options, answer };
};

const assist = (word: Lexeme, pool: Lexeme[], rng: Rng): Challenge => {
  const others = distractors(pool, word, 2, (l) => l.en, rng).map((l) => l.en);
  const { options, answer } = withAnswer(word.en, others, rng);
  return { id: nextId(), type: 'assist', word, options, answer };
};

const selectTranscription = (word: Lexeme, pool: Lexeme[], rng: Rng): Challenge => {
  const others = distractors(pool, word, 3, (l) => l.tr, rng).map((l) => l.tr);
  const { options, answer } = withAnswer(word.tr, others, rng);
  return { id: nextId(), type: 'selectTranscription', word, options, answer };
};

const match = (words: Lexeme[], rng: Rng): Challenge => ({
  id: nextId(),
  type: 'match',
  pairs: sample(words, Math.min(5, words.length), rng).map((w) => ({ left: w.mr, leftTr: w.tr, right: w.en })),
});

const translate = (
  sentence: Sentence,
  target: 'mr' | 'en',
  type: 'translate' | 'listenTap',
  distractorPool: string[],
  rng: Rng,
): Challenge => {
  const answer = target === 'mr' ? sentence.mr : sentence.en;
  const tokens = tokenize(answer);
  const extra = shuffle(
    [...new Set(distractorPool.flatMap(tokenize))].filter((t) => !tokens.includes(t)),
    rng,
  ).slice(0, Math.max(2, Math.min(4, 8 - tokens.length)));
  const accepted = target === 'mr' ? [sentence.mr] : [sentence.en, ...(sentence.enAlt ?? [])];
  return { id: nextId(), type, target, sentence, bank: shuffle([...tokens, ...extra], rng), accepted };
};

const tapComplete = (sentence: Sentence, pool: Lexeme[], rng: Rng): Challenge | undefined => {
  const tokens = sentence.mr.split(' ');
  const candidates = tokens
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => pool.some((l) => l.mr === t));
  if (!candidates.length) return undefined;
  const { t, i } = candidates[Math.floor(rng() * candidates.length)];
  const others = distractors(pool.map((l) => l.mr), t, 2, (x) => x, rng);
  const { options, answer } = withAnswer(t, others, rng);
  return { id: nextId(), type: 'tapComplete', sentence, tokens, blank: i, options, answer };
};

const sentenceTokens = (sentences: Sentence[], lang: 'mr' | 'en') =>
  sentences.flatMap((s) => tokenize(lang === 'mr' ? s.mr : s.en));

export interface SkillSessionSpec {
  skills: Skill[];
  /** 0-based index of this session within the level (drives difficulty ramp) */
  sessionIndex: number;
  totalSessions: number;
  /** 'review' mixes everything and leans on sentence production */
  mode: 'learn' | 'review' | 'legendary';
  /** distractor pool from the wider unit */
  unitLexemes: Lexeme[];
  length?: number;
  rng?: Rng;
}

/**
 * Build a session the way Duolingo's lesson ramp feels: the first session of
 * a level introduces words (recognition), later sessions shift to sentence
 * production; reviews and legendary skew hardest (mr production, audio).
 */
export const generateSkillSession = (spec: SkillSessionSpec): Challenge[] => {
  const rng = spec.rng ?? Math.random;
  const length = spec.length ?? (spec.mode === 'learn' ? 10 : 12);
  const lexemes = spec.skills.flatMap((s) => s.lexemes);
  const sentences = spec.skills.flatMap((s) => s.sentences);
  const pool = spec.unitLexemes.length >= 4 ? spec.unitLexemes : lexemes;
  const mrPool = [...sentenceTokens(sentences, 'mr'), ...pool.map((l) => l.mr)];
  const enPool = [...sentenceTokens(sentences, 'en'), ...pool.flatMap((l) => tokenize(l.en))];

  const ramp = spec.mode === 'learn' ? spec.sessionIndex / Math.max(1, spec.totalSessions - 1) : 1;
  // focus words: first session → first half of the bank, then the rest, then all
  const half = Math.ceil(lexemes.length / 2);
  const focus =
    spec.mode !== 'learn' || spec.totalSessions < 2
      ? lexemes
      : spec.sessionIndex === 0
        ? lexemes.slice(0, half)
        : spec.sessionIndex === 1
          ? lexemes.slice(half)
          : lexemes;

  const wordMakers = [select, assist, selectTranscription];
  const out: Challenge[] = [];
  const sentenceShare = sentences.length ? (spec.mode === 'learn' ? 0.25 + ramp * 0.4 : 0.6) : 0;
  const sentenceCount = Math.round(length * sentenceShare);

  // one match round per session (two for reviews)
  out.push(match(focus.length >= 3 ? focus : lexemes, rng));
  if (spec.mode !== 'learn') out.push(match(lexemes, rng));

  for (let i = 0; i < sentenceCount; i++) {
    const s = sentences[i % sentences.length];
    const roll = rng();
    const hard = spec.mode === 'legendary' || ramp > 0.5;
    if (roll < 0.2) {
      const c = tapComplete(s, pool, rng);
      if (c) {
        out.push(c);
        continue;
      }
    }
    if (roll < 0.45 && hard) out.push(translate(s, 'mr', 'listenTap', mrPool, rng));
    else if (roll < 0.7 || !hard) out.push(translate(s, 'en', 'translate', enPool, rng));
    else out.push(translate(s, 'mr', 'translate', mrPool, rng));
  }

  let w = 0;
  const words = shuffle(focus, rng);
  while (out.length < length) {
    const word = words[w % words.length];
    const maker = wordMakers[(w + Math.floor(rng() * 3)) % wordMakers.length];
    out.push(maker(word, pool, rng));
    w++;
  }

  // keep the match round first (as Duolingo opens many lessons with pairs), shuffle the rest
  const [first, ...rest] = out;
  return [first, ...shuffle(rest, rng)].slice(0, length);
};

export const generateAlphabetSession = (chars: Character[], all: Character[], rng: Rng = Math.random): Challenge[] => {
  const out: Challenge[] = [];
  const trPool = all.map((c) => c.tr);
  for (const char of shuffle(chars, rng)) {
    const others = distractors(trPool, char.tr, 3, (x) => x, rng);
    const { options, answer } = withAnswer(char.tr, others, rng);
    out.push({ id: nextId(), type: 'characterSelect', char, options, answer });
  }
  const examples = chars.flatMap((c) => (c.example ? [c.example] : []));
  if (examples.length >= 3) out.push(match(examples, rng));
  for (const char of sample(chars, Math.min(3, chars.length), rng)) {
    const others = distractors(trPool, char.tr, 3, (x) => x, rng);
    const { options, answer } = withAnswer(char.tr, others, rng);
    out.push({ id: nextId(), type: 'characterSelect', char, options, answer });
  }
  return out;
};

/** a fresh copy of a challenge for mistake recycling (new id, same content) */
export const recycle = (c: Challenge): Challenge => ({ ...c, id: nextId() });
