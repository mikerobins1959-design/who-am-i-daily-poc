# Hosting and launch handoff

This project is prepared for static hosting. The checked-in schedule contains
534 consecutive puzzles from `2026-10-20` through `2028-04-05`. Production
domain mapping, certificate issuance, and the live HTTPS deployment check remain
incomplete; do not describe the site as live until they pass.

## Production artifact

Node.js 20 or newer is required for the repository checks. The deployed site
has no runtime package dependencies.

```sh
npm run validate:puzzles
npm run build
```

`npm run build` validates `data/puzzles.json`, replaces `dist/`, and copies only
the explicit runtime allowlist in `tools/build-production.mjs`. The artifact
excludes tests, documentation, preview tools, repository metadata, development
scaffolding, user screenshots, and inactive/source artwork. It also includes an
empty `.nojekyll` file for compatibility with direct GitHub Pages publishing.
The build stamps the service worker cache version with a deterministic content
fingerprint, so a changed runtime artifact activates a fresh cache.

Validate the complete launch range explicitly:

```sh
npm run validate:puzzles -- --from 2026-10-20 --days 534
```

The build validates structure and exact answer-option matching. The coverage
command additionally fails if any date in the requested launch window is
missing. It does not invent or duplicate puzzle content.

## Current hosting position

`netlify.toml` configures Node 20, validates the full date range, builds the
allowlisted artifact, and publishes `dist/`. A Git-connected deployment still
requires the release branch to be pushed and selected in the existing
Mike-owned Netlify site, `dulcet-bonbon-2c2a71.netlify.app`. The prepared
release branch is `codex/milestone-3`; select that branch for the production
deployment after it is available on GitHub.

## Domain and DNS status

The production domain is `thewhoamigame.games`, with `www.thewhoamigame.games`
as the additional host, and Namecheap provides DNS. Mike has configured:

- ALIAS `@` → `apex-loadbalancer.netlify.com`
- CNAME `www` → `dulcet-bonbon-2c2a71.netlify.app`

DNS resolved to Netlify on 30 September 2026. At that check, the Netlify host
and both custom hosts returned `404`, while the custom hosts presented a
certificate hostname mismatch. The remaining hosting work is to publish the
Milestone 3 artifact from the selected branch, confirm both custom domains are
attached to that same Netlify site, and wait for Netlify to provision a matching
certificate. Do not add different DNS targets unless Netlify reports that the
current records are invalid.

## Installable and offline behaviour

The production artifact includes a web app manifest, install icons, and a scoped
service worker. All application URLs are relative, so the same artifact works at
a domain root or a project subpath such as `/who-am-i-daily-poc/`.

- On iPhone or iPad, open the HTTPS site in Safari and use **Share → Add to Home
  Screen**.
- On supported Android browsers, use the browser's install prompt or **Install
  app** menu action.
- Installation and service workers require HTTPS, except on browser-recognised
  local development origins such as `localhost`.
- The first visit still needs a network connection. Offline loading is available
  only after the service worker has installed and cached the shell and at least
  one validated puzzle response.
- Puzzle data uses a network-first strategy. A valid same-day data refresh can
  update the cached puzzle file, while in-progress and completed game state stays
  in Local Storage. Refreshing or installing the app does not reset that state.
- If the network response is unavailable or invalid, the last validated cached
  puzzle data is used. A player cannot replay a completed daily game.

For each release, confirm the generated service worker fingerprint changes when
runtime assets change, run the release checks, serve `dist/` at both `/` and a
project subpath, and verify install, reload, same-day progress, offline reload,
and the intentional missing-date state before publishing.

Native iOS Add to Home Screen, standalone offline use, sharing, and service-worker
updates passed the accepted iOS Simulator release checks documented in
`TESTING.md`. A physical iPhone check was not performed and is not a release
blocker. Mike will perform the Android install, offline, and sharing follow-up;
that client check also does not block publishing this branch. Native sharing on
the actual production HTTPS URL and the live domain/certificate state still need
verification after deployment.
