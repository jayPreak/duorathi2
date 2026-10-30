// Course model. Shape follows what the Duolingo web client works with (see
// docs/REVERSE_ENGINEERING.md): a course is sections → units → path levels, and
// each skill level owns a bank of lexemes + sentences from which challenges are
// generated per session rather than authored one by one.

export interface Lexeme {
  mr: string;
  /** romanization (IAST-lite) */
  tr: string;
  en: string;
  emoji?: string;
}

export interface Sentence {
  mr: string;
  tr: string;
  en: string;
  /** other accepted English renderings */
  enAlt?: string[];
}

export interface Skill {
  id: string;
  title: string;
  lexemes: Lexeme[];
  sentences: Sentence[];
}

export type LevelType = 'skill' | 'chest' | 'practice' | 'unit_review';

export interface Level {
  id: string;
  type: LevelType;
  title: string;
  /** skill levels reference one skill; practice / unit_review draw from the whole unit */
  skillId?: string;
  totalSessions: number;
}

export interface GuidebookTip {
  heading: string;
  body: string;
  examples: Sentence[];
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  color: string;
  skills: Skill[];
  guidebook: GuidebookTip[];
  levels: Level[];
}

export interface Section {
  id: string;
  title: string;
  units: Unit[];
}

export interface Character {
  ch: string;
  tr: string;
  /** example word using the character */
  example?: Lexeme;
}

export interface CharacterGroup {
  id: string;
  title: string;
  characters: Character[];
}
