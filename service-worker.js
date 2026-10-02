import { validatePuzzles } from "./js/game.js";

export const CACHE_VERSION = "milestone-3-v1";
export const PUZZLES_PATH = "./data/puzzles.json";
export const SHELL_PATHS = Object.freeze([
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./assets/angela-final.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon-180.png",
  "./js/app.js",
  "./js/config.js",
  "./js/game.js",
  "./js/info.js",
  "./js/intro.js",
  "./js/pwa.js",
  "./js/session.js",
  "./js/share.js",
]);

export function getScopedUrl(path, scopeUrl) {
  return new URL(path, scopeUrl).href;
}

export function getCacheNames(scopeUrl, version = CACHE_VERSION) {
  const scopePath = new URL(scopeUrl).pathname;
  const scopeKey = encodeURIComponent(scopePath).replaceAll("%", "_");
  const prefix = `who-am-i-daily:${scopeKey}:`;

  return {
    prefix,
    shell: `${prefix}shell:${version}`,
    // Keep the last validated dataset across shell updates. An install that
    // cannot reach the network must not delete otherwise usable offline data.
    data: `${prefix}puzzles`,
  };
}

export function isExcludedRequest(input) {
  const url = new URL(typeof input === "string" ? input : input.url);
  const isPreviewPath = /\/tools\/preview(?:\/|$)/.test(url.pathname);
  return (
    url.protocol === "about:" ||
    isPreviewPath ||
    url.searchParams.has("preview") ||
    url.searchParams.has("review")
  );
}

export function shouldHandleRequest(request, scopeUrl) {
  if (request.method !== "GET" || isExcludedRequest(request)) return false;

  const requestUrl = new URL(request.url);
  const scope = new URL(scopeUrl);
  return requestUrl.origin === scope.origin && requestUrl.pathname.startsWith(scope.pathname);
}

export async function isValidPuzzleResponse(response) {
  if (!response?.ok) return false;

  try {
    const puzzles = await response.clone().json();
    return validatePuzzles(puzzles).valid;
  } catch {
    return false;
  }
}

export async function getPuzzleResponse(
  request,
  { scopeUrl, cacheStorage, fetchImpl, version = CACHE_VERSION },
) {
  const puzzleUrl = getScopedUrl(PUZZLES_PATH, scopeUrl);
  const { data } = getCacheNames(scopeUrl, version);
  let networkResponse = null;

  try {
    networkResponse = await fetchImpl(request);
    if (await isValidPuzzleResponse(networkResponse)) {
      try {
        const cache = await cacheStorage.open(data);
        await cache.put(puzzleUrl, networkResponse.clone());
      } catch {
        // Storage restrictions must not block a valid online response.
      }
      return networkResponse;
    }
  } catch {
    // The last validated response remains available for offline play.
  }

  try {
    const cache = await cacheStorage.open(data);
    const cachedResponse = await cache.match(puzzleUrl);
    if (await isValidPuzzleResponse(cachedResponse)) return cachedResponse;
    if (cachedResponse) await cache.delete(puzzleUrl);
  } catch {
    // Continue to the online response or the honest unavailable error below.
  }
  if (networkResponse) return networkResponse;

  throw new TypeError("Puzzle data is unavailable offline.");
}

export async function installAppShell({
  scopeUrl,
  cacheStorage,
  fetchImpl,
  version = CACHE_VERSION,
}) {
  const names = getCacheNames(scopeUrl, version);
  const shellCache = await cacheStorage.open(names.shell);
  await shellCache.addAll(SHELL_PATHS.map((path) => getScopedUrl(path, scopeUrl)));

  const puzzleUrl = getScopedUrl(PUZZLES_PATH, scopeUrl);
  try {
    const response = await fetchImpl(puzzleUrl, { cache: "no-store" });
    if (await isValidPuzzleResponse(response)) {
      try {
        const dataCache = await cacheStorage.open(names.data);
        await dataCache.put(puzzleUrl, response.clone());
      } catch {
        // The application remains usable online when browser storage is blocked.
      }
    }
  } catch {
    // The shell may install even if the data request is temporarily unavailable.
  }
}

export async function activateCurrentCaches({
  scopeUrl,
  cacheStorage,
  version = CACHE_VERSION,
}) {
  const current = getCacheNames(scopeUrl, version);
  const keys = await cacheStorage.keys();
  const obsolete = keys.filter(
    (key) => key.startsWith(current.prefix) && key !== current.shell && key !== current.data,
  );
  await Promise.all(obsolete.map((key) => cacheStorage.delete(key)));
}

export async function getShellResponse(
  request,
  { scopeUrl, cacheStorage, fetchImpl, version = CACHE_VERSION },
) {
  const { shell } = getCacheNames(scopeUrl, version);
  const cache = await cacheStorage.open(shell);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  if (request.mode === "navigate") {
    const index = await cache.match(getScopedUrl("./index.html", scopeUrl));
    if (index) return index;
  }

  return fetchImpl(request);
}

export function setupServiceWorker(worker) {
  const scopeUrl = worker.registration.scope;
  const puzzleUrl = new URL(PUZZLES_PATH, scopeUrl);
  const shellUrls = new Set(SHELL_PATHS.map((path) => getScopedUrl(path, scopeUrl)));

  worker.addEventListener("install", (event) => {
    event.waitUntil(
      installAppShell({
        scopeUrl,
        cacheStorage: worker.caches,
        fetchImpl: worker.fetch.bind(worker),
      }),
    );
  });

  worker.addEventListener("activate", (event) => {
    event.waitUntil(activateCurrentCaches({ scopeUrl, cacheStorage: worker.caches }));
  });

  worker.addEventListener("fetch", (event) => {
    const { request } = event;
    if (!shouldHandleRequest(request, scopeUrl)) return;

    const url = new URL(request.url);
    if (url.origin === puzzleUrl.origin && url.pathname === puzzleUrl.pathname) {
      event.respondWith(
        getPuzzleResponse(request, {
          scopeUrl,
          cacheStorage: worker.caches,
          fetchImpl: worker.fetch.bind(worker),
        }),
      );
      return;
    }

    const canonicalUrl = new URL(request.url);
    canonicalUrl.search = "";
    if (request.mode === "navigate" || shellUrls.has(canonicalUrl.href)) {
      event.respondWith(
        getShellResponse(request, {
          scopeUrl,
          cacheStorage: worker.caches,
          fetchImpl: worker.fetch.bind(worker),
        }),
      );
    }
  });
}

const worker =
  typeof globalThis.registration?.scope === "string" &&
  typeof globalThis.addEventListener === "function" &&
  globalThis.caches
    ? globalThis
    : null;

if (worker) setupServiceWorker(worker);
