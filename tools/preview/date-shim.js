import { ANGELA_INTRO_ASSET_URL } from "../../js/config.js";
import { GAME_STATUS } from "../../js/game.js";
import { getIntroStorageKey, runDailyIntro } from "../../js/intro.js";
import {
  APP_STORAGE_KEY,
  createPreviewStorage,
  resolvePreviewIntroValues,
} from "./storage.js?intro-replay=1";

// Development only: isolate saved state and pin the clock before app.js runs.
{
  const nativeStorage = window.localStorage;
  const previewStorage = createPreviewStorage(nativeStorage);
  const parentOrigin = new URL(document.baseURI).origin;
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: previewStorage,
  });

  const dateKey = window.sessionStorage.getItem("who-am-i-preview-date");
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey ?? "")) {
    const NativeDate = window.Date;
    const fixedValue = `${dateKey}T12:00:00`;

    class ControlledDate extends NativeDate {
      constructor(...args) {
        super(...(args.length === 0 ? [fixedValue] : args));
      }

      static now() {
        return new NativeDate(fixedValue).getTime();
      }
    }

    window.Date = ControlledDate;
  }

  // The wrapper calls this development-only bridge to replay the real intro
  // over the real app without changing the saved daily result or statistics.
  window.__WHO_AM_I_PREVIEW_REPLAY_INTRO__ = () => {
    const values = resolvePreviewIntroValues(previewStorage.getItem(APP_STORAGE_KEY));

    const overlay = document.querySelector("#angela-intro");
    const gameTitle = document.querySelector("#game-title");
    if (overlay && !overlay.hidden) {
      return Promise.resolve({ played: false, reason: "already-active" });
    }
    window.sessionStorage.removeItem(getIntroStorageKey(dateKey, { preview: true }));

    return runDailyIntro({
      assetUrl: ANGELA_INTRO_ASSET_URL,
      dateKey,
      gameStatus: GAME_STATUS.IN_PROGRESS,
      score: values.score,
      streak: values.streak,
      preview: true,
      elements: {
        overlay,
        image: document.querySelector("#angela-intro-image"),
        skip: document.querySelector("#angela-intro-skip"),
        title: document.querySelector("#angela-intro-title"),
        score: document.querySelector("#angela-intro-score"),
        streak: document.querySelector("#angela-intro-streak"),
        returnFocus: gameTitle,
        backgroundElements: [
          document.querySelector(".skip-link"),
          document.querySelector(".site-header"),
          document.querySelector("#main-content"),
          document.querySelector(".site-footer"),
        ],
        scrollRoot: document.body,
      },
      shouldStillPlay: () => true,
    });
  };

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.querySelector("#angela-intro")?.hidden) {
      window.parent.postMessage({ type: "who-am-i-preview-show-controls" }, parentOrigin);
    }
  });

  window.parent.postMessage({ type: "who-am-i-preview-bridge-ready" }, parentOrigin);
}
