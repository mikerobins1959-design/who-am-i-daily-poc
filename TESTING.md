# Testing

How Milestone 1 was verified, and how to re-run that verification.

## Automated tests

```sh
npm test
```

The suite runs on Node's built-in test runner (Node 20+). There is no test
framework to install and no third-party dependency.

The tests target `js/game.js`, which holds the rules as pure functions with no
DOM or storage access, so every rule can be asserted directly:

| Area | Covered |
| --- | --- |
| Scoring | Correct answer at clue 1, 2, 3 scores 3, 2, 1 |
| Sudden death | Wrong answer at every clue ends the day at 0 |
| Answer matching | Comparison is exact; `"ada lovelace"` loses |
| Clue flow | Advancing lowers the score on offer and stops at clue 3 |
| Replay | A finished day stays finished and is never counted twice |
| Restoration | An in-progress day restores its clue and options visibility |
| Streaks | Consecutive days, skipped days, losses, and abandoned days |
| Puzzle contract | Date format, three clues, eight distinct options, answer present |
| Stored state | Malformed and internally inconsistent saved data are rejected safely |
| Preview isolation | Preview load, reload, reset, enumeration, and failures stay separate from production storage |
| Session reconciliation | Stale-tab actions, cross-tab progress, and local-date changes reconcile before play |

## Manual verification

Serve the project (`python3 -m http.server 8000`) and use
`tools/preview/index.html` to place the app on any date without touching the
system clock.

The full game-flow walkthrough was performed 2026-09-22 in a Chromium-based
browser. A focused integration follow-up was performed 2026-09-23 in the Codex
in-app browser, using the real page and two preview tabs on a separate loopback
origin.

### 2026-09-23 integration follow-up

| Scenario | Result |
| --- | --- |
| Real local date with no puzzle | Pass — the normal page showed the intentional 2026-09-23 unavailable state and zeroed statistics |
| Three-point win | Pass — preview tab A requested options and selected Ada Lovelace on clue 1; the result was 3 points with played 1 / wins 1 |
| Concurrent-tab replay protection | Pass — preview tab B automatically reconciled to tab A's terminal result, removed all guess controls, and retained one recorded play |
| Completed-game reload | Pass — reloading preview tab A preserved the selected 2026-09-22 fixture date, terminal win, and statistics |
| Preview isolation | Pass — preview statistics remained at played 1 while the normal 2026-09-23 page remained at played 0 |

The midnight boundary is covered through the deterministic session-reconciliation
seam in `tests/session.test.mjs`. It was not claimed as a wall-clock manual test.

### 2026-09-22 full flow

| Scenario | Result |
| --- | --- |
| Correct at clue 1 | Pass — score 3, played 1 / wins 1, distribution `3` incremented once |
| Correct at clue 2 | Pass — score 2, distribution `2` incremented once |
| Correct at clue 3 | Pass — score 1, distribution `1` incremented once |
| Wrong answer at clue 1, 2, and 3 | Pass — score 0, streak reset, all guess controls removed |
| Advancing without guessing | Pass — clue 1 to 2 to 3, score on offer falls 3 to 2 to 1 |
| No fourth clue | Pass — at clue 3 the advance control is gone; an answer is required |
| Refresh mid-game | Pass — clue and the open options grid both restored |
| Refresh after finishing | Pass — result preserved, no controls, statistics unchanged |
| Consecutive-day win | Pass — streak 1 to 2, best streak follows |
| Skipped day | Pass — streak restarts at 1, best streak retained |
| Date with no puzzle | Pass — unavailable state naming the date, no puzzle substituted |
| Mobile, 375x812 | Pass — controls and the option grid stack full width, no horizontal overflow |
| Desktop, 1024x768 | Pass — two-column game and statistics layout |
| Preview storage isolation | Pass — open, reload, seeded load, and reset leave the normal game save unchanged |

Two defects were found and fixed during this walkthrough: the points unit was
fixed text, so clue 3 read "1 pts"; and the score-distribution bars were never
given a width, so they always rendered empty.

## Notes and known gaps

- Browser behaviour, layout, and focus are verified by hand because the project
  intentionally carries no browser-test dependency.
- Cross-browser coverage is limited to the browser used in the walkthrough above.
- Tests take the date as an argument rather than reading the machine clock, and
  operate on explicit state objects rather than a real `localStorage`.
