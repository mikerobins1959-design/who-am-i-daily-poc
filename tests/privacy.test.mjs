import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PRODUCTION_FILES } from "../tools/build-production.mjs";
import { resolvePublicPath } from "../tools/dev-server.mjs";
import { SHELL_PATHS } from "../service-worker.js";

const root = new URL("../", import.meta.url);

test("privacy destination is available publicly and offline, review decisions remain private", async () => {
  const [index, privacy] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("privacy.html", root), "utf8"),
  ]);
  assert.match(index, /href="privacy\.html"/);
  assert.match(privacy, /<html lang="en">/);
  assert.match(privacy, /<main id="privacy"/);
  assert.match(privacy, /href="\.\/"/);
  assert.equal(PRODUCTION_FILES.includes("privacy.html"), true);
  assert.equal(SHELL_PATHS.includes("./privacy.html"), true);
  assert.ok(resolvePublicPath("/privacy.html", root.pathname));
  assert.equal(resolvePublicPath("/client-handoff/privacy-review.md", root.pathname), null);
  assert.equal(PRODUCTION_FILES.includes("client-handoff/privacy-review.md"), false);
  assert.doesNotMatch(privacy, /<script\b/);
  assert.match(index, /mailto:manofempire@yahoo\.co\.uk/);
  assert.doesNotMatch(index, /mickrobins@mac/);
  assert.equal((privacy.match(/mailto:manofempire@yahoo\.co\.uk/g) ?? []).length, 2);
  assert.doesNotMatch(privacy, /mickrobins@mac/);
  assert.match(privacy, /legitimate interests in securely delivering the game and responding to support enquiries/);
});
