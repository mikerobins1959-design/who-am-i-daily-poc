# Who Am I? Daily — Milestone 1

A lightweight, mobile-first proof of concept for a daily sudden-death identity game. It uses plain HTML, CSS, and JavaScript, with no build step, runtime dependencies, backend, accounts, analytics, or external services.

## Run locally

The game loads its puzzle data with `fetch`, so serve the project over HTTP rather than opening `index.html` directly.

```sh
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

The repository also includes dependency-free tests that run on Node.js 20 or newer:

```sh
npm test
```

## Project structure

```text
.
├── index.html          Page structure and accessible game states
├── css/styles.css      Mobile-first presentation
├── data/puzzles.json   Daily puzzle content
├── assets/README.md    Milestone 2 artwork requirement (no asset supplied yet)
├── js/config.js        Data URL, storage key, and date-check interval
├── js/game.js          Pure game, date, validation, and state logic
├── js/app.js           Browser loading, rendering, events, and persistence
└── tests/game.test.mjs Node built-in tests for the game rules
```

## Add a daily puzzle

Add one object to the array in `data/puzzles.json`. Dates are matched to the player's local browser date and must use `YYYY-MM-DD` format. Do not reuse a date or duplicate another day's content to fill a gap.

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

Each puzzle must contain exactly three non-empty clues and eight distinct, non-empty options. `answer` must exactly match one of those options. The game deliberately checks `selectedOption === puzzle.answer`; it does not normalize case, punctuation, aliases, or spacing. Invalid puzzle data shows an error instead of starting a partial game.

## Game rules

- Clues 1, 2, and 3 are worth 3, 2, and 1 points respectively.
- The player may reveal all eight answer options at any clue.
- Revealing the next clue lowers the score available; clue 3 must be answered.
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

`gameStatus` is `IN_PROGRESS`, `WON`, or `FAILED`. `optionsVisible` restores the answer panel after refresh. The additive `lastCompletedDate` field keeps streak calculations accurate after date rollover: a win continues a streak only when the previous completed game was on the prior calendar date. A loss resets the streak, and an abandoned or skipped day causes the next win to start again at 1. Stats change only when an answer completes a game, preventing refreshes from double-counting results.

Malformed saved data is ignored safely and the player sees a warning. If Local Storage is unavailable or a save fails, the current page remains playable and warns that a refresh may lose progress. State is local to the current browser and can be affected by clearing site data, private browsing, storage restrictions, or changing the device clock. There is no server-side recovery or cross-device sync in this proof of concept.

To reset local progress during development, open the browser console on the locally served page and run:

```js
localStorage.removeItem("who-am-i-daily-state");
```

Refresh the page afterward.

## Scope boundaries

This repository is a fixed-scope proof of concept. Milestone 1 is the current
deliverable.

**In scope (Milestone 1, delivered here)**

- Three-clue Sudden Death loop with 3/2/1 scoring and exact-match answers.
- Local browser-date puzzle selection from `data/puzzles.json`.
- Local Storage persistence of daily progress and cumulative statistics.
- Functional, restrained, mobile-first interface, including the missing-puzzle
  state.

**Deferred to Milestone 2**

- Final visual polish.
- Angela opening artwork and the dissolve/fade into Clue 1.
- Dynamic visor HUD overlay (`DAILY WHOAMIGAME`, `SCORE`, `STREAK`).
- Spoiler-free social sharing.
- A styled, empty ad placeholder container only.

Milestone 2 needs a client-supplied `assets/angela_host.png`. That asset has not
been provided; see [`assets/README.md`](assets/README.md) for the specification
and the reason no substitute was created.

**Explicitly out of scope (needs an approved scope change)**

Accounts or login, any backend or database, server-side anti-cheat, real-time
multiplayer, AI-generated puzzles, a puzzle-management or admin system,
analytics, a real AdSense account or ad-serving scripts, deployment or hosting,
app-store packaging, extra game modes, and any puzzle content beyond the
client-provided example.

Puzzle content is authored in the client's Google Sheet and exported to
`data/puzzles.json`. This project consumes that file; it does not generate,
repeat, or invent puzzle content.
