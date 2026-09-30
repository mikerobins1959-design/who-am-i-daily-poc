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
| Client dataset import | Exact source conversion, deterministic category mixing, repeat spacing, duplicate handling, consecutive dates, and committed-output reproduction |

## Manual verification

Serve the project (`python3 -m http.server 8000`) and use
`tools/preview/index.html` to place the app on any date without touching the
system clock.

### 2026-09-30 native iOS Simulator PWA follow-up

Environment: Xcode 26.6 iOS Simulator, dedicated **iPhone 17 Pro** device
(`WhoAmI QA · iPhone 17 Pro`), **iOS 26.5 (23F77)**, real Mobile Safari and a
Home Screen web app (`com.apple.webapp`). Tested commit `6df0779`; `npm test`
passed 82/82 and `npm run build` reproduced the committed fingerprint
`build-b0721e4b2611`.

Origin: `http://127.0.0.1:4320/` (loopback, a browser secure context), served
at the domain root from an ignored fixture in `.review/ios-sim-2026-09-30/`.
The fixture copies `dist/` unchanged except for an injected test-only page clock
starting at `2026-10-20 12:00` local time, a visible version label, and a
per-version service-worker fingerprint (`iossim-a-…` / `iossim-b-…`). Production
dates, puzzle data, and `dist/` were not modified. The fixture server sends
`max-age=0, must-revalidate`, matching `netlify.toml`.

| Check | Result |
| --- | --- |
| 1. Safari installation | **Pass** — Safari loaded the 20/10/2026 Denzel Washington puzzle; the server log showed `service-worker.js` followed by the full shell and `data/puzzles.json` precache. Safari **••• → Share → View More → Add to Home Screen** proposed the name “Who Am I ?”, the app icon, and *Open as Web App* enabled. The Home Screen showed the icon labelled “Who Am I ?” |
| 2. Standalone launch | **Pass** — the Home Screen icon opened the app with no Safari address bar or toolbar. At rest, content sat below the status bar/Dynamic Island, and the footer FAQ button cleared the home-indicator area. Page scrolling worked. The Info dialog opened below the status bar, its body scrolled through FAQ, contact, social links, and disclaimer while Close stayed visible, and Close returned to the same scroll position |
| 3. Saved progress | **Pass** — Reveal next clue → Clue 2, then Reveal Multiple Choices showed eight choices and removed *Reveal next clue*. After the app was closed from the app switcher (no `com.apple.webapp` process remained) and reopened (new PID), it restored Clue 2 of 3, worth 2 pts, the same eight choices in the same order, and no further-clue control |
| 4. Offline cold launch | **Pass** — the only server process for the origin was stopped; `lsof` showed nothing listening on port 4320 and `curl` failed with connection refused. The installed app was closed from the app switcher, its process was confirmed gone, and it was relaunched from the Home Screen as a new process. It loaded the shell, puzzle, and saved Clue 2 state offline. Selecting Denzel Washington showed “Correct” for 2 points with played 1 / wins 1 / current streak 1 / best streak 1 / distribution `2:1`. A second offline process kill and relaunch showed the completed result, no answer controls, and unchanged statistics |
| 5. Native sharing | **Pass (loopback)** — the game's **Share result** button opened the native iOS share sheet with a text item titled “Who Am I ? Daily — 20/10/2026”. Tapping outside the sheet cancelled it; the result, both buttons, and statistics remained usable. **Copy result** separately showed “Result copied to your clipboard.” and `simctl pbpaste` read exactly `Who Am I ? Daily — 20/10/2026` / `Solved on clue 2 of 3 · 2/3 points` (a sentinel was placed first). Re-opening Share result and choosing the sheet's local Copy action showed “Result shared.” with identical text. No answer, clues, options, streak, or URL were included, and nothing was sent |
| 6. App update | **Pass** — with the app closed, connectivity was restored by serving version B (`iossim-b-build-b0721e4b2611`) on the same origin. The first reopen still showed Version A while the server log showed B's worker and full shell precache (installed, waiting). After another app-switcher close and reopen, the page showed “Version B · update marker” with the completed 2-point result and played 1 / wins 1 / streaks 1 / distribution `2:1` preserved |

Observations (not defects):

