# who-am-i-daily-poc testing profile

This file records project-specific test intent and manual evidence. Commands and risk routing live in `.quality/quality.toml`.

## Test objectives

- Prove the 3/2/1 scoring, exact answer comparison, advance behavior, and immediate zero-point sudden death.
- Prove daily terminal results are recorded once, refresh-safe, and cannot be replayed.
- Prove new-date initialization retains cumulative statistics and follows the documented streak rule.
- Validate the puzzle and persisted-state contracts, including safe behavior for malformed inputs.
- Confirm the page is usable on mobile and desktop, by keyboard, and when today's puzzle is missing.

## Product risks

| Risk | Level | Required evidence |
| --- | --- | --- |
| Game-rule or score transition | normal | Focused Node regression plus changed-scope verification |
| Persistence, replay prevention, or statistics transition | normal | State-transition tests covering repeated terminal actions and restoration |
| Puzzle schema or date selection | normal | Contract tests with matching, missing, and invalid fixtures |
| DOM orchestration and user flow | normal | Automated pure-logic coverage plus focused browser walkthrough |
| Static styling, copy, or documentation only | low | Syntax/diff check and focused visual or content confirmation |

## Test levels

| Level | Location | Responsibility |
| --- | --- | --- |
| Unit/contract | `tests/*.test.mjs` | Pure game transitions, scoring, date selection, puzzle/state validation, and statistics |
| Integration | `tests/*.test.mjs` | JSON fixture contract and serialise/restore boundaries that can run without a browser dependency |
| System/acceptance | Manual browser walkthrough below | DOM interaction, localStorage across reload, responsive layout, focus, and empty/error states |

## Automated verification

The test suite uses Node's built-in test runner and assertions, with no package download or third-party dependency. Commands are owned by `.quality/quality.toml`:

- `./quality verify fast`: parse each application JavaScript file and check diff hygiene.
- `./quality verify changed`: run syntax checks, all `node --test` cases, and diff hygiene.
- `./quality verify full` and `./quality verify release`: run the same complete local suite for this dependency-free static application.
- `./quality validate`: validate the quality-code configuration itself.

Tests must control the date through a function boundary or fixture rather than the machine clock. Browser storage must be represented by explicit state input/output in rule tests; routine tests do not touch a user's real localStorage.

## Manual acceptance matrix

Serve the repository over a local HTTP server, use browser developer tools only to set controlled dates/state, and record pass/fail observations.

| Scenario | Procedure | Expected evidence |
| --- | --- | --- |
| Correct at clue 1 | Reveal options and choose Ada Lovelace immediately | Terminal win, score 3, played/wins and distribution `3` increment once |
| Correct at clue 2 | Advance once, reveal options, choose Ada Lovelace | Terminal win with score 2 and distribution `2` increment once |
| Correct at clue 3 | Advance twice, reveal options, choose Ada Lovelace | Terminal win with score 1 and distribution `1` increment once |
| Sudden death | At each clue stage, choose any distractor | Immediate terminal failure with score 0; no later actions accepted; distribution `0` increments once |
| Advance behavior | Advance from clue 1 and clue 2 without guessing | One clue revealed per action; available score changes 3 to 2 to 1; no fourth clue |
| Refresh persistence | Refresh before options, after requesting options, after advancing, and after a terminal result | Current progress restores; a terminal date remains non-replayable; statistics do not increment again |
| New-date handling | Seed yesterday's completed win and a skipped-date completed win separately, then complete today's controlled-date game | Today's matching puzzle starts at clue 1; cumulative stats remain; a consecutive win increments the streak and a skipped day resets it on completion |
| Missing puzzle | Load a local date absent from `data/puzzles.json` | Intentional empty state; no borrowed/duplicated puzzle and no game-state/stat mutation |
| Data/storage failure | Supply malformed puzzle data and malformed stored JSON separately | Clear non-playing or recovered state; page remains usable and no corrupted stats are written |
| Responsive/a11y | Inspect narrow mobile and desktop widths; complete flow with keyboard | No clipped controls or horizontal overflow; logical focus order, visible focus, labels/status readable without color alone |

