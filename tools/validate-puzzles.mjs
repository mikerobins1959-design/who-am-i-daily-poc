import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validatePuzzles } from "../js/game.js";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function loadAndValidatePuzzles(filePath) {
  let puzzles;

  try {
    puzzles = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse ${filePath}: ${error.message}`);
  }

  const validation = validatePuzzles(puzzles);
  if (!validation.valid) throw new Error(validation.reason);
  if (puzzles.length === 0) throw new Error("Puzzle data must include at least one puzzle.");

  return puzzles;
}

export function validateDateCoverage(puzzles, { from, days } = {}) {
  if (from === undefined && days === undefined) return;
  if (!isValidDateKey(from) || !Number.isInteger(days) || days < 1) {
    throw new Error("Coverage requires --from YYYY-MM-DD and a positive integer --days value.");
  }

  const availableDates = new Set(puzzles.map((puzzle) => puzzle.date));
  const cursor = new Date(`${from}T12:00:00Z`);
  const missing = [];

  for (let offset = 0; offset < days; offset += 1) {
    const dateKey = cursor.toISOString().slice(0, 10);
    if (!availableDates.has(dateKey)) missing.push(dateKey);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (missing.length > 0) {
    throw new Error(`Missing puzzle dates: ${missing.join(", ")}`);
  }
}

function parseArguments(args) {
  const result = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--from") result.from = args[++index];
    else if (argument === "--days") result.days = Number(args[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }

  return result;
}

function isValidDateKey(value) {
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const puzzles = await loadAndValidatePuzzles(path.join(projectRoot, "data/puzzles.json"));
    const coverage = parseArguments(process.argv.slice(2));
    validateDateCoverage(puzzles, coverage);

    const dates = puzzles.map((puzzle) => puzzle.date).sort();
    const coverageMessage = coverage.from
      ? ` Coverage confirmed from ${coverage.from} for ${coverage.days} day(s).`
      : "";
    console.log(
      `Validated ${puzzles.length} puzzle(s), ${dates[0]} to ${dates.at(-1)}.${coverageMessage}`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
