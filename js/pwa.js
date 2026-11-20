const INSTALL_GUIDANCE =
  "Install from your browser menu. On iPhone or iPad, open this site in Safari, tap Share, choose Add to Home Screen, turn on Open as Web App, then tap Add.";

export function shouldRegisterPwa({
  navigatorApi = globalThis.navigator,
  locationUrl = globalThis.location?.href,
  isTopLevel = globalThis.top === globalThis.self,
} = {}) {
  if (!navigatorApi?.serviceWorker || !locationUrl || !isTopLevel) return false;

  const url = new URL(locationUrl);
  return (
    url.protocol !== "about:" &&
    !/\/tools\/preview(?:\/|$)/.test(url.pathname) &&
    !url.searchParams.has("preview") &&
    !url.searchParams.has("review")
  );
}

export function getServiceWorkerUrl(moduleUrl = import.meta.url) {
  return new URL("../service-worker.js", moduleUrl);
}

export function isStandalone({
  navigatorApi = globalThis.navigator,
  matchMediaApi = globalThis.matchMedia,
} = {}) {
  if (navigatorApi?.standalone === true) return true;

  try {
    return matchMediaApi?.("(display-mode: standalone)")?.matches === true;
  } catch {
    return false;
  }
}

export function createInstallController({
  windowApi = globalThis.window,
  navigatorApi = globalThis.navigator,
  matchMediaApi = globalThis.matchMedia,
  button,
  guidance,
} = {}) {
  if (!windowApi?.addEventListener || !button || !guidance) return null;

  let installPrompt = null;

  const hideInstallUi = () => {
    button.hidden = true;
    guidance.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };

  const showGuidance = (message = INSTALL_GUIDANCE) => {
    guidance.textContent = message;
    guidance.hidden = false;
    button.setAttribute("aria-expanded", "true");
  };

  const handlePromptAvailable = (event) => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
    guidance.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };

  const handleInstall = async () => {
    if (!installPrompt) {
      showGuidance();
      return;
    }

    const prompt = installPrompt;
    installPrompt = null;
    button.disabled = true;

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") hideInstallUi();
      else showGuidance("Installation was not completed. You can try again from your browser menu.");
    } catch {
      showGuidance();
    } finally {
      button.disabled = false;
    }
  };

  const handleInstalled = () => {
    installPrompt = null;
    hideInstallUi();
  };

  if (isStandalone({ navigatorApi, matchMediaApi })) {
    hideInstallUi();
    return { dispose() {} };
  }

  button.hidden = false;
  button.addEventListener("click", handleInstall);
  windowApi.addEventListener("beforeinstallprompt", handlePromptAvailable);
  windowApi.addEventListener("appinstalled", handleInstalled);

  return {
    dispose() {
      button.removeEventListener("click", handleInstall);
      windowApi.removeEventListener("beforeinstallprompt", handlePromptAvailable);
      windowApi.removeEventListener("appinstalled", handleInstalled);
    },
  };
}

export async function registerPwa({
  navigatorApi = globalThis.navigator,
  locationUrl = globalThis.location?.href,
  isTopLevel = globalThis.top === globalThis.self,
  moduleUrl = import.meta.url,
} = {}) {
  if (!shouldRegisterPwa({ navigatorApi, locationUrl, isTopLevel })) return null;

  try {
    return await navigatorApi.serviceWorker.register(getServiceWorkerUrl(moduleUrl), {
      type: "module",
      updateViaCache: "none",
    });
  } catch {
    return null;
  }
}

const UPDATE_READY = "A new version is ready. Update now to reload with your saved progress.";
const UPDATE_BLOCKED = "Your latest progress could not be saved. Keep this page open and try updating later.";
export const BEFORE_UPDATE_EVENT = "who-am-i:before-update";

// The game owns its in-memory state. It can veto either activation or reload
// without exposing that state or relying on the presence of a warning element.
export function createUpdateSafetyGuard({ windowApi = globalThis.window, hasUnsavedChanges } = {}) {
  const guard = (event) => {
    if (hasUnsavedChanges()) event.preventDefault();
  };
  windowApi.addEventListener(BEFORE_UPDATE_EVENT, guard);
  return () => windowApi.removeEventListener(BEFORE_UPDATE_EVENT, guard);
}

