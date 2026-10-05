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

void registerPwa();

if (typeof document !== "undefined") {
  createInstallController({
    button: document.querySelector("#install-button"),
    guidance: document.querySelector("#install-guidance"),
  });
}
