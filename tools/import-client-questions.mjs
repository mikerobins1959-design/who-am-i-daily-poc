import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LAUNCH_DATE = "2026-10-20";

export function importClientQuestions(source, { launchDate = LAUNCH_DATE } = {}) {
  if (!Array.isArray(source) || source.length === 0) {
    throw new Error("Client questions must be a non-empty array.");
  }
  if (!isValidDateKey(launchDate)) throw new Error("Launch date must use YYYY-MM-DD.");

  const seenContent = new Set();
  const unique = [];

  source.forEach((question, index) => {
    validateSourceQuestion(question, index + 1);
    const contentKey = JSON.stringify([
      question.target_answer,
      question.clues,
      [...question.options, ...question.alt_answers].sort(),
    ]);
    if (!seenContent.has(contentKey)) {
      seenContent.add(contentKey);
      unique.push(question);
    }
  });

  const scheduled = mixQuestionsByCategory(unique);
  const puzzles = scheduled.map((question, index) => ({
    date: addDays(launchDate, index),
    answer: question.target_answer,
    clues: [...question.clues],
    options: [...question.options, ...question.alt_answers],
  }));

  return { puzzles, duplicatesRemoved: source.length - unique.length };
}

export function mixQuestionsByCategory(questions) {
  const groups = new Map();
  for (const question of questions) {
    if (!groups.has(question.category)) groups.set(question.category, []);
    groups.get(question.category).push(question);
  }

  const queues = [...groups.entries()].map(([category, records], order) => ({
    category,
    records: [...records],
    order,
    cursor: 0,
  }));
  const result = [];
  let previousCategory = null;
  const recentAnswers = [];

  while (result.length < questions.length) {
    const available = queues
      .filter((queue) => queue.cursor < queue.records.length)
      .sort((left, right) => {
        const leftRemaining = left.records.length - left.cursor;
        const rightRemaining = right.records.length - right.cursor;
        return rightRemaining - leftRemaining || left.order - right.order;
      });
    const selected = available.find((queue) =>
      queue.category !== previousCategory &&
      !recentAnswers.includes(queue.records[queue.cursor].target_answer)
    ) ?? available.find((queue) => queue.category !== previousCategory) ?? available[0];
    const question = selected.records[selected.cursor];
    result.push(question);
    selected.cursor += 1;
    previousCategory = selected.category;
    recentAnswers.push(question.target_answer);
    if (recentAnswers.length > 30) recentAnswers.shift();
  }

  return result;
}

function validateSourceQuestion(question, recordNumber) {
  const label = `Client question ${recordNumber}`;
  if (!question || typeof question !== "object" || Array.isArray(question)) {
    throw new Error(`${label} must be an object.`);
  }
  for (const field of ["topic_code", "category", "target_answer"]) {
    if (typeof question[field] !== "string" || !question[field].trim()) {
      throw new Error(`${label} must have a non-empty ${field}.`);
    }
  }
  if (!isStringArray(question.clues, 3)) throw new Error(`${label} must have three clues.`);
  if (!isStringArray(question.options, 4) || !isStringArray(question.alt_answers, 4)) {
    throw new Error(`${label} must have four options and four alt_answers.`);
  }
  const choices = [...question.options, ...question.alt_answers];
  if (new Set(choices).size !== choices.length) throw new Error(`${label} has duplicate choices.`);
  if (!choices.includes(question.target_answer)) {
    throw new Error(`${label}'s target_answer must exactly match a choice.`);
  }
}

function isStringArray(value, length) {
  return Array.isArray(value) && value.length === length && value.every(
    (item) => typeof item === "string" && item.trim().length > 0,
  );
}

function addDays(dateKey, offset) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  try {
    return addDays(value, 0) === value;
  } catch {
    return false;
  }
}

async function run() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const sourcePath = path.join(projectRoot, "client-handoff/questions.json");
  const outputPath = path.join(projectRoot, "data/puzzles.json");
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  const { puzzles, duplicatesRemoved } = importClientQuestions(source);
  await writeFile(outputPath, `${JSON.stringify(puzzles, null, 2)}\n`, "utf8");
  console.log(
    `Imported ${puzzles.length} puzzles from ${puzzles[0].date} to ${puzzles.at(-1).date}; `
      + `${duplicatesRemoved} exact duplicate(s) removed.`,
  );
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
