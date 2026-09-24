# Testing

How Milestones 1 and 2 were verified, and how to re-run that verification.

## Automated tests

```sh
npm test
```

The suite runs on Node's built-in test runner (Node 20+). There is no test
framework to install and no third-party dependency.

The tests cover the pure game rules plus session reconciliation, intro, sharing,
and preview helpers without requiring browser automation:

| Area | Covered |
| --- | --- |
| Scoring | Correct answer at clue 1, 2, 3 scores 3, 2, 1 |
| Sudden death | Wrong answer at every clue ends the day at 0 |
| Answer matching | Comparison is exact; `"ada lovelace"` loses |
| Clue flow | Advancing lowers the score on offer and stops at clue 3; revealing options locks the current clue |
| Replay | A finished day stays finished and is never counted twice |
| Restoration | An in-progress day restores its clue, answer grid, and clue lock |
| Streaks | Consecutive days, skipped days, losses, and abandoned days |
| Puzzle contract | Date format, three clues, eight distinct options, answer present |
| Stored state | Malformed and internally inconsistent saved data are rejected safely |
| Preview isolation | Preview load, reload, reset, enumeration, and failures stay separate from production storage |
| Preview replay data | Completed-game HUD values are read without changing saved state; malformed data falls back safely |
| Session reconciliation | Stale-tab actions, cross-tab progress, and local-date changes reconcile before play |
| Angela intro | Eligibility, per-date session keys, preload failure, reduced motion, caller-supplied score/streak values, focus containment, and restoration |
| Information dialog | Missing-element handling, header/footer triggers, close button, Escape dismissal, scroll lock, and focus restoration |
| Spoiler-free sharing | Win/loss copy, unfinished rejection, URL safety, native share, cancellation, direct copy, clipboard, and manual fallback |

## Manual verification

Serve the project (`python3 -m http.server 8000`) and use
`tools/preview/index.html` to place the app on any date without touching the
system clock.

The full game-flow walkthrough was performed 2026-09-22 in a Chromium-based
browser. A focused integration follow-up was performed 2026-09-23 in a
Chromium-based desktop preview browser, using the real page and two preview tabs
on a separate loopback origin.

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

### 2026-09-24 Milestone 2 follow-up

| Scenario | Result |
| --- | --- |
| Angela opener | Pass — the edited transparent host rendered with live `DAILY WHOAMIGAME`, `SCORE 0`, and `STREAK 0` visor text |
| Intro entrance and dissolve | Pass — a fresh preview run showed the backdrop fade and scale settle, then a continuous 900ms dissolve with the clue-one game visible beneath before the overlay was hidden |
| Intro dismissal | Pass — clicking Skip hid the modal, restored focus to the game title, and left the clue controls active |
| Intro keyboard behavior | Automated — Tab remains on Skip, Escape dismisses, and focus returns to the game title |
| Missing/broken intro asset | Automated — gameplay remains available and no broken image is rendered |
| Spoiler-free share copy | Automated — output contains only title/date/score/clue outcome and rejects an unfinished game |
| Copy result | Pass — a completed clue-2 result exposed the dedicated control and reported “Result copied to your clipboard.” in the browser |
| iPhone over LAN HTTP | Client check — the game completed with a 2-point clue-2 win and displayed the spoiler-free manual-copy fallback; the supplied screenshot confirms this result, but is not a comprehensive device test |
| Preview intro replay | Pass — replay showed the real Angela intro in a toolbar-free view over a completed clue-2 failure; after the dissolve, the failure and played 1 statistics were unchanged |
| Preview presentation recovery | Pass — Escape restored the preview controls after the intro, while the simulated date and isolated saved state remained active |
| Manual-copy fallback | Automated — clipboard denial returns the same spoiler-free manual-copy text in `tests/share.test.mjs`; the DOM textarea remains a browser integration path |
| Native OS share sheet | Client reports it works on a MacBook; browser was not specified. iPhone native sharing remains unverified pending an HTTPS test because LAN HTTP is not a secure context |
| Responsive M2 HUD/share layout | Pass — visually inspected at 390px mobile and 1280px desktop widths; Angela, the live visor, stage/score/streak HUD, share controls, and ad placeholder remained legible without overflow |
| Fullscreen intro background | Pass — visually inspected after moving the radial backdrop to the full overlay; the opener filled the viewport without a visible rectangular panel and retained its smooth dissolve |
| Information access from empty state | Pass — the information dialog opened from the missing-date page |
| Information dialog launch | Pass — both header and footer controls opened the same dialog |
| Information dialog layout and scroll | Pass — inspected at 390px and 1280px; the body scrolled through the legal text while the Close control remained visible |
| Information dialog dismissal | Pass — the Close button and Escape both closed the dialog; Escape returned focus to the control that opened it |
| Contact link | Pass — the support address resolves to `mailto:manofempire@yahoo.co.uk` |
| Clue lock and in-progress refresh | Pass — clue 2 options hid the next-clue action; refresh restored clue 2, the options, and the lock |
| Completed refresh | Pass — a correct clue-2 answer remained complete after refresh with played 1, wins 1, and score-distribution bucket 2 equal to 1 |
| Browser console | Pass — no errors were reported during the final information-dialog and game-flow checks |

The intro unit test supplies non-zero values (`score: 3`, `streak: 4`) and
asserts that both appear unchanged in the visor readout. Production wiring passes
the current daily `state.score` and locally persisted
`state.stats.currentStreak`; no cumulative score or remote statistics source is
assumed. Preview fixtures may seed those same fields to inspect other values.

### 2026-09-22 full flow

| Scenario | Result |
| --- | --- |
| Correct at clue 1 | Pass — score 3, played 1 / wins 1, distribution `3` incremented once |
| Correct at clue 2 | Pass — score 2, distribution `2` incremented once |
| Correct at clue 3 | Pass — score 1, distribution `1` incremented once |
| Wrong answer at clue 1, 2, and 3 | Pass — score 0, streak reset, all guess controls removed |
| Advancing without guessing | Pass — clue 1 to 2 to 3, score on offer falls 3 to 2 to 1; once options are revealed, later clues are unavailable |
| No fourth clue | Pass — at clue 3 the advance control is gone; an answer is required |
| Refresh mid-game | Pass — the clue, open options grid, and clue lock are restored |
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
