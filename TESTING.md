# Testing

How Milestones 1–3 were verified, and how to re-run that verification.

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
| Date presentation | Valid local date keys display as UK `DD/MM/YYYY`; matching and storage remain `YYYY-MM-DD` |
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
| Production packaging | Invalid JSON fails closed; only allowlisted runtime files enter `dist/`; source artwork, tests, docs, and previews stay out |
| Hosting paths | Page, manifest, icons, scripts, worker scope, and data paths remain relative for domain-root and GitHub project-subpath hosting |
| Development server | Public app paths, browser MIME types, host/port options, and rejection of traversal or private repository paths |

## Manual verification

Serve the project (`python3 -m http.server 8000`) and use
`tools/preview/index.html` to place the app on any date without touching the
system clock.

### 2026-09-29 Milestone 3 packaging follow-up

| Scenario | Result |
| --- | --- |
| Production artifact online | Pass — the allowlisted `dist/` artifact loaded at the domain root on loopback, refreshed successfully, and reported no browser console errors |
| GitHub project subpath | Pass — the same artifact loaded and refreshed at `/who-am-i-daily-poc/` with zero console warnings or errors |
| Offline reload | Pass — after one connected visit and service-worker installation, stopping the server and reloading rendered the correct local `29/09/2026` missing-puzzle state and retained statistics |
| Offline information | Pass — the FAQ dialog opened from the offline missing-puzzle state and included the installation directions |
| In-progress update | Pass — at the stable `/who-am-i-daily-poc/` scope, version A restored clue 2 with its answer choices visible; publishing version B installed a waiting worker without interrupting the active session |
| Update activation and state | Pass — after closing the only controlled browser client and reopening, the visible version B marker loaded with the same clue 2 choices and played count 0 |
| Offline completion after update | Pass — with the server stopped, version B reloaded from its caches, accepted the correct Ada Lovelace answer for 2 points, and recorded played 1 / wins 1 / streak 1 / best 1 / distribution 2:1 |
| Completed offline reload | Pass — another offline reload preserved the completed result and prevented replay |
| iPhone Safari visual render | Pass — the simulator rendered at a phone viewport; browser control could not reach the page accessibility tree, so this is visual evidence only |
| Actual-device installation | Pending — manifest, icons, worker scope, and offline caching are covered by automated and desktop-browser checks; Add to Home Screen, standalone offline use, and secure-context native sharing still require compatible device checks |
| Android device coverage | Pending — no Android emulator, `adb`, Android SDK emulator, or configured virtual device was available in the test environment |

Project-subpath browser verification is performed against an ignored fixture at
`.review/pwa-test-root/who-am-i-daily-poc/`. This exercises the same `dist/`
artifact without changing production sources or repository history. After the
server stopped, the subpath also reloaded offline to the correct missing-puzzle
state and retained a functional FAQ dialog.

The update walkthrough used the ignored `.review/m3-simulator/` fixture at the
same loopback origin and project-subpath scope for both versions. Its test-only
page clock selects the existing `2026-09-22` sample without changing production
code or puzzle data. Version A and B differ by a visible fixture marker and
service-worker fingerprint, which makes the waiting-worker transition
observable while keeping Local Storage and worker scope stable. Evidence from
the final offline state is retained locally at
`.review/m3-update-offline-proof.png`; it is not part of the repository.

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

### 2026-09-25 final-polish follow-up

| Scenario | Result |
| --- | --- |
| UK date and approved titles | Pass — the game displayed `22/09/2026` and the approved `Who Am I ?` titles at 320px, 390px, and 1280px |
| Responsive final HUD | Pass — brighter labels remained legible without overlap or horizontal overflow at 320×740, 390px, and 1280px |
| Final Angela artwork | Pass — the client-supplied image, edge blend, and live score/streak values rendered correctly on mobile |
| Dynamic intro values | Pass — replay after a completed game displayed earned score 2 and current streak 1 without changing the saved result |
| Social links | Pass — Instagram and TikTok used the supplied profile URLs with safe new-tab attributes |
| Clue lock and completion persistence | Pass — clue 2 choices locked further clues; a 2-point win survived refresh with played 1 and wins 1 |
| Review control isolation | Pass — during intro replay the accessibility tree exposed only the intro and Skip control; review controls returned afterward |

The release profile passed all 60 automated tests after these changes. Clipboard
payload and fallback behaviour remain covered by `tests/share.test.mjs`; this
browser check did not independently confirm the operating system clipboard.

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
