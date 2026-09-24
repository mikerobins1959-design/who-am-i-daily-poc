import { GAME_STATUS } from "./game.js";

const SHARE_TITLE = "Who Am I? Daily";

export function createSharePayload(state, locationHref = "") {
  if (state.gameStatus !== GAME_STATUS.WON && state.gameStatus !== GAME_STATUS.FAILED) {
    throw new TypeError("Only a completed daily game can be shared.");
  }

  const clueNumber = state.currentClueIndex + 1;
  const outcome =
    state.gameStatus === GAME_STATUS.WON
      ? `Solved on clue ${clueNumber} of 3 · ${state.score}/3 points`
      : `Sudden Death on clue ${clueNumber} of 3 · 0/3 points`;
  const url = getProductionShareUrl(locationHref);

  return {
    title: SHARE_TITLE,
    text: `${SHARE_TITLE} — ${state.lastPlayedDate}\n${outcome}`,
    ...(url ? { url } : {}),
  };
}

export function getProductionShareUrl(locationHref) {
  let url;

  try {
    url = new URL(locationHref);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(url.protocol)) return null;
  if (isLocalHostname(url.hostname)) return null;
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const toolsIndex = pathSegments.indexOf("tools");
  if (toolsIndex !== -1 && pathSegments[toolsIndex + 1] === "preview") return null;

  url.search = "";
  url.hash = "";
  return url.href;
}

export function getShareCopyText(payload) {
  return [payload.text, payload.url].filter(Boolean).join("\n");
}

export async function deliverShare(payload, navigatorApi = globalThis.navigator) {
  if (typeof navigatorApi?.share === "function") {
    try {
      await navigatorApi.share(payload);
      return { status: "shared", text: getShareCopyText(payload) };
    } catch (error) {
      if (error?.name === "AbortError") {
        return { status: "cancelled", text: getShareCopyText(payload) };
      }
    }
  }

  return copyShareResult(payload, navigatorApi);
}

export async function copyShareResult(payload, navigatorApi = globalThis.navigator) {
  const text = getShareCopyText(payload);
  if (typeof navigatorApi?.clipboard?.writeText === "function") {
    try {
      await navigatorApi.clipboard.writeText(text);
      return { status: "copied", text };
    } catch {
      // The caller reveals the same text for manual copying.
    }
  }

  return { status: "manual", text };
}

function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase();

  if (
    normalized === "localhost" ||
    normalized === "localhost." ||
    normalized === "0.0.0.0" ||
    normalized === "[::1]" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.startsWith("127.") ||
    normalized.startsWith("169.254.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("[fc") ||
    normalized.startsWith("[fd") ||
    normalized.startsWith("[fe80:")
  ) {
    return true;
  }

  const match = normalized.match(/^172\.(\d{1,3})\./);
  return match ? Number(match[1]) >= 16 && Number(match[1]) <= 31 : false;
}