export function createUpdateController({
  registration,
  serviceWorker = globalThis.navigator?.serviceWorker,
  navigatorApi = globalThis.navigator,
  windowApi = globalThis.window,
  documentApi = globalThis.document,
  banner,
  message,
  updateButton,
  dismissButton,
  reload = () => windowApi.location.reload(),
  now = () => Date.now(),
  setTimeoutApi = globalThis.setTimeout,
  clearTimeoutApi = globalThis.clearTimeout,
  checkIntervalMs = 60_000,
  activationTimeoutMs = 15_000,
} = {}) {
  if (!registration || !serviceWorker?.addEventListener || !banner || !message ||
      !updateButton || !dismissButton) return null;

  let offeredWorker = null;
  let acceptedWorker = null;
  let dismissedWorker = null;
  let reloaded = false;
  let activationTimer = null;
  let lastCheck = -Infinity;
  let checking = false;
  const observedWorkers = new Map();

  const show = (text) => {
    message.textContent = text;
    banner.hidden = false;
  };
  const clearActivationTimer = () => {
    if (activationTimer !== null) clearTimeoutApi(activationTimer);
    activationTimer = null;
  };
  const canReload = () => windowApi.dispatchEvent(new Event(BEFORE_UPDATE_EVENT, { cancelable: true }));

  const offerWaiting = () => {
    // A first installation needs no reload and must not interrupt the game.
    if (!serviceWorker.controller || !registration.waiting) return;
    if (offeredWorker === registration.waiting) return;
    offeredWorker = registration.waiting;
    if (offeredWorker !== dismissedWorker) show(UPDATE_READY);
    updateButton.disabled = false;
  };

  const handleControllerChange = () => {
    if (!acceptedWorker || serviceWorker.controller !== acceptedWorker || reloaded) return;
    clearActivationTimer();
    acceptedWorker = null;
    updateButton.disabled = false;
    if (!canReload()) {
      show(UPDATE_BLOCKED);
      return;
    }
    reloaded = true;
    reload();
  };

  const acceptUpdate = () => {
    if (reloaded || updateButton.disabled || !offeredWorker) return;
    if (!canReload()) {
      show(UPDATE_BLOCKED);
      return;
    }
    // Another tab may already have activated this release. This tab still
    // reloads only when its own player explicitly accepts and it is safe.
    if (serviceWorker.controller === offeredWorker) {
      reloaded = true;
      reload();
      return;
    }
    if (registration.waiting !== offeredWorker) {
      offeredWorker = null;
      banner.hidden = true;
      offerWaiting();
      return;
    }
    acceptedWorker = offeredWorker;
    updateButton.disabled = true;
    show("Updating the app. Your saved progress will resume after reload.");
    activationTimer = setTimeoutApi(() => {
      acceptedWorker = null;
      activationTimer = null;
      updateButton.disabled = false;
      show("The update has not finished. Keep playing, or try Update now again.");
    }, activationTimeoutMs);
    try {
      offeredWorker.postMessage({ type: "SKIP_WAITING" });
    } catch {
      clearActivationTimer();
      acceptedWorker = null;
      updateButton.disabled = false;
      show("The update could not start. Keep playing, or try Update now again.");
    }
  };

  const observeInstalling = () => {
    const installing = registration.installing;
    if (!installing || observedWorkers.has(installing)) return;
    const stateChanged = () => {
      if (installing.state === "installed") offerWaiting();
    };
    observedWorkers.set(installing, stateChanged);
    installing.addEventListener("statechange", stateChanged);
    stateChanged();
  };

  const checkForUpdate = async () => {
    offerWaiting();
    if (documentApi?.hidden || navigatorApi?.onLine === false || checking ||
        now() - lastCheck < checkIntervalMs) return;
    lastCheck = now();
    checking = true;
    try {
      await registration.update();
      offerWaiting();
    } catch {
      // Offline and transient update failures never interrupt a cached game.
    } finally {
      checking = false;
    }
  };
  const dismiss = () => {
    dismissedWorker = offeredWorker;
    banner.hidden = true;
    documentApi?.querySelector("#game-title")?.focus();
  };

  updateButton.addEventListener("click", acceptUpdate);
  dismissButton.addEventListener("click", dismiss);
  registration.addEventListener("updatefound", observeInstalling);
  serviceWorker.addEventListener("controllerchange", handleControllerChange);
  windowApi.addEventListener("focus", checkForUpdate);
  windowApi.addEventListener("online", checkForUpdate);
  documentApi?.addEventListener("visibilitychange", checkForUpdate);
  offerWaiting();
  observeInstalling();

  return {
    checkForUpdate,
    dispose() {
      clearActivationTimer();
      updateButton.removeEventListener("click", acceptUpdate);
      dismissButton.removeEventListener("click", dismiss);
      registration.removeEventListener("updatefound", observeInstalling);
      serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      windowApi.removeEventListener("focus", checkForUpdate);
      windowApi.removeEventListener("online", checkForUpdate);
      documentApi?.removeEventListener("visibilitychange", checkForUpdate);
      for (const [worker, listener] of observedWorkers) worker.removeEventListener("statechange", listener);
    },
  };
}

if (typeof document !== "undefined") {
  createInstallController({
    button: document.querySelector("#install-button"),
    guidance: document.querySelector("#install-guidance"),
  });
  void registerPwa().then((registration) => createUpdateController({
    registration,
    banner: document.querySelector("#update-banner"),
    message: document.querySelector("#update-message"),
    updateButton: document.querySelector("#update-button"),
    dismissButton: document.querySelector("#update-dismiss"),
  }));
}
