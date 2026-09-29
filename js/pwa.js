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
