# Hosting and launch handoff

This project is prepared for static hosting, but production hosting is not yet
configured. The final puzzle export, launch date range, hosting provider, custom
domain, and DNS provider remain client decisions. Do not describe the site as
launch-ready until those inputs are supplied and the release checks pass.

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

After the final puzzle export is available, validate its required continuous
date range explicitly:

```sh
npm run validate:puzzles -- --from YYYY-MM-DD --days NUMBER_OF_DAYS
```

The build validates structure and exact answer-option matching. The coverage
command additionally fails if any date in the requested launch window is
missing. It does not invent or duplicate puzzle content.

## Current hosting position

The repository is private and GitHub Pages is not configured; the read-only
Pages API check returned `404` on 29 September 2026. GitHub documents Pages as
available for public repositories on GitHub Free, while private repositories
require GitHub Pro, Team, or Enterprise. Keeping the repository private while
using GitHub Pages therefore depends on the repository owner's eligible paid
plan. Making the repository public is a separate client decision.

For a free-hosting route that keeps the source repository private, the client
can instead choose a static host under Mike's own account and upload `dist/` or
connect the repository after reviewing that host's permissions. No automatic
publishing workflow is included; a Git push does not deploy this project.

References:

- [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages)
- [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Pages custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)

## Domain and DNS inputs still required

No custom domain or DNS provider has been supplied. Before any domain setup,
obtain all of the following from the client:

- the exact domain or subdomain to publish, including whether the canonical URL
  should use the apex domain or `www`;
- the selected hosting provider and site/project owned by Mike;
- the DNS provider or registrar and confirmation that Mike controls it;
- the current DNS records for the chosen host name, so existing mail and web
  services are not overwritten;
- the desired redirect between apex and `www`, if both should resolve.

Add the domain in the selected host before changing DNS, then use only the DNS
targets that host provides. Do not invent a `CNAME`, add a repository `CNAME`
file, or alter DNS before these inputs and the hosting choice are confirmed.

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
