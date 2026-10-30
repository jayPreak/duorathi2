# Reverse engineering notes — Duolingo web client

Goal: understand how Duolingo's learning loop works (lessons, XP, hearts,
streaks, quests, path) well enough to build an independent Marathi-only
clone. No Duolingo code, art, audio or course content is copied into this
repo — only the *rules* below, re-implemented from scratch in `src/engine/`.

Analyzed 2026-10-30. Bundle hashes change on every Duolingo deploy, so chunk
names below are a snapshot.

## Method

1. **Acquire** — `tools/re/fetch-bundles.sh` downloads the public, logged-out
   `duolingo.com` shell, its entry chunks, and every lazy chunk listed in the
   webpack runtime (`manifest-*.js` maps chunk id → name + hash). 296 chunks,
   ~25 MB. Named lazy chunks of interest: `session`, `path`, `pathSections`,
   `homePage`, plus numbered chunks (`179`, `8876`, `1469`, …).
2. **REA static analysis** — `tools/re/run-rea.sh` runs
   [REA](https://github.com/morluto/rea) `analyze-javascript-application`.
   - Whole bundle set: hit REA's 300 s per-source budget on the 750 KB vendor
     chunk (`provider_timeout`) after 106/297 sources — too big for one pass.
   - Focused pass on 6 learning-loop chunks (`--source-path`, 20 min budget):
     155 MB Evidence, 1 421 module records, semantic graph capped at 20 000
     nodes/file.
   - `trace-application-feature` seeded with `"legendary"`: 1 737 nodes,
     2 305 edges, 292 terminal paths — this is what located the XP calculator
     (chunk `179`) and the constants module it imports.
   - REA's graph is weakest on minified webpack bundles (no names, dynamic
     `a.d(t, {...})` exports), so traces were used to *locate* code, then the
     modules were read directly.
3. **Targeted reading** — modules found via REA traces / keyword hits were
   pretty-printed and read by hand. Findings below cite chunk + module id.

## Findings

### Challenge types (app chunk, string enum)

`assist, characterIntro, characterMatch, characterSelect, … listenTap, match,
select, selectPronunciation, selectTranscription, speak, tapCloze,
tapComplete, translate, transliterate, transliterationAssist, typeCloze, …`

Implemented here: `select`, `assist`, `selectTranscription`, `match`,
`translate` (both directions), `listenTap`, `tapComplete`, `characterSelect`.
Names are reused verbatim in `src/engine/challenges.ts`.

### Session state machine (app chunk, session reducer)

Actions: `START_SESSION`, `UPDATE_GRADED_CHALLENGE`, `ADVANCE_SESSION`,
`END_SESSION`, `QUIT_SESSION`, … Status: `Guessing → Grading → Blaming |
(correct) → Sliding`.

Initial state fields that shaped the clone: `heartsType`
(`"unlimitedHearts"` | `"sessionHearts"`), `maxHearts`, `maxInLessonStreak`,
`numChallengesCorrect`, `recycledMistakeIndexToOriginalMistakeIndex`,
`mistakesReplacementChallengeIndex`, `strength` (progress bar),
`coachDuo.currentCorrectStreak / currentIncorrectStreak`,
`numTimesTransliterationToggled`.

- Wrong answers are **recycled** to the end of the session and must be
  answered correctly before it ends.
- `END_SESSION`: the session failed when `heartsType === "sessionHearts" &&
  heartsLeft <= 0`; `completedWithHeartsRemaining = !endedEarly && !outOfHearts`.
- Coach / checkpoint messages enum: `small_right_streak`, `big_right_streak`,
  `wrong_streak`, `mid_point_checkpoint_test`, `mistakes_review`, …

→ `src/engine/session.ts`

### XP (chunk `179` module `7432`, constants app module `97106`)

Per session type (`h(e)`):

| Session type | XP |
|---|---|
| Lesson / LexemePractice / SpacedRepetition / UnitPractice | `(10 + heartsBonus + comboBonus) × boost` |
| AlphabetLesson | `(10 + heartsBonus + comboBonus) × boost` |
| AlphabetPractice | `(5 + heartsBonus + comboBonus) × boost` |
| UnitReview | `(40 + heartsBonus + comboBonus) × boost` |
| Legendary* | `(40 + heartsBonus + comboBonus) × boost` |
| GlobalPractice | `10` |
| LevelReview (skill) | `(20 + comboBonus) × boost` |

- `heartsBonus = min(max(0, heartsLeft), beginner ? 4 : 3)`
- `comboBonus = ceil(5 × maxInLessonStreak / challenges.length)` (0 when the
  streak is 0 or exceeds the length) — max +5
- XP boost multiplier `2`; boost items `xp_boost_15` (15 min = `9e5` ms) and
  `general_xp_boost` (30 min = `18e5` ms)
- Weekly XP chart: `v()` buckets the last 7 days of `{time, xp}` events.

→ `src/engine/xp.ts` (constants named after the minified identifiers)

### Hearts

- Refill timer is server-driven (`nextHeartRefillTimestampMs`); the client
  dispatches `INCREMENT_HEARTS {amount: 1}` when it passes.
- Refill sources: gems (`shop.misc.health_refill`, `HEARTS_REFILL`) and
  practice (`health_refill_method: "practice"` — finishing a GlobalPractice
  that raised hearts).

Clone: 5 max, +1 every 30 min (server value not in the bundle), practice
nodes give +1, shop refill 350 gems. → `src/engine/progress.ts`

### Streak

- Per-day calendar entries carry `streakExtended`, `frozen`, `repaired`
  (`J = e => e.streakExtended || e.frozen || e.repaired`).
- Streak freeze shop items; session-end slide `streakExtended`.

Clone: freezes (max 2) auto-cover missed days, else the streak resets.

### Daily quests (app chunk)

Metrics: `XP, LESSONS, NINETY_ACCURACY_LESSONS, PERFECT_LESSONS, QUESTS,
EIGHTY_ACCURACY_LESSONS, COMBO_XP, FIVE_CORRECT_IN_A_ROW,
TEN_CORRECT_IN_A_ROW, SPEAK_CHALLENGES, LISTEN_CHALLENGES, EXTEND_STREAK,
START_STREAK, SECONDS_SPENT_LEARNING`; slots `DAILY_QUEST_FIRST/SECOND/THIRD`.
Per-session evaluator: `NINETY_ACCURACY_LESSONS → accuracy ≥ 90`,
`PERFECT_LESSONS → accuracy ≥ 100`, `COMBO_XP → CT(len, maxStreak)`,
`FIVE/TEN_CORRECT_IN_A_ROW → maxInLessonStreak ≥ 5/10`.

→ `src/engine/quests.ts`

### Path (chunks `path`, `pathSections`)

Level types: `skill, story, practice, unit_review, unit_test, chest,
alphabet, alphabet_gate, …`; level states: `locked, active, passed,
legendary` (+ `assigned`). Skill levels track `finishedSessions /
totalSessions` ("Lesson N of M" in the popover). Sections → units → levels.

→ `src/content/course.ts`, `src/ui/Path.tsx`

### Session-end slides (chunk `179` module `53146`)

Order: `sessionComplete → … → dailyQuestComplete → dailyQuestReward →
streakExtended → …`.

### Leagues

Contest objects (`leagues` / `tournament` aliases) with `contestEnd`; tiers
are server data. Clone simulates a 20-person weekly cohort with seeded
rivals, top 5 promote / bottom 5 demote, 10 tiers.

## Not reproduced

Stories, speaking challenges (speech recognition), typed answers, Super
features, friends/social, server sync. Duolingo has no Marathi course, so all
Marathi content here is original.
