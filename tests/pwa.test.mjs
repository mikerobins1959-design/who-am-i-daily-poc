import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CACHE_VERSION,
  PUZZLES_PATH,
  SHELL_PATHS,
  activateCurrentCaches,
  getCacheNames,
  getPuzzleResponse,
  getScopedUrl,
  getShellResponse,
  installAppShell,
  isExcludedRequest,
  shouldHandleRequest,
} from "../service-worker.js";
import { getServiceWorkerUrl, registerPwa, shouldRegisterPwa } from "../js/pwa.js";

const validPuzzles = [
  {
    date: "2026-09-22",
    answer: "Ada Lovelace",
    clues: ["Clue one", "Clue two", "Clue three"],
    options: [
      "Ada Lovelace",
      "Grace Hopper",
      "Marie Curie",
      "Rosalind Franklin",
      "Emmy Noether",
      "Katherine Johnson",
      "Florence Nightingale",
      "Joan Clarke",
    ],
  },
];

class MemoryCache {
  constructor() {
    this.entries = new Map();
    this.added = [];
  }

  async addAll(urls) {
    this.added.push(...urls);
    await Promise.all(urls.map((url) => this.put(url, new Response(`shell:${url}`))));
  }

  async put(input, response) {
    this.entries.set(toKey(input), response);
  }

  async match(input, { ignoreSearch = false } = {}) {
    const key = toKey(input, ignoreSearch);
    for (const [candidate, response] of this.entries) {
      if (toKey(candidate, ignoreSearch) === key) return response.clone();
    }
    return undefined;
  }

  async delete(input) {
    return this.entries.delete(toKey(input));
  }
}

class MemoryCacheStorage {
  constructor() {
    this.caches = new Map();
  }

  async open(name) {
    if (!this.caches.has(name)) this.caches.set(name, new MemoryCache());
    return this.caches.get(name);
  }

  async keys() {
    return [...this.caches.keys()];
  }

  async delete(name) {
    return this.caches.delete(name);
  }
}

function toKey(input, ignoreSearch = false) {
  const value = typeof input === "string" ? input : input.url;
  const url = new URL(value);
  if (ignoreSearch) url.search = "";
  return url.href;
}

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

test("registration resolves the worker relative to root and GitHub project paths", async () => {
  assert.equal(
    getServiceWorkerUrl("https://example.test/js/pwa.js").href,
    "https://example.test/service-worker.js",
  );
  assert.equal(
    getServiceWorkerUrl("https://example.test/who-am-i/js/pwa.js").href,
    "https://example.test/who-am-i/service-worker.js",
  );

  const calls = [];
  const registration = { active: true };
  const navigatorApi = {
    serviceWorker: {
      async register(url, options) {
        calls.push({ url: url.href, options });
        return registration;
      },
    },
  };

  assert.equal(
    await registerPwa({
      navigatorApi,
      locationUrl: "https://example.test/who-am-i/",
      isTopLevel: true,
      moduleUrl: "https://example.test/who-am-i/js/pwa.js",
    }),
    registration,
  );
  assert.deepEqual(calls, [
    {
      url: "https://example.test/who-am-i/service-worker.js",
      options: { type: "module", updateViaCache: "none" },
    },
  ]);
});

test("registration and fetch handling exclude preview, review, iframe, and outside-scope requests", () => {
  const navigatorApi = { serviceWorker: {} };
  assert.equal(
    shouldRegisterPwa({
      navigatorApi,
      locationUrl: "https://example.test/game/",
      isTopLevel: true,
    }),
    true,
  );

  for (const [locationUrl, isTopLevel] of [
    ["about:srcdoc", false],
    ["https://example.test/game/tools/preview/", true],
    ["https://example.test/game/?review=build", true],
    ["https://example.test/game/?preview=1", true],
    ["https://example.test/game/", false],
  ]) {
    assert.equal(shouldRegisterPwa({ navigatorApi, locationUrl, isTopLevel }), false);
  }

  const scopeUrl = "https://example.test/game/";
  assert.equal(
    shouldHandleRequest(new Request("https://example.test/game/index.html"), scopeUrl),
    true,
  );
  assert.equal(
    shouldHandleRequest(new Request("https://example.test/game/tools/preview/"), scopeUrl),
    false,
  );
  assert.equal(
    shouldHandleRequest(new Request("https://example.test/game/index.html?review=1"), scopeUrl),
    false,
  );
  assert.equal(
    shouldHandleRequest(new Request("https://example.test/other/index.html"), scopeUrl),
    false,
  );
  assert.equal(isExcludedRequest("https://example.test/game/data/puzzles.json?preview=1"), true);
});

test("shell URLs and cache namespaces stay inside their registration scope", () => {
  const rootScope = "https://example.test/";
  const projectScope = "https://example.test/who-am-i/";

  assert.equal(getScopedUrl("./index.html", rootScope), "https://example.test/index.html");
  assert.equal(
    getScopedUrl("./index.html", projectScope),
    "https://example.test/who-am-i/index.html",
  );
  assert.notEqual(getCacheNames(rootScope).shell, getCacheNames(projectScope).shell);
  assert.match(getCacheNames(projectScope).shell, new RegExp(`${CACHE_VERSION}$`));
  assert.equal(
    getCacheNames(projectScope, "old").data,
    getCacheNames(projectScope, "new").data,
  );
});

