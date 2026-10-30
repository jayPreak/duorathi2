# Duorathi 2 — Marathi, the Duolingo way

A mobile-first web app for learning Marathi (मराठी), built by reverse
engineering the Duolingo web client with [REA](https://github.com/morluto/rea)
and re-implementing its learning loop from scratch. Marathi only.

How the rules were recovered (and the exact formulas) is in
[docs/REVERSE_ENGINEERING.md](docs/REVERSE_ENGINEERING.md).

## What's in it

- **Path** — sections → units → levels (skill ★, chest 🎁, practice 🏋️,
  unit review 🏆), states locked / active / passed / legendary 👑, progress
  ring per level, per-unit guidebook with tappable audio.
- **Lessons generated per session** from each skill's word + sentence bank.
  Challenge types: `select`, `assist`, `selectTranscription`, `match`,
  `translate` (both directions, word bank), `listenTap`, `tapComplete`, and
  `characterSelect` for Devanagari.
- **Session engine** — wrong answers are recycled to the end, hearts per
  mistake, combo streak, coach messages, Check/Continue footer, keyboard
  shortcuts (1–4, Enter).
- **XP** — Duolingo's formula: `(base + min(heartsLeft, 3|4) + ceil(5·streak/len)) × boost`.
- **Hearts** (5, +1 / 30 min, practice refills one), **streak** with freezes,
  **gems**, **daily goal**, **daily quests**, **weekly leagues**, **shop**
  (refill, freeze, 2× XP boost), **Letters** tab for Devanagari, profile with a
  7-day XP chart.
- Romanization toggle, browser TTS (`mr-IN`, Hindi voice fallback), dark mode,
  installable (web manifest).

Progress is stored in `localStorage` on the device.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # engine unit tests
pnpm build      # static site in dist/
```

## Layout

```
src/content/   course.ts (Marathi units/skills), alphabet.ts, types.ts
src/engine/    xp, session reducer, challenge generator, progress, quests, league
src/ui/        Path, Session (+ end slides), Challenges, Tabs, store, speech
tools/re/      fetch-bundles.sh + run-rea.sh — reproduce the analysis (output is gitignored)
docs/          REVERSE_ENGINEERING.md
```

Not affiliated with Duolingo. No Duolingo code, artwork, audio or course
content is included.
