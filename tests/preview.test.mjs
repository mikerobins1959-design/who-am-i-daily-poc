import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_STORAGE_KEY,
  PREVIEW_STORAGE_KEY,
  createPreviewStorage,
  resolvePreviewDate,
} from "../tools/preview/storage.js";

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(String(key));
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
  };
}

test("preview state reads and writes through a separate storage key", () => {
  const productionState = '{"gameStatus":"WON","score":3}';
  const storage = createMemoryStorage({ [APP_STORAGE_KEY]: productionState });
  const preview = createPreviewStorage(storage);

  assert.equal(preview.getItem(APP_STORAGE_KEY), null);
  preview.setItem(APP_STORAGE_KEY, '{"gameStatus":"IN_PROGRESS"}');

  assert.equal(storage.getItem(APP_STORAGE_KEY), productionState);
  assert.equal(storage.getItem(PREVIEW_STORAGE_KEY), '{"gameStatus":"IN_PROGRESS"}');
  assert.equal(preview.getItem(APP_STORAGE_KEY), '{"gameStatus":"IN_PROGRESS"}');
});

test("recreating the preview facade preserves preview and production state", () => {
  const storage = createMemoryStorage({
    [APP_STORAGE_KEY]: "production",
    [PREVIEW_STORAGE_KEY]: "preview",
  });

  assert.equal(createPreviewStorage(storage).getItem(APP_STORAGE_KEY), "preview");
  assert.equal(storage.getItem(APP_STORAGE_KEY), "production");
  assert.equal(storage.getItem(PREVIEW_STORAGE_KEY), "preview");
});

test("preview reset removes only namespaced preview state", () => {
  const storage = createMemoryStorage({
    [APP_STORAGE_KEY]: "production",
    [PREVIEW_STORAGE_KEY]: "preview",
    "unrelated-key": "keep",
  });
  const preview = createPreviewStorage(storage);

  preview.removeItem(APP_STORAGE_KEY);

  assert.equal(storage.getItem(APP_STORAGE_KEY), "production");
  assert.equal(storage.getItem(PREVIEW_STORAGE_KEY), null);
  assert.equal(storage.getItem("unrelated-key"), "keep");
});

test("preview clear and enumeration remain inside the preview namespace", () => {
  const storage = createMemoryStorage({
    [APP_STORAGE_KEY]: "production",
    [PREVIEW_STORAGE_KEY]: "daily preview",
    "who-am-i-preview:secondary": "secondary preview",
    "unrelated-key": "keep",
  });
  const preview = createPreviewStorage(storage);

  assert.equal(preview.length, 2);
  assert.deepEqual([preview.key(0), preview.key(1)].sort(), [APP_STORAGE_KEY, "secondary"].sort());

  preview.clear();

  assert.equal(preview.length, 0);
  assert.equal(storage.getItem(APP_STORAGE_KEY), "production");
  assert.equal(storage.getItem("unrelated-key"), "keep");
});

test("preview storage errors propagate to the caller", () => {
  const failure = new Error("storage unavailable");
  const storage = {
    get length() {
      return 0;
    },
    getItem() {
      throw failure;
    },
    key() {
      return null;
    },
    removeItem() {
      throw failure;
    },
    setItem() {
      throw failure;
    },
  };
  const preview = createPreviewStorage(storage);

  assert.throws(() => preview.getItem(APP_STORAGE_KEY), failure);
  assert.throws(() => preview.setItem(APP_STORAGE_KEY, "state"), failure);
  assert.throws(() => preview.removeItem(APP_STORAGE_KEY), failure);
});

test("preview reload retains a previously selected valid fixture date", () => {
  const today = new Date(2026, 8, 23, 10, 30);
  assert.equal(resolvePreviewDate("2026-09-22", today), "2026-09-22");
});

test("preview date falls back to the current local date when no valid fixture is saved", () => {
  const today = new Date(2026, 8, 23, 23, 30);
  assert.equal(resolvePreviewDate(null, today), "2026-09-23");
  assert.equal(resolvePreviewDate("2026-02-30", today), "2026-09-23");
});