- The Home Screen app did not reuse Safari's service worker. On its first
  launch it re-downloaded the shell and registered its own worker, so a
  player's first launch of the installed app must be online. Whether iOS copies
  Safari's Local Storage into the installed app was not tested, because no
  Safari progress existed before installation.
- In standalone mode the status bar is translucent. Scrolled content passes
  beneath the clock (the page uses neither `viewport-fit=cover` nor
  `env(safe-area-inset-*)`). Nothing is clipped at rest; this is cosmetic.
- The first standalone launch showed a blank white screen for a few seconds
  before first paint in the simulator. Later cold launches, including offline
  ones, rendered normally.

Limits of this evidence:

- This is simulator evidence, not a physical iPhone. The six simulator checks
  are accepted for this release; a physical-iPhone repeat was not performed and
  is not a release blocker. Individual messaging targets were not exercised.
- Sharing was verified on a loopback secure context, where the game correctly
  omits the page URL. The HTTPS production payload, which appends the clean
  public URL, remains unverified on iOS.
- Android was out of scope and remains unverified. Mike will perform that
  non-blocking client follow-up.

The fixture, its README, and the 25 screenshots (`screenshots/00-…` to
`24-…`) are kept locally in the ignored `.review/ios-sim-2026-09-30/`
directory and are not part of the repository or production build.

### 2026-09-30 production dataset follow-up

| Scenario | Result |
| --- | --- |
| Corrected source import | Pass — 534 corrected source records produced 534 runtime puzzles with no exact duplicate content removed |
| Schedule coverage | Pass — every local date from `2026-10-20` through `2028-04-05` is present exactly once |
| Category and identity spacing | Pass — source order is retained within each category, adjacent days do not share a category, and repeated answer labels are at least 31 days apart |
| First scheduled game | Pass — desktop in-app browser preview loaded Denzel Washington on `2026-10-20`; advancing to clue 2, revealing eight choices, and selecting the correct answer awarded 2 points with played 1 / wins 1 / streak 1 |
| Final scheduled game | Pass — desktop in-app browser preview loaded Belisarius on `2028-04-05` |
| Prelaunch state | Pass — the normal page on `30/09/2026` and preview on `2026-10-19` both named the `20/10/2026` launch date |
| Date after schedule | Pass — desktop in-app browser preview showed the intentional unavailable state on `2028-04-06` |

The browser walkthrough used the isolated date preview and is not native-device
evidence. Native iOS and Android installation, standalone offline use, and share
sheet checks remain pending. The screenshot is retained locally at
`.review/m3-import-launch-result.png` and is excluded from the repository.

### 2026-09-29 phone-viewport completion follow-up

| Scenario | Result |
| --- | --- |
| In-progress clue restoration | Pass — in an isolated version B fixture dated 2026-09-22, advancing to clue 2, revealing the eight choices, and refreshing restored clue 2 and the same choices; the next-clue action remained unavailable |
| Offline completion | Pass — after stopping the fixture server, reload retained the playable game; selecting Ada Lovelace produced a 2-point win and played 1 / wins 1 / current streak 1 / best streak 1 / distribution `2:1` |
| Completed offline reload | Pass — refreshing the completed result retained it without replaying or incrementing statistics again |
| Share result fallback | Pass — the result share action displayed “Result copied to clipboard”; the Copy result control displayed the same confirmation |
| Visual result state | Pass — screenshot showed the result, share/copy buttons, and statistics clearly |
| Native device coverage | Pending — this was UIAnnotate Chromium at an iPhone 16 Pro viewport (402×874), not native iOS; Home Screen installation, standalone offline use, and the native share sheet remain unverified. Android device coverage also remains pending |

This follow-up used the isolated ignored `.review` fixture `fixture4192` with
version B. The local Python fixture server (PID 85623) was stopped before the
offline reload checks. Clipboard contents were not independently inspected;
the browser confirmation is the observed evidence.

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
| Stable daily option shuffle | Pass — the 22/09/2026 sample displayed Ada Lovelace sixth rather than first; refresh preserved all eight choices in the same order, clue 1, and the option lock; selecting Ada then produced the expected 3-point win with played 1 / wins 1 / streak 1 |
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
