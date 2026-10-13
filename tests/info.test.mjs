import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInfoDialogController } from "../js/info.js";

class Control extends EventTarget {
  focusCount = 0;

  focus() {
    this.focusCount += 1;
  }
}

class Modal extends EventTarget {
  open = false;

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  }
}

test("info dialog closes with Escape and restores the invoking control", () => {
  const dialog = new Modal();
  const headerTrigger = new Control();
  const footerTrigger = new Control();
  const closeButton = new Control();
  const scrollRoot = { style: { overflow: "auto" } };

  createInfoDialogController({
    dialog,
    triggers: [headerTrigger, footerTrigger],
    closeButton,
    scrollRoot,
  });

  footerTrigger.dispatchEvent(new Event("click"));
  assert.equal(dialog.open, true);
  assert.equal(closeButton.focusCount, 1);
  assert.equal(scrollRoot.style.overflow, "hidden");

  const escape = new Event("keydown", { cancelable: true });
  Object.defineProperty(escape, "key", { value: "Escape" });
  dialog.dispatchEvent(escape);

  assert.equal(escape.defaultPrevented, true);
  assert.equal(dialog.open, false);
  assert.equal(scrollRoot.style.overflow, "auto");
  assert.equal(footerTrigger.focusCount, 1);
  assert.equal(headerTrigger.focusCount, 0);
});

test("information copy preserves the approved rules, contact, and legal text", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  assert.match(html, /<dialog id="info-dialog"[^>]*aria-labelledby="info-title"/);
  assert.match(html, /mailto:manofempire@yahoo\.co\.uk/);
  assert.match(text, /Reveal Multiple Choices/);
  assert.match(text, /selected option must exactly match the puzzle answer/);
  assert.match(text, /There is no timer before or after you reveal the choices/);
  assert.match(text, /A streak counts consecutive daily wins/);
  assert.ok(text.includes(
    "Trivia Content: Puzzle content and answers are accurate to the best of our knowledge at the time of publication. Puzzles are created solely for daily entertainment. Krell Enterprises Ltd makes no warranties regarding the completeness or timeliness of historical or biographical data.",
  ));
  assert.ok(text.includes(
    "Trademarks: All trademarks, public figure names, and historical references belong to their respective owners. Reference to any individual or organization does not imply endorsement or affiliation.",
  ));
});
