export const APP_STORAGE_KEY = "who-am-i-daily-state";
export const PREVIEW_STORAGE_PREFIX = "who-am-i-preview:";
export const PREVIEW_STORAGE_KEY = `${PREVIEW_STORAGE_PREFIX}${APP_STORAGE_KEY}`;
export const PREVIEW_DATE_KEY = "who-am-i-preview-date-v2";
export const DEFAULT_PREVIEW_DATE = "2026-10-20";

export function mapPreviewStorageKey(key) {
  return `${PREVIEW_STORAGE_PREFIX}${String(key)}`;
}

export function resolvePreviewDate(storedDate, currentDate = new Date()) {
  if (isValidDateKey(storedDate)) return storedDate;

  const year = String(currentDate.getFullYear()).padStart(4, "0");
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolvePreviewIntroValues(serializedState) {
  try {
    const state = JSON.parse(serializedState);
    return {
      score: isNonNegativeInteger(state?.score) ? state.score : 0,
      streak: isNonNegativeInteger(state?.stats?.currentStreak)
        ? state.stats.currentStreak
        : 0,
    };
  } catch {
    return { score: 0, streak: 0 };
  }
}

export function createPreviewStorage(nativeStorage) {
  return {
    get length() {
      return listPreviewKeys(nativeStorage).length;
    },

    clear() {
      for (const key of listPreviewKeys(nativeStorage)) {
        nativeStorage.removeItem(mapPreviewStorageKey(key));
      }
    },

    getItem(key) {
      return nativeStorage.getItem(mapPreviewStorageKey(key));
    },

    key(index) {
      return listPreviewKeys(nativeStorage)[index] ?? null;
    },

    removeItem(key) {
      nativeStorage.removeItem(mapPreviewStorageKey(key));
    },

    setItem(key, value) {
      nativeStorage.setItem(mapPreviewStorageKey(key), value);
    },
  };
}

function listPreviewKeys(nativeStorage) {
  const keys = [];

  for (let index = 0; index < nativeStorage.length; index += 1) {
    const key = nativeStorage.key(index);
    if (key?.startsWith(PREVIEW_STORAGE_PREFIX)) {
      keys.push(key.slice(PREVIEW_STORAGE_PREFIX.length));
    }
  }

  return keys;
}

function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}
