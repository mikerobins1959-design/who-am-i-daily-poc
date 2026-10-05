import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PRODUCTION_FILES, buildProduction } from "../tools/build-production.mjs";
import {
  loadAndValidatePuzzles,
  validateDateCoverage,
} from "../tools/validate-puzzles.mjs";

const SAMPLE_PUZZLE = {
  date: "2026-09-22",
  answer: "Ada Lovelace",
  clues: ["First", "Second", "Third"],
  options: [
    "Ada Lovelace",
    "Grace Hopper",
    "Marie Curie",
    "Rosalind Franklin",
    "Emmy Noether",
    "Katherine Johnson",
    "Florence Nightingale",
    "Joan Clarke",
  ],
};

test("production build copies only the explicit runtime allowlist", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "who-am-i-production-source-"));
  const outputRoot = path.join(fixtureRoot, "dist");

  for (const relativePath of PRODUCTION_FILES) {
    const filePath = path.join(fixtureRoot, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    const contents = relativePath === "data/puzzles.json"
      ? JSON.stringify([SAMPLE_PUZZLE])
      : relativePath === "service-worker.js"
        ? 'export const CACHE_VERSION = "fixture";'
        : `fixture:${relativePath}`;
    await writeFile(filePath, contents);
  }
  await writeFile(path.join(fixtureRoot, "README.md"), "must not ship");
  await mkdir(path.join(fixtureRoot, "tests"));
  await writeFile(path.join(fixtureRoot, "tests/private.test.mjs"), "must not ship");

  await buildProduction({ projectRoot: fixtureRoot, outputDir: outputRoot });
  const outputFiles = await listFiles(outputRoot);

  assert.deepEqual(outputFiles, [".nojekyll", ...PRODUCTION_FILES].sort());
  assert.equal(outputFiles.includes("README.md"), false);
  assert.equal(outputFiles.some((file) => file.startsWith("tests/")), false);
  assert.equal(outputFiles.includes("assets/angela-source.png"), false);
  assert.match(
    await readFile(path.join(outputRoot, "service-worker.js"), "utf8"),
    /CACHE_VERSION = "build-[0-9a-f]{12}"/,
  );
  const firstWorker = await readFile(path.join(outputRoot, "service-worker.js"), "utf8");
  await buildProduction({ projectRoot: fixtureRoot, outputDir: outputRoot });
  assert.equal(await readFile(path.join(outputRoot, "service-worker.js"), "utf8"), firstWorker);
  await writeFile(
    path.join(fixtureRoot, "service-worker.js"),
    'export const CACHE_VERSION = "fixture";\n// changed worker behavior',
  );
  await buildProduction({ projectRoot: fixtureRoot, outputDir: outputRoot });
  assert.notEqual(await readFile(path.join(outputRoot, "service-worker.js"), "utf8"), firstWorker);
  await assert.rejects(
    buildProduction({ projectRoot: fixtureRoot, outputDir: path.join(tmpdir(), "unsafe-dist") }),
    /must be the dist directory directly inside the project root/,
  );
});

test("puzzle validation fails on malformed JSON and missing launch dates", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "who-am-i-puzzles-"));
  const outputRoot = path.join(fixtureRoot, "dist");
  const malformedPath = path.join(fixtureRoot, "malformed.json");
  await mkdir(path.join(fixtureRoot, "data"));
  await writeFile(malformedPath, "{not json");
  await writeFile(path.join(fixtureRoot, "data/puzzles.json"), "{not json");

  await assert.rejects(loadAndValidatePuzzles(malformedPath), /Could not parse/);
  await assert.rejects(
    buildProduction({ projectRoot: fixtureRoot, outputDir: outputRoot }),
    /Could not parse/,
  );
  assert.throws(
    () => validateDateCoverage([SAMPLE_PUZZLE], { from: "2026-09-22", days: 2 }),
    /Missing puzzle dates: 2026-09-23/,
  );
  assert.doesNotThrow(() =>
    validateDateCoverage([SAMPLE_PUZZLE], { from: "2026-09-22", days: 1 }),
  );
});

test("production document and manifest use root- and subpath-safe local references", async () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const html = await readFile(path.join(projectRoot, "index.html"), "utf8");
  const manifest = JSON.parse(await readFile(path.join(projectRoot, "manifest.webmanifest"), "utf8"));
  const localReferences = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => !/^(?:#|https?:|mailto:)/.test(value));

  assert.ok(localReferences.length > 0);
  assert.equal(localReferences.some((value) => value.startsWith("/")), false);
  assert.equal(manifest.start_url.startsWith("/"), false);
  assert.equal(manifest.scope.startsWith("/"), false);
  assert.equal(manifest.icons.some((icon) => icon.src.startsWith("/")), false);
  assert.match(html, /<a\s+class="wordmark"\s+href="\.\/"/);
});

test("Netlify validates the full schedule before publishing dist", async () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const config = await readFile(path.join(projectRoot, "netlify.toml"), "utf8");

  assert.match(config, /command = "npm run validate:puzzles -- --from 2026-10-20 --days 534 && npm run build"/);
  assert.match(config, /publish = "dist"/);
  assert.match(config, /NODE_VERSION = "20"/);
  assert.match(config, /for = "\/service-worker\.js"/);
  assert.match(config, /for = "\/data\/puzzles\.json"/);
  assert.match(config, /Content-Type = "application\/manifest\+json"/);
});

async function listFiles(root, current = "") {
  const entries = await readdir(path.join(root, current), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, relativePath));
    else files.push(relativePath);
  }

  return files.sort();
}
