import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  createDevServer,
  parseDevServerOptions,
  resolvePublicPath,
} from "../tools/dev-server.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

test("development server options support CLI and environment values", () => {
  assert.deepEqual(parseDevServerOptions([], {}), { host: "127.0.0.1", port: 8000 });
  assert.deepEqual(parseDevServerOptions([], { HOST: "0.0.0.0", PORT: "4173" }), {
    host: "0.0.0.0",
    port: 4173,
  });
  assert.deepEqual(parseDevServerOptions(["--host", "localhost", "--port=9000"], {}), {
    host: "localhost",
    port: 9000,
  });
  assert.throws(() => parseDevServerOptions(["--port", "70000"], {}), /Invalid port/);
});

test("development server restricts requests to public project paths", () => {
  assert.equal(resolvePublicPath("/js/app.js", projectRoot)?.endsWith("/js/app.js"), true);
  assert.equal(resolvePublicPath("/%2e%2e/package.json", projectRoot), null);
  assert.equal(resolvePublicPath("/.git/config", projectRoot), null);
  assert.equal(resolvePublicPath("/package.json", projectRoot), null);
});

test("development server serves app files with browser MIME types", async (context) => {
  const server = createDevServer({ rootDir: projectRoot });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => new Promise((resolveClose) => server.close(resolveClose)));

  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  const [page, module, manifest, privateFile] = await Promise.all([
    fetch(`${origin}/`),
    fetch(`${origin}/js/app.js`),
    fetch(`${origin}/manifest.webmanifest`),
    fetch(`${origin}/package.json`),
  ]);

  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /^text\/html/);
  assert.equal(module.status, 200);
  assert.match(module.headers.get("content-type"), /^text\/javascript/);
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get("content-type"), /^application\/manifest\+json/);
  assert.equal(privateFile.status, 404);
});
