import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { importClientQuestions, LAUNCH_DATE, mixQuestionsByCategory } from "../tools/import-client-questions.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(await readFile(path.join(projectRoot, "client-handoff/questions.json"), "utf8"));
const checkedInPuzzles = JSON.parse(await readFile(path.join(projectRoot, "data/puzzles.json"), "utf8"));

test("client questions import reproduces the checked-in continuous schedule", () => {
  const sourceSnapshot = structuredClone(source);
  const first = importClientQuestions(source);
  const second = importClientQuestions(source);

  assert.equal(first.duplicatesRemoved, 0);
  assert.equal(first.puzzles.length, 534);
  assert.equal(first.puzzles[0].date, LAUNCH_DATE);
  assert.equal(first.puzzles.at(-1).date, "2028-04-05");
  assert.deepEqual(first.puzzles, second.puzzles);
  assert.deepEqual(first.puzzles, checkedInPuzzles);
  assert.deepEqual(source, sourceSnapshot);
  for (let index = 1; index < first.puzzles.length; index += 1) {
    const previous = new Date(`${first.puzzles[index - 1].date}T12:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() + 1);
    assert.equal(first.puzzles[index].date, previous.toISOString().slice(0, 10));
  }
});

test("mixed schedule preserves content and separates adjacent categories", () => {
  const mixed = mixQuestionsByCategory(source);
  assert.equal(mixed.length, source.length);
  assert.deepEqual(new Set(mixed), new Set(source));
  assert.equal(
    mixed.some((question, index) => index > 0 && question.category === mixed[index - 1].category),
    false,
  );

  const perCategorySource = groupByCategory(source);
  const perCategoryMixed = groupByCategory(mixed);
  for (const [category, records] of perCategorySource) {
    assert.deepEqual(perCategoryMixed.get(category), records);
  }

  const previousAnswerIndex = new Map();
  for (const [index, question] of mixed.entries()) {
    const previousIndex = previousAnswerIndex.get(question.target_answer);
    if (previousIndex !== undefined) assert.ok(index - previousIndex > 30);
    previousAnswerIndex.set(question.target_answer, index);
  }
});

test("exact duplicate content is removed without collapsing repeated identities", () => {
  const base = source[0];
  const repeatedIdentity = {
    ...source[1],
    target_answer: base.target_answer,
    options: [base.target_answer, ...source[1].options.slice(1)],
  };
  const exactDuplicate = structuredClone(base);
  const result = importClientQuestions([base, repeatedIdentity, exactDuplicate]);

  assert.equal(result.duplicatesRemoved, 1);
  assert.equal(result.puzzles.length, 2);
  assert.equal(result.puzzles.filter((puzzle) => puzzle.answer === base.target_answer).length, 2);
});

test("import rejects invalid launch dates and non-matching answers", () => {
  assert.throws(() => importClientQuestions(source, { launchDate: "2026-02-30" }), /Launch date/);
  const invalid = structuredClone(source[0]);
  invalid.target_answer = "Not an exact choice";
  assert.throws(() => importClientQuestions([invalid]), /exactly match a choice/);
  const blankChoice = structuredClone(source[0]);
  blankChoice.alt_answers[0] = "   ";
  assert.throws(() => importClientQuestions([blankChoice]), /four options and four alt_answers/);
});

function groupByCategory(questions) {
  const groups = new Map();
  for (const question of questions) {
    if (!groups.has(question.category)) groups.set(question.category, []);
    groups.get(question.category).push(question);
  }
  return groups;
}
