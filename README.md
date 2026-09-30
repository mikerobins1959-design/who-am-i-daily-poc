# Who Am I? Daily — Milestone 3

A lightweight, mobile-first proof of concept for a daily sudden-death identity game. It uses plain HTML, CSS, and JavaScript, with no framework, runtime dependencies, backend, accounts, analytics, or external services. The optional production build copies an explicit static-file allowlist without bundling the application or adding runtime dependencies.

## Run locally

The game loads its puzzle data with `fetch`, so serve the project over HTTP rather than opening `index.html` directly. Node.js 20 or newer is required; there are no packages to install.

```sh
npm run dev
```

Then open [http://localhost:8000](http://localhost:8000).

The server listens on loopback by default. Development tools that need a
different interface or port can pass them after `--`, for example:

```sh
npm run dev -- --host 0.0.0.0 --port 4173
```

Static responses use `Cache-Control: no-store`. If an older service worker is
already controlling the local origin, clear that origin's site data once before
reviewing live source changes.

The repository also includes dependency-free tests:

```sh
npm test
```

Create the allowlisted static production artifact in `dist/` with:

```sh
npm run validate:puzzles
npm run build
```

The checked-in schedule contains 534 client-supplied puzzles from `2026-10-20`
through `2028-04-05`. See [`HOSTING.md`](HOSTING.md) for the build contract,
install/offline behaviour, and the remaining domain/DNS checks.

## Milestone 2 hosted review build

[who-am-i-daily-review.netlify.app](https://who-am-i-daily-review.netlify.app)
is the earlier Milestone 2 sample deployment. It opens the `2026-09-22` sample
puzzle directly in a top-level HTTPS page. It uses
an isolated browser-storage namespace and fixed review date, so it does not
change the production game's local-date behaviour or saved state. The small
**Review build · sample puzzle** menu can replay the Angela intro or reset the
sample game.

This review site is uploaded manually from an ignored local package. Git pushes
do not deploy it automatically. HTTPS makes the browser's native share API
available, but native sharing on this hosted build still needs confirmation on
a compatible device.

## Previewing another date

The game always follows the player's real local date, so a date with no puzzle
shows the unavailable state. To review any day without changing your system
clock, serve the project and open:

```text
http://localhost:8000/tools/preview/index.html
```

Pick a date to run the real application with its clock fixed to that day. You can
also paste a saved-state JSON object to resume from a specific situation, which
is how the streak and refresh behaviour in `TESTING.md` was verified.
The preview defaults to the first scheduled puzzle, `2026-10-20`. The final
scheduled date is `2028-04-05`; use `2028-04-06` to inspect the intentional
missing-puzzle state after the current range.

**Replay intro cleanly** replays Angela over the real framed app and hides the
development toolbar for screenshots. It clears only the preview intro's
per-session seen marker; the saved preview game and statistics remain untouched.
**Clean presentation** hides the toolbar without replaying the intro. Press
Escape or tab to **Show preview controls** to return.

The preview keeps its saved state in a separate Local Storage namespace. Opening,
reloading, seeding, or resetting the preview never changes progress saved by the
normal game on the same origin. Preview state is preserved across preview reloads;
the selected fixture date is retained as well. Use **Load with no saved state**
to reset only the preview. This tool is for development only. It is never loaded
by the game itself, and nothing in `index.html` references it.

## Project structure

```text
.
├── index.html              Page structure and game states
├── css/styles.css          Mobile-first presentation
├── data/puzzles.json       Daily puzzle content
├── manifest.webmanifest    Install metadata and icon declarations
├── service-worker.js       Scoped shell and validated puzzle-data caching
├── js/
│   ├── config.js           Data location, storage key, date-check interval
│   ├── game.js             Rules, scoring, dates, validation, state transitions
│   ├── info.js             FAQ dialog lifecycle, scroll lock, and focus return
│   ├── intro.js            Angela opener, preload, motion, and focus behavior
│   ├── pwa.js              Scoped service-worker registration
│   ├── session.js          Cross-tab and date-change reconciliation
│   ├── share.js            Spoiler-free result text and browser share fallbacks
│   └── app.js              Loading, rendering, events, persistence
├── assets/                 Angela production artwork and source reference
├── client-handoff/         Corrected source questions and correction record
├── tests/                  Rule, state, info, intro, share, and preview regressions
├── tools/preview/          Development tool for viewing any date (see below)
├── tools/build-production.mjs  Allowlisted static production build
├── tools/dev-server.mjs       Dependency-free local development server
├── tools/import-client-questions.mjs  Reproducible source-to-runtime import
├── tools/validate-puzzles.mjs  Schema and optional launch-date coverage check
├── netlify.toml            Netlify build, publish directory, and cache policy
├── HOSTING.md              Hosting, domain, install, and launch handoff
└── TESTING.md              What was verified and how to re-run it
```

The split matters: `js/game.js` holds the rules as pure functions with no DOM or
storage access, so the game can be reasoned about and tested independently of the
page. `js/app.js` owns everything browser-facing — fetching, rendering, events,
and the Local Storage boundary. Puzzle content stays entirely in
`data/puzzles.json`, separate from both.

## Add a daily puzzle

The corrected maintenance source is `client-handoff/questions.json`. Before the
schedule is published, regenerate the runtime file with:

```sh
npm run import:puzzles
```

The importer preserves each category's source order, deterministically mixes
categories, keeps repeated identities with different clues, combines `options`
and `alt_answers`, and removes only exact duplicate gameplay content. The
checked-in source currently contains no such duplicates. A focused regression
test proves that rerunning the importer produces the committed 534-day schedule.

After any dated puzzle has gone live, preserve published date assignments and
append future puzzles instead of rerunning the mixer over changed source data.

Add one object to the array in `data/puzzles.json`. Dates are matched to the player's local browser date and must use `YYYY-MM-DD` format. Do not reuse a date or duplicate another day's content to fill a gap.

The game keeps this ISO-style format for puzzle matching and saved state, while
player-facing dates use UK `DD/MM/YYYY` format.

```json
{
  "date": "2026-09-22",
  "answer": "Ada Lovelace",
  "clues": [
    "First clue",
    "Second clue",
    "Third clue"
  ],
  "options": [
    "Ada Lovelace",
    "Distractor 1",
    "Distractor 2",
    "Distractor 3",
    "Distractor 4",
    "Distractor 5",
    "Distractor 6",
    "Distractor 7"
  ]
}
```

Each puzzle must contain exactly three non-empty clues and eight distinct,
non-empty options, and `answer` must exactly match one of those options. The game
deliberately checks `selectedOption === puzzle.answer` and does not normalise
case, punctuation, aliases, or spacing.

The game displays those eight values in a deterministic shuffled order derived
from the puzzle date and option list. The order stays the same across refreshes
and tabs for that daily puzzle without changing the JSON or adding saved state.

### Validation when exporting from a spreadsheet

The whole file is validated before the game renders anything, and a problem
reports the offending entry and the reason rather than starting a partial game:

```text
Puzzle 3 must have exactly 8 non-empty options.
Puzzle 5's answer must exactly match one option.
Puzzle 7 duplicates date 2026-10-02.
```

This is worth knowing if puzzles are exported from a spreadsheet. Because
matching is exact by design, a stray trailing space on an answer cell is caught
here by name, at load, instead of silently producing a puzzle that cannot be
won. Fix the reported entry and reload.

## Game rules

- Clues 1, 2, and 3 are worth 3, 2, and 1 points respectively.
- The player may reveal all eight answer options at any clue. Revealing options locks that clue; the player must then submit a guess and cannot reveal later clues.
- Revealing the next clue lowers the score available; clue 3 must be answered. There is no countdown timer.
- A correct answer awards the current clue's score and ends the daily game.
- A wrong answer awards 0 and ends the daily game immediately.
- A completed game remains locked after a refresh.
- If the local date has no matching puzzle, the page shows an intentional empty state.

## Local game state

The browser stores one state object under `who-am-i-daily-state` in Local Storage:

```json
{
  "lastPlayedDate": "2026-09-22",
  "lastCompletedDate": "2026-09-21",
  "gameStatus": "IN_PROGRESS",
  "currentClueIndex": 0,
  "score": 0,
  "optionsVisible": false,
  "stats": {
    "played": 12,
    "wins": 10,
    "currentStreak": 4,
    "maxStreak": 7,
    "scoreDistribution": {
      "3": 5,
      "2": 3,
      "1": 2,
      "0": 2
    }
  }
}
```

`gameStatus` is `IN_PROGRESS`, `WON`, or `FAILED`. An unanswered `IN_PROGRESS` state resumes at the same clue after reload, including a revealed answer grid and its clue lock. The additive `lastCompletedDate` field keeps streak calculations accurate after date rollover: a win continues a streak only when the previous completed game was on the prior calendar date. A loss resets the streak, and an abandoned or skipped day causes the next win to start again at 1. Stats change only when an answer completes a game, preventing refreshes from double-counting results.

Malformed saved data is ignored safely and the player sees a warning. If Local Storage is unavailable or a save fails, the current page remains playable and warns that a refresh may lose progress. State is local to the current browser and can be affected by clearing site data, private browsing, storage restrictions, or changing the device clock. There is no server-side recovery or cross-device sync in this proof of concept.

To reset local progress during development, open the browser console on the locally served page and run:

```js
localStorage.removeItem("who-am-i-daily-state");
```

Refresh the page afterward.

## Milestone 2 experience

An in-progress daily game opens with the final client-supplied Angela artwork,
a CSS edge blend, and a live visor readout for the current score and streak. The image is
preloaded before the overlay appears, the opener can be skipped with its button
or Escape, and keyboard focus stays inside the overlay until it closes. It plays
once per local date in each tab session. Reduced-motion users, completed games,
and browsers where the artwork or Session Storage is unavailable proceed
straight to the game.

The live game uses the same score and streak values in its compact HUD. The
styled advertisement area is an empty placeholder only; it loads no advertising
account, script, network request, or tracking.

### HUD data contract and future handoff

The intro and compact game HUD read from the same saved daily game state:

- **SCORE** is `state.score`, the points earned in the current daily game. It is
  `0` while that game is still in progress and becomes `3`, `2`, or `1` after a
  win. It is not a cumulative or lifetime score.
- **STREAK** is `state.stats.currentStreak`, the current completed-day winning
  streak already maintained in Local Storage.

`runDailyIntro` receives these as explicit `score` and `streak` values, so the
artwork module is independent of where those values come from. No backend is
needed for the current local statistics. If a later milestone adds accounts or
cross-device statistics, keep authentication, fetching, validation, and the
local-versus-remote resolution policy outside `intro.js`; pass the resolved
values through the existing parameters. A lifetime or cumulative SCORE would
be a separate product definition and would require updated labels and tests.

Completed games expose spoiler-free **Share result** and **Copy result** actions. The shared text
contains only the game title, source date, score, and clue-stage outcome. It
never includes the answer, clue text, answer options, streak, or other history.
Share result prefers the browser's native share sheet, then falls back to the
clipboard or a read-only text box. Copy result is always available alongside it
and goes directly to the clipboard/manual-copy path, so an unavailable operating-
system share sheet never blocks copying.
A clean page URL is included only on a public web location; local and development
preview URLs are omitted.

Native sharing and programmatic clipboard access require a secure browser
context. HTTPS is required on a hosted site, while browsers treat `localhost`
as secure for local development. When testing from a phone over plain LAN HTTP,
the game falls back to the spoiler-free manual-copy field.

The header information button and footer **FAQ, contact & legal** button open the
same native dialog. It explains the final scoring, clue-lock, refresh, date, and
local-statistics rules; provides the support email as a `mailto:` link; and
includes the client-facing disclaimer and supplied Instagram and TikTok profile
links. `js/info.js` owns only dialog lifecycle, page scroll locking, and focus
restoration. It does not read or change game state, make network requests, or
collect contact details.

## Scope boundaries

This repository is a fixed-scope proof of concept. Milestone 3 is the current
deliverable.

**Implemented across Milestones 1–3**

- Three-clue Sudden Death loop with 3/2/1 scoring and exact-match answers.
- Local browser-date puzzle selection from `data/puzzles.json`.
- Local Storage persistence of in-progress and completed daily results plus cumulative statistics.
- Responsive dark HUD treatment and intentional missing-puzzle state.
- Angela opening artwork with a dynamic score/streak overlay and safe fallbacks.
- Spoiler-free sharing through native, clipboard, and manual-copy paths.
- Responsive FAQ, contact, and legal information dialog with keyboard focus return.
- Installable mobile metadata, scoped offline shell caching, and validated
  network-first puzzle-data caching.
- An allowlisted, dependency-free production packaging and puzzle-validation path.
- A styled, empty ad placeholder with no ad-serving integration.

See [`assets/README.md`](assets/README.md) for the Angela production asset and
source-art provenance.

**Explicitly out of scope (needs an approved scope change)**

Accounts or login, any backend or database, server-side anti-cheat, real-time
multiplayer, AI-generated puzzles, a puzzle-management or admin system,
analytics, a real AdSense account or ad-serving scripts, app-store packaging,
extra game modes, and invented puzzle content.

The production Netlify site and Namecheap records are selected and documented.
Publishing the Milestone 3 branch and verifying the live HTTPS deployment and
certificate remain pending. The completed iOS Simulator checks are accepted for
this release; Mike will perform the non-blocking Android follow-up. See
[`HOSTING.md`](HOSTING.md).

Puzzle content is authored in the client's Google Sheet and exported to
`client-handoff/questions.json`. The reproducible importer creates the fixed
daily schedule in `data/puzzles.json`; it does not invent puzzle content.