## Recorded manual evidence

Walkthrough performed 2026-09-22 against a local `python3 -m http.server`
instance in a Chromium-based browser. Controlled dates used the local-only
`.qa/` harness date shim; all other scenarios ran on the real browser date,
which matched the fixture date `2026-09-22`.

| Scenario | Result | Observation |
| --- | --- | --- |
| Correct at clue 1 | Pass | `score 3`, `WON`, played 1 / wins 1, distribution `3` = 1, streak 1 |
| Correct at clue 2 | Pass | `score 2`, `WON`, distribution `2` = 1 |
| Correct at clue 3 | Pass | `score 1`, `WON`, distribution `1` = 1 |
| Sudden death, clue 1 | Pass | `score 0`, `FAILED`, distribution `0` = 1, streak 0, all guess controls removed |
| Sudden death, clue 2 | Pass | From a seeded 4-day streak: `FAILED`, streak 0, `maxStreak` held at 7 |
| Sudden death, clue 3 | Pass | `score 0`, `FAILED`, distribution `0` incremented once |
| Advance behavior | Pass | Clue 1 to 2 to 3 without guessing; worth fell 3 to 2 to 1; `played` stayed 0 until submission |
| No fourth clue | Pass | At clue 3 only "Request options" remains; the advance control is gone |
| Refresh, in progress | Pass | Clue 2 and the visible options grid both restored |
| Refresh, completed | Pass | Result panel preserved; no option or action controls; stats unchanged |
| Consecutive-day streak | Pass | Seeded win on 2026-09-21, win on 2026-09-22: streak 1 to 2, `maxStreak` 2 |
| Skipped-day streak reset | Pass | Seeded win on 2026-09-20, win on 2026-09-22: streak reset to 1, `maxStreak` held at 7 |
| Missing puzzle | Pass | Controlled dates 2026-09-23 and 2026-09-25 showed the unavailable state naming the date; no puzzle substituted, no stat mutation |
| Responsive | Pass | 375x812: controls and the eight-option grid stack full width, `scrollWidth === clientWidth` (no horizontal overflow). 1024x768: two-column game/stats layout |

Defects found and fixed during this walkthrough:

- The points unit was a static `pts`, so clue 3 rendered "1 pts". The renderer now
  selects `pt`/`pts` from the points on offer.
- The unavailable state read "Nothing to play today". It now uses the brief's
  intended forward-looking copy, "Tomorrow's puzzle is being prepared".

## Test data and environment

- Canonical fixture date: `2026-09-22`, with the single Ada Lovelace puzzle from issue #3.
- Automated checks are deterministic, offline, and supported by the installed Node runtime.
- Manual testing requires a current browser and a local static HTTP server because `fetch()` should not be assessed from a `file://` URL.
- No production services, real customer data, credentials, or destructive environments are permitted in routine verification.

## Known gaps and residual risk

- Browser-specific localStorage, responsive rendering, and focus behavior remain manual because the project intentionally has no browser-test dependency.
- Cross-browser coverage is limited to browsers exercised during the recorded manual walkthrough.
- Browser automation uses controlled test-only dates and storage; production code continues to derive the date from the player's browser.

## Independent audit gate

- Normal-risk contained behavior requires the smallest relevant regression tests and changed-scope verification; no independent audit is required by default.
- High- and critical-risk changes would require configured full profiles and a fresh-agent audit, but this milestone currently has no such route.
- Builder self-validation remains mandatory for every change.

## Maintenance rules

- Add a focused regression for every game or state defect unless automation is technically impossible.
- Do not mask flaky failures by rerunning until green; diagnose them.
- Update this profile when environments, contracts, risk, or test responsibilities change.
