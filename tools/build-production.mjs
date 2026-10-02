import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadAndValidatePuzzles } from "./validate-puzzles.mjs";

export const PRODUCTION_FILES = Object.freeze([
  "index.html",
  "manifest.webmanifest",
  "service-worker.js",
  "css/styles.css",
  "data/puzzles.json",
  "js/app.js",
  "js/config.js",
  "js/game.js",
  "js/info.js",
  "js/intro.js",
  "js/pwa.js",
  "js/session.js",
  "js/share.js",
  "assets/angela-final.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/apple-touch-icon-180.png",
]);

export async function buildProduction({ projectRoot = getProjectRoot(), outputDir } = {}) {
  const sourceRoot = path.resolve(projectRoot);
  const destinationRoot = path.resolve(outputDir ?? path.join(sourceRoot, "dist"));
  if (path.dirname(destinationRoot) !== sourceRoot || path.basename(destinationRoot) !== "dist") {
    throw new Error("Production output must be the dist directory directly inside the project root.");
  }

  await loadAndValidatePuzzles(path.join(sourceRoot, "data/puzzles.json"));
  await Promise.all(
    PRODUCTION_FILES.map((relativePath) => access(path.join(sourceRoot, relativePath))),
  );
  const fingerprint = await createBuildFingerprint(sourceRoot);

  const stagingRoot = `${destinationRoot}.tmp-${process.pid}`;
  await rm(stagingRoot, { recursive: true, force: true });

  try {
    for (const relativePath of PRODUCTION_FILES) {
      const sourcePath = path.join(sourceRoot, relativePath);
      const destinationPath = path.join(stagingRoot, relativePath);
      await mkdir(path.dirname(destinationPath), { recursive: true });
      await copyFile(sourcePath, destinationPath);
    }

    const workerPath = path.join(stagingRoot, "service-worker.js");
    const workerSource = await readFile(workerPath, "utf8");
    const stampedWorker = workerSource.replace(
      /export const CACHE_VERSION = "[^"]+";/,
      `export const CACHE_VERSION = "build-${fingerprint}";`,
    );
    if (stampedWorker === workerSource) {
      throw new Error("Service worker cache version declaration was not found.");
    }
    await writeFile(workerPath, stampedWorker, "utf8");

    await writeFile(path.join(stagingRoot, ".nojekyll"), "", "utf8");
    await rm(destinationRoot, { recursive: true, force: true });
    await rename(stagingRoot, destinationRoot);
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true });
    throw error;
  }

  return destinationRoot;
}

export async function createBuildFingerprint(projectRoot = getProjectRoot()) {
  const hash = createHash("sha256");

  for (const relativePath of PRODUCTION_FILES) {
    let contents = await readFile(path.join(projectRoot, relativePath));
    if (relativePath === "service-worker.js") {
      contents = Buffer.from(
        contents
          .toString("utf8")
          .replace(
            /export const CACHE_VERSION = "[^"]+";/,
            'export const CACHE_VERSION = "__BUILD_FINGERPRINT__";',
          ),
      );
    }
    hash.update(relativePath);
    hash.update("\0");
    hash.update(contents);
    hash.update("\0");
  }

  return hash.digest("hex").slice(0, 12);
}

function getProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    const outputDir = await buildProduction();
    console.log(`Built ${PRODUCTION_FILES.length + 1} production files in ${outputDir}.`);
  } catch (error) {
    console.error(`Production build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
