import assert from "node:assert/strict";
import test from "node:test";

import { GAME_STATUS, createGameState, submitGuess } from "../js/game.js";
import {
  copyShareResult,
  createSharePayload,
  deliverShare,
  getProductionShareUrl,
  getShareCopyText,
} from "../js/share.js";

function completedState({ clue = 1, won = true } = {}) {
  const state = createGameState("2026-09-22");
  state.currentClueIndex = clue - 1;
  return submitGuess(
    state,
    { answer: "Ada Lovelace" },
    won ? "Ada Lovelace" : "Grace Hopper",
  );
}

test("creates a spoiler-free winning result with date, clue, and score", () => {
  const payload = createSharePayload(completedState({ clue: 2 }), "https://game.example/daily?q=1#result");

  assert.deepEqual(payload, {
    title: "Who Am I? Daily",
    text: "Who Am I? Daily — 2026-09-22\nSolved on clue 2 of 3 · 2/3 points",
    url: "https://game.example/daily",
  });
  assert.doesNotMatch(getShareCopyText(payload), /Ada Lovelace|Grace Hopper|computer programmer/);
});

test("creates a spoiler-free sudden-death result", () => {
  const payload = createSharePayload(completedState({ clue: 3, won: false }));

  assert.equal(payload.text, "Who Am I? Daily — 2026-09-22\nSudden Death on clue 3 of 3 · 0/3 points");
  assert.equal("url" in payload, false);
});

test("rejects sharing an unfinished game", () => {
  assert.throws(
    () => createSharePayload(createGameState("2026-09-22")),
    /Only a completed daily game/,
  );
});

test("omits local, preview, and non-web URLs", () => {
  assert.equal(getProductionShareUrl("http://localhost:8000/"), null);
  assert.equal(getProductionShareUrl("http://127.0.0.1:8000/"), null);
  assert.equal(getProductionShareUrl("http://192.168.1.8/game/"), null);
  assert.equal(getProductionShareUrl("http://[::1]:8000/"), null);
  assert.equal(getProductionShareUrl("https://game.example/tools/preview/index.html"), null);
  assert.equal(getProductionShareUrl("about:srcdoc"), null);
});

test("uses native sharing before the clipboard", async () => {
  const calls = [];
  const result = await deliverShare(
    { title: "Title", text: "Result", url: "https://game.example/" },
    {
      async share(payload) {
        calls.push(["share", payload]);
      },
      clipboard: {
        async writeText(text) {
          calls.push(["clipboard", text]);
        },
      },
    },
  );

  assert.equal(result.status, "shared");
  assert.deepEqual(calls, [["share", { title: "Title", text: "Result", url: "https://game.example/" }]]);
});

test("a cancelled native share remains quiet and does not copy", async () => {
  let copied = false;
  const result = await deliverShare(
    { title: "Title", text: "Result" },
    {
      async share() {
        const error = new Error("cancelled");
        error.name = "AbortError";
        throw error;
      },
      clipboard: {
        async writeText() {
          copied = true;
        },
      },
    },
  );

  assert.equal(result.status, "cancelled");
  assert.equal(copied, false);
});

test("falls back from native share to clipboard", async () => {
  let copied = "";
  const result = await deliverShare(
    { title: "Title", text: "Result", url: "https://game.example/" },
    {
      async share() {
        throw new Error("share unavailable");
      },
      clipboard: {
        async writeText(text) {
          copied = text;
        },
      },
    },
  );

  assert.equal(result.status, "copied");
  assert.equal(copied, "Result\nhttps://game.example/");
});

test("returns manual-copy text when browser sharing is unavailable", async () => {
  const result = await deliverShare(
    { title: "Title", text: "Result", url: "https://game.example/" },
    {},
  );

  assert.deepEqual(result, {
    status: "manual",
    text: "Result\nhttps://game.example/",
  });
});

test("returns manual-copy text when clipboard access fails", async () => {
  const result = await deliverShare(
    { title: "Title", text: "Result" },
    {
      clipboard: {
        async writeText() {
          throw new Error("clipboard denied");
        },
      },
    },
  );

  assert.deepEqual(result, { status: "manual", text: "Result" });
});

test("direct copy bypasses native share and writes spoiler-free text", async () => {
  const payload = createSharePayload(completedState({ clue: 1 }), "http://localhost:8000/");
  let shareCalled = false;
  let copied = "";

  const result = await copyShareResult(payload, {
    async share() {
      shareCalled = true;
    },
    clipboard: {
      async writeText(text) {
        copied = text;
      },
    },
  });

  assert.equal(result.status, "copied");
  assert.equal(shareCalled, false);
  assert.equal(copied, "Who Am I? Daily — 2026-09-22\nSolved on clue 1 of 3 · 3/3 points");
  assert.doesNotMatch(copied, /Ada Lovelace|Grace Hopper/);
});

test("direct copy exposes manual text when clipboard is unavailable", async () => {
  const result = await copyShareResult({ title: "Title", text: "Result" }, {});
  assert.deepEqual(result, { status: "manual", text: "Result" });
});
