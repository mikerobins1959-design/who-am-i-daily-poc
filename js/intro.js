import {
  ANGELA_INTRO_DURATION_MS,
  ANGELA_INTRO_EXIT_MS,
  ANGELA_INTRO_LOAD_TIMEOUT_MS,
  ANGELA_INTRO_PREVIEW_SESSION_PREFIX,
  ANGELA_INTRO_SESSION_PREFIX,
  ANGELA_INTRO_TITLE,
} from "./config.js";
import { GAME_STATUS } from "./game.js";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getIntroStorageKey(dateKey, { preview = false } = {}) {
  const prefix = preview ? ANGELA_INTRO_PREVIEW_SESSION_PREFIX : ANGELA_INTRO_SESSION_PREFIX;
  return `${prefix}${dateKey}`;
}

export function getIntroDecision({
  assetUrl,
  dateKey,
  gameStatus,
  storage,
  preview = false,
  reducedMotion = false,
}) {
  if (typeof assetUrl !== "string" || assetUrl.trim().length === 0) {
    return { shouldPlay: false, reason: "asset-unconfigured" };
  }

  if (!DATE_KEY_PATTERN.test(dateKey)) {
    return { shouldPlay: false, reason: "invalid-date" };
  }

  if (gameStatus !== GAME_STATUS.IN_PROGRESS) {
    return { shouldPlay: false, reason: "game-complete" };
  }

  if (reducedMotion) {
    return { shouldPlay: false, reason: "reduced-motion" };
  }

  const storageKey = getIntroStorageKey(dateKey, { preview });
  try {
    if (storage.getItem(storageKey) !== null) {
      return { shouldPlay: false, reason: "already-seen", storageKey };
    }
  } catch {
    // If session state cannot be tracked, avoid replaying the opener on every
    // refresh. Gameplay remains available underneath.
    return { shouldPlay: false, reason: "storage-unavailable", storageKey };
  }

  return { shouldPlay: true, reason: "ready", storageKey };
}

export function preloadIntroImage(
  assetUrl,
  {
    ImageCtor = globalThis.Image,
    timeoutMs = ANGELA_INTRO_LOAD_TIMEOUT_MS,
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout,
  } = {},
) {
  if (typeof ImageCtor !== "function") return Promise.resolve(false);

  return new Promise((resolve) => {
    const image = new ImageCtor();
    let settled = false;
    let timer;

    const finish = (loaded) => {
      if (settled) return;
      settled = true;
      clearTimer(timer);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };

    timer = setTimer(() => finish(false), timeoutMs);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = assetUrl;
  });
}

export function isolateIntroBackground(backgroundElements = [], scrollRoot) {
  const snapshots = backgroundElements.filter(Boolean).map((element) => ({
    element,
    inert: Boolean(element.inert),
    hadInertAttribute: element.hasAttribute?.("inert") ?? false,
  }));
  const previousOverflow = scrollRoot?.style?.overflow;

  for (const { element } of snapshots) {
    element.inert = true;
    element.setAttribute?.("inert", "");
  }
  if (scrollRoot?.style) scrollRoot.style.overflow = "hidden";

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;

    for (const { element, inert, hadInertAttribute } of snapshots) {
      element.inert = inert;
      if (!hadInertAttribute) element.removeAttribute?.("inert");
    }
    if (scrollRoot?.style) scrollRoot.style.overflow = previousOverflow;
  };
}

export async function runDailyIntro({
  assetUrl,
  dateKey,
  gameStatus,
  score,
  streak,
  elements,
  storage = globalThis.sessionStorage,
  preview = globalThis.location?.protocol === "about:",
  reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  durationMs = ANGELA_INTRO_DURATION_MS,
  exitMs = ANGELA_INTRO_EXIT_MS,
  ImageCtor = globalThis.Image,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  shouldStillPlay = () => true,
}) {
  const decision = getIntroDecision({
    assetUrl,
    dateKey,
    gameStatus,
    storage,
    preview,
    reducedMotion,
  });
  if (!decision.shouldPlay) return { played: false, reason: decision.reason };

  const required = [elements?.overlay, elements?.image, elements?.skip];
  if (required.some((element) => !element)) {
    return { played: false, reason: "missing-elements" };
  }

  const loaded = await preloadIntroImage(assetUrl, {
    ImageCtor,
    setTimer,
    clearTimer,
  });
  if (!loaded) return { played: false, reason: "asset-unavailable" };

  try {
    if (!shouldStillPlay()) return { played: false, reason: "state-changed" };
  } catch {
    return { played: false, reason: "state-changed" };
  }

  try {
    storage.setItem(decision.storageKey, "1");
  } catch {
    return { played: false, reason: "storage-unavailable" };
  }

  const restoreBackground = isolateIntroBackground(
    elements.backgroundElements,
    elements.scrollRoot,
  );

  try {
    elements.image.src = assetUrl;
    if (elements.title) elements.title.textContent = ANGELA_INTRO_TITLE;
    if (elements.score) elements.score.textContent = String(score);
    if (elements.streak) elements.streak.textContent = String(streak);
    elements.overlay.style?.setProperty("--intro-exit-duration", `${exitMs}ms`);
    elements.overlay.hidden = false;
    elements.overlay.classList.remove("is-leaving");
    elements.overlay.classList.add("is-active");
    elements.skip.focus();
  } catch {
    restoreBackground();
    return { played: false, reason: "render-unavailable" };
  }

  return new Promise((resolve) => {
    let finished = false;
    let exitTimer;
    let autoTimer;

    const cleanup = () => {
      elements.skip.removeEventListener("click", skip);
      elements.overlay.removeEventListener("keydown", handleKeydown);
      clearTimer(autoTimer);
      clearTimer(exitTimer);
    };

    const hide = (reason) => {
      if (finished) return;
      finished = true;
      elements.overlay.classList.remove("is-active");
      elements.overlay.classList.add("is-leaving");
      exitTimer = setTimer(() => {
        cleanup();
        elements.overlay.hidden = true;
        elements.overlay.classList.remove("is-leaving");
        elements.image.removeAttribute("src");
        restoreBackground();
        elements.returnFocus?.focus();
        resolve({ played: true, reason });
      }, exitMs);
    };

    const skip = () => hide("skipped");
    const handleKeydown = (event) => {
      if (event.key === "Escape") hide("skipped");
      if (event.key === "Tab") {
        event.preventDefault();
        elements.skip.focus();
      }
    };

    elements.skip.addEventListener("click", skip);
    elements.overlay.addEventListener("keydown", handleKeydown);
    autoTimer = setTimer(() => hide("completed"), durationMs);
  });
}
