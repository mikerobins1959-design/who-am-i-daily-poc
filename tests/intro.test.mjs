import assert from "node:assert/strict";
import test from "node:test";

import { GAME_STATUS } from "../js/game.js";
import {
  getIntroDecision,
  getIntroStorageKey,
  isolateIntroBackground,
  preloadIntroImage,
  runDailyIntro,
} from "../js/intro.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function ready(overrides = {}) {
  return {
    assetUrl: "./assets/angela_host.png",
    dateKey: "2026-09-24",
    gameStatus: GAME_STATUS.IN_PROGRESS,
    storage: memoryStorage(),
    ...overrides,
  };
}

function inertable({ inert = false, attribute = false } = {}) {
  const attributes = new Set(attribute ? ["inert"] : []);
  return {
    inert,
    hasAttribute(name) {
      return attributes.has(name);
    },
    setAttribute(name) {
      attributes.add(name);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
  };
}

test("production and preview intros use separate per-date session keys", () => {
  assert.equal(getIntroStorageKey("2026-09-24"), "who-am-i-intro-seen:2026-09-24");
  assert.equal(
    getIntroStorageKey("2026-09-24", { preview: true }),
    "who-am-i-preview:intro-seen:2026-09-24",
  );
});

test("intro stays disabled until a real asset is configured", () => {
  assert.deepEqual(getIntroDecision(ready({ assetUrl: null })), {
    shouldPlay: false,
    reason: "asset-unconfigured",
  });
});

test("intro skips completed games and reduced-motion sessions", () => {
  assert.equal(getIntroDecision(ready({ gameStatus: GAME_STATUS.WON })).reason, "game-complete");
  assert.equal(getIntroDecision(ready({ reducedMotion: true })).reason, "reduced-motion");
});

test("intro plays no more than once per local date in a tab session", () => {
  const key = getIntroStorageKey("2026-09-24");
  const storage = memoryStorage({ [key]: "1" });
  assert.equal(getIntroDecision(ready({ storage })).reason, "already-seen");
  assert.equal(getIntroDecision(ready({ storage, dateKey: "2026-09-25" })).shouldPlay, true);
});

test("intro fails open when session storage is unavailable", () => {
  const storage = {
    getItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(getIntroDecision(ready({ storage })).reason, "storage-unavailable");
});

test("preloader reports loaded and failed assets without rendering them", async () => {
  class LoadedImage {
    set src(_value) {
      queueMicrotask(() => this.onload());
    }
  }
  class FailedImage {
    set src(_value) {
      queueMicrotask(() => this.onerror());
    }
  }

  assert.equal(await preloadIntroImage("loaded.png", { ImageCtor: LoadedImage }), true);
  assert.equal(await preloadIntroImage("missing.png", { ImageCtor: FailedImage }), false);
});

test("modal isolation restores prior inert and scroll-lock state exactly once", () => {
  const available = inertable();
  const alreadyInert = inertable({ inert: true, attribute: true });
  const scrollRoot = { style: { overflow: "clip" } };
  const restore = isolateIntroBackground([available, null, alreadyInert], scrollRoot);

  assert.equal(available.inert, true);
  assert.equal(available.hasAttribute("inert"), true);
  assert.equal(alreadyInert.inert, true);
  assert.equal(scrollRoot.style.overflow, "hidden");

  restore();
  restore();
  assert.equal(available.inert, false);
  assert.equal(available.hasAttribute("inert"), false);
  assert.equal(alreadyInert.inert, true);
  assert.equal(alreadyInert.hasAttribute("inert"), true);
  assert.equal(scrollRoot.style.overflow, "clip");
});

test("runner does not create a broken image when the asset cannot load", async () => {
  class FailedImage {
    set src(_value) {
      queueMicrotask(() => this.onerror());
    }
  }
  const image = { src: "" };
  const result = await runDailyIntro({
    ...ready(),
    elements: { overlay: {}, image, skip: {} },
    ImageCtor: FailedImage,
  });

  assert.deepEqual(result, { played: false, reason: "asset-unavailable" });
  assert.equal(image.src, "");
});

test("runner cancels a late-loading intro after the player has interacted", async () => {
  let finishLoading;
  class DeferredImage {
    set src(_value) {
      finishLoading = () => this.onload();
    }
  }
  let idle = true;
  const image = { src: "" };
  const running = runDailyIntro({
    ...ready(),
    elements: { overlay: {}, image, skip: {} },
    ImageCtor: DeferredImage,
    shouldStillPlay: () => idle,
  });

  idle = false;
  finishLoading();

  assert.deepEqual(await running, { played: false, reason: "state-changed" });
  assert.equal(image.src, "");
});

test("runner shows live HUD values, contains focus, and restores it after dismissal", async () => {
  class LoadedImage {
    set src(_value) {
      queueMicrotask(() => this.onload());
    }
  }

  const classes = new Set();
  const overlay = new EventTarget();
  overlay.hidden = true;
  overlay.classList = {
    add(value) {
      classes.add(value);
    },
    remove(value) {
      classes.delete(value);
    },
  };
  const skip = new EventTarget();
  let skipFocusCount = 0;
  skip.focus = () => {
    skipFocusCount += 1;
  };
  let focusRestored = false;
  const returnFocus = { focus: () => { focusRestored = true; } };
  const image = {
    src: "",
    removeAttribute(name) {
      if (name === "src") this.src = "";
    },
  };
  const title = { textContent: "" };
  const score = { textContent: "" };
  const streak = { textContent: "" };
  const storage = memoryStorage();
  const background = inertable();
  const scrollRoot = { style: { overflow: "auto" } };

  const playing = runDailyIntro({
    ...ready({ storage }),
    score: 3,
    streak: 4,
    elements: {
      overlay,
      image,
      skip,
      title,
      score,
      streak,
      returnFocus,
      backgroundElements: [background],
      scrollRoot,
    },
    ImageCtor: LoadedImage,
    durationMs: 60_000,
    exitMs: 0,
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(overlay.hidden, false);
  assert.equal(skipFocusCount, 1);
  assert.equal(title.textContent, "DAILY WHOAMIGAME");
  assert.equal(score.textContent, "3");
  assert.equal(streak.textContent, "4");
  assert.equal(storage.getItem(getIntroStorageKey("2026-09-24")), "1");
  assert.equal(background.inert, true);
  assert.equal(scrollRoot.style.overflow, "hidden");

  const tab = new Event("keydown", { cancelable: true });
  Object.defineProperty(tab, "key", { value: "Tab" });
  overlay.dispatchEvent(tab);
  assert.equal(tab.defaultPrevented, true);
  assert.equal(skipFocusCount, 2);

  const escape = new Event("keydown");
  Object.defineProperty(escape, "key", { value: "Escape" });
  overlay.dispatchEvent(escape);
  assert.deepEqual(await playing, { played: true, reason: "skipped" });
  assert.equal(overlay.hidden, true);
  assert.equal(image.src, "");
  assert.equal(focusRestored, true);
  assert.equal(background.inert, false);
  assert.equal(scrollRoot.style.overflow, "auto");
});