test("install precaches only scoped shell paths and seeds only validated puzzle data", async () => {
  const scopeUrl = "https://example.test/project/";
  const cacheStorage = new MemoryCacheStorage();
  await installAppShell({
    scopeUrl,
    cacheStorage,
    fetchImpl: async () => jsonResponse(validPuzzles),
  });

  const names = getCacheNames(scopeUrl);
  const shell = await cacheStorage.open(names.shell);
  assert.deepEqual(shell.added, SHELL_PATHS.map((path) => getScopedUrl(path, scopeUrl)));
  assert.equal(shell.added.some((url) => url.includes("tools/preview")), false);
  assert.equal(shell.added.some((url) => new URL(url).searchParams.has("review")), false);

  const data = await cacheStorage.open(names.data);
  const cached = await data.match(getScopedUrl(PUZZLES_PATH, scopeUrl));
  assert.deepEqual(await cached.json(), validPuzzles);

  const invalidStorage = new MemoryCacheStorage();
  await installAppShell({
    scopeUrl,
    cacheStorage: invalidStorage,
    fetchImpl: async () => jsonResponse([{ date: "not-a-date" }]),
  });
  const invalidData = await invalidStorage.open(names.data);
  assert.equal(await invalidData.match(getScopedUrl(PUZZLES_PATH, scopeUrl)), undefined);
});

test("puzzle requests prefer fresh valid data and fall back to the last valid response", async () => {
  const scopeUrl = "https://example.test/game/";
  const puzzleUrl = getScopedUrl(PUZZLES_PATH, scopeUrl);
  const request = new Request(puzzleUrl);
  const cacheStorage = new MemoryCacheStorage();

  const fresh = await getPuzzleResponse(request, {
    scopeUrl,
    cacheStorage,
    fetchImpl: async () => jsonResponse(validPuzzles),
  });
  assert.deepEqual(await fresh.json(), validPuzzles);

  const offline = await getPuzzleResponse(request, {
    scopeUrl,
    cacheStorage,
    fetchImpl: async () => {
      throw new TypeError("offline");
    },
  });
  const offlinePuzzles = await offline.json();
  assert.deepEqual(offlinePuzzles, validPuzzles);
  assert.equal(offlinePuzzles.some((puzzle) => puzzle.date === "2026-09-23"), false);

  const invalidNetwork = await getPuzzleResponse(request, {
    scopeUrl,
    cacheStorage,
    fetchImpl: async () => jsonResponse([{ date: "not-a-date" }]),
  });
  assert.deepEqual(await invalidNetwork.json(), validPuzzles);
});

test("an installed shell serves an offline navigation within a project subpath", async () => {
  const scopeUrl = "https://example.test/who-am-i/";
  const cacheStorage = new MemoryCacheStorage();
  await installAppShell({
    scopeUrl,
    cacheStorage,
    fetchImpl: async () => jsonResponse(validPuzzles),
  });

  const response = await getShellResponse(
    { url: "https://example.test/who-am-i/", mode: "navigate" },
    {
      scopeUrl,
      cacheStorage,
      fetchImpl: async () => {
        throw new TypeError("offline");
      },
    },
  );

  assert.equal(await response.text(), "shell:https://example.test/who-am-i/");
});

test("an invalid cached puzzle is discarded instead of being served offline", async () => {
  const scopeUrl = "https://example.test/game/";
  const puzzleUrl = getScopedUrl(PUZZLES_PATH, scopeUrl);
  const cacheStorage = new MemoryCacheStorage();
  const names = getCacheNames(scopeUrl);
  const data = await cacheStorage.open(names.data);
  await data.put(puzzleUrl, jsonResponse([{ date: "not-a-date" }]));

  await assert.rejects(
    getPuzzleResponse(new Request(puzzleUrl), {
      scopeUrl,
      cacheStorage,
      fetchImpl: async () => {
        throw new TypeError("offline");
      },
    }),
    /unavailable offline/,
  );
  assert.equal(await data.match(puzzleUrl), undefined);
});

test("a valid online puzzle remains usable when browser cache writes fail", async () => {
  const scopeUrl = "https://example.test/game/";
  const response = await getPuzzleResponse(
    new Request(getScopedUrl(PUZZLES_PATH, scopeUrl)),
    {
      scopeUrl,
      cacheStorage: {
        async open() {
          return {
            async put() {
              throw new Error("quota exceeded");
            },
          };
        },
      },
      fetchImpl: async () => jsonResponse(validPuzzles),
    },
  );

  assert.deepEqual(await response.json(), validPuzzles);
});

test("activation deletes obsolete caches only for the current scope", async () => {
  const scopeUrl = "https://example.test/game/";
  const cacheStorage = new MemoryCacheStorage();
  const current = getCacheNames(scopeUrl);
  const old = getCacheNames(scopeUrl, "old");
  const otherScope = getCacheNames("https://example.test/other/", "old");

  await Promise.all([
    cacheStorage.open(current.shell),
    cacheStorage.open(current.data),
    cacheStorage.open(old.shell),
    cacheStorage.open(otherScope.shell),
  ]);
  await activateCurrentCaches({ scopeUrl, cacheStorage });

  assert.deepEqual(new Set(await cacheStorage.keys()), new Set([
    current.shell,
    current.data,
    otherScope.shell,
  ]));
});

test("the worker leaves updates waiting instead of forcing a running game to reload", async () => {
  const source = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /skipWaiting\s*\(/);
  assert.doesNotMatch(source, /clients\.claim\s*\(/);
});
