import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GAME_STATUS,
  advanceClue,
  createGameState,
  findPuzzleForDate,
  getLocalDateKey,
  parseStoredState,
  prepareStateForDate,
  revealOptions,
  submitGuess,
  validatePuzzles,
} from "../js/game.js";

const puzzle = {
  date: "2026-09-22",
  answer: "Ada Lovelace",
  clues: ["Clue one", "Clue two", "Clue three"],
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

test("formats the player's local date without relying on UTC", () => {
  const localDate = new Date(2026, 8, 22, 23, 30);
  assert.equal(getLocalDateKey(localDate), "2026-09-22");
});

test("validates the checked-in issue #3 puzzle data", async () => {
  const raw = await readFile(new URL("../data/puzzles.json", import.meta.url), "utf8");
  const puzzles = JSON.parse(raw);

  assert.deepEqual(validatePuzzles(puzzles), { valid: true, reason: "" });
  assert.equal(findPuzzleForDate(puzzles, "2026-09-22")?.answer, "Ada Lovelace");
  assert.equal(findPuzzleForDate(puzzles, "2026-09-23"), null);
});

test("rejects puzzle data with an answer that is not an exact option", () => {
  const invalid = [{ ...puzzle, answer: "ada lovelace" }];
  assert.equal(validatePuzzles(invalid).valid, false);
});

for (const [advances, expectedScore] of [
  [0, 3],
  [1, 2],
  [2, 1],
]) {
  test(`a correct exact answer after ${advances} advance(s) wins ${expectedScore} point(s)`, () => {
    let state = createGameState(puzzle.date);
    for (let index = 0; index < advances; index += 1) {
      state = advanceClue(state);
    }

    const result = submitGuess(state, puzzle, "Ada Lovelace");

    assert.equal(result.gameStatus, GAME_STATUS.WON);
    assert.equal(result.score, expectedScore);
    assert.equal(result.stats.played, 1);
    assert.equal(result.stats.wins, 1);
    assert.equal(result.stats.scoreDistribution[String(expectedScore)], 1);
    assert.equal(result.stats.currentStreak, 1);
    assert.equal(result.stats.maxStreak, 1);
  });
}

test("guess comparison is exact and a wrong answer ends the day at zero", () => {
  const state = createGameState(puzzle.date);
  const result = submitGuess(state, puzzle, "ada lovelace");

  assert.equal(result.gameStatus, GAME_STATUS.FAILED);
  assert.equal(result.score, 0);
  assert.equal(result.stats.played, 1);
  assert.equal(result.stats.wins, 0);
  assert.equal(result.stats.scoreDistribution["0"], 1);
  assert.equal(result.stats.currentStreak, 0);
});

for (const advances of [0, 1, 2]) {
  test(`a wrong answer at clue ${advances + 1} triggers sudden death`, () => {
    let state = createGameState(puzzle.date);
    for (let index = 0; index < advances; index += 1) {
      state = advanceClue(state);
    }

    const result = submitGuess(state, puzzle, "Grace Hopper");
    assert.equal(result.gameStatus, GAME_STATUS.FAILED);
    assert.equal(result.score, 0);
    assert.equal(result.stats.played, 1);
    assert.equal(result.stats.scoreDistribution["0"], 1);
    assert.equal(result.lastCompletedDate, puzzle.date);
  });
}

test("advancing lowers the available score and stops at clue three", () => {
  const clueTwo = advanceClue(createGameState(puzzle.date));
  const clueThree = advanceClue(clueTwo);
  const unchanged = advanceClue(clueThree);

  assert.equal(clueTwo.currentClueIndex, 1);
  assert.equal(clueThree.currentClueIndex, 2);
  assert.deepEqual(unchanged, clueThree);
});

test("requesting options persists while advancing", () => {
  const revealed = revealOptions(createGameState(puzzle.date));
  const advanced = advanceClue(revealed);

  assert.equal(revealed.optionsVisible, true);
  assert.equal(advanced.optionsVisible, true);
});

test("a completed daily game cannot be replayed or counted twice", () => {
  const won = submitGuess(createGameState(puzzle.date), puzzle, puzzle.answer);
  const refreshed = parseStoredState(JSON.stringify(won)).state;
  const replay = submitGuess(refreshed, puzzle, "Grace Hopper");

  assert.deepEqual(replay, won);
  assert.equal(replay.stats.played, 1);
  assert.equal(replay.stats.wins, 1);
});

test("legacy issue-schema state restores with safe defaults for additive fields", () => {
  const legacyState = createGameState(puzzle.date);
  delete legacyState.optionsVisible;
  delete legacyState.lastCompletedDate;

  const restored = parseStoredState(JSON.stringify(legacyState)).state;
  assert.equal(restored.optionsVisible, false);
  assert.equal(restored.lastCompletedDate, null);
});

test("a valid saved in-progress game restores its clue and options", () => {
  const saved = advanceClue(revealOptions(createGameState(puzzle.date)));
  const parsed = parseStoredState(JSON.stringify(saved));
  const restored = prepareStateForDate(parsed.state, puzzle.date);

  assert.equal(parsed.warning, "");
  assert.deepEqual(restored, saved);
});

test("malformed or internally inconsistent storage fails safely", () => {
  const malformed = parseStoredState("{not json");
  assert.equal(malformed.state, null);
  assert.match(malformed.warning, /could not be read/);

  const inconsistent = createGameState(puzzle.date);
  inconsistent.stats.played = 4;
  const invalid = parseStoredState(JSON.stringify(inconsistent));
  assert.equal(invalid.state, null);
  assert.match(invalid.warning, /invalid/);
});

test("the next local date starts a new game and retains statistics", () => {
  const completed = submitGuess(createGameState("2026-09-22"), puzzle, puzzle.answer);
  const nextDay = prepareStateForDate(completed, "2026-09-23");

  assert.equal(nextDay.lastPlayedDate, "2026-09-23");
  assert.equal(nextDay.gameStatus, GAME_STATUS.IN_PROGRESS);
  assert.equal(nextDay.currentClueIndex, 0);
  assert.equal(nextDay.stats.played, 1);
  assert.equal(nextDay.stats.currentStreak, 1);
  assert.equal(nextDay.lastCompletedDate, "2026-09-22");
});

test("a skipped date breaks the streak when the next game is completed", () => {
  const priorWin = submitGuess(createGameState("2026-09-22"), puzzle, puzzle.answer);
  const skippedDay = prepareStateForDate(priorWin, "2026-09-24");
  assert.equal(skippedDay.stats.currentStreak, 1);

  const completedAfterSkip = submitGuess(skippedDay, puzzle, puzzle.answer);
  assert.equal(completedAfterSkip.stats.currentStreak, 1);
  assert.equal(completedAfterSkip.stats.maxStreak, 1);

  const lossAfterSkip = submitGuess(skippedDay, puzzle, "Grace Hopper");
  assert.equal(lossAfterSkip.stats.currentStreak, 0);
});

test("a win continues the streak only after a completion on the previous date", () => {
  const firstWin = submitGuess(createGameState("2026-09-22"), puzzle, puzzle.answer);
  const nextDay = prepareStateForDate(firstWin, "2026-09-23");
  const secondWin = submitGuess(nextDay, puzzle, puzzle.answer);

  assert.equal(secondWin.stats.currentStreak, 2);
  assert.equal(secondWin.stats.maxStreak, 2);
  assert.equal(secondWin.lastCompletedDate, "2026-09-23");
});

test("an abandoned game breaks the streak when a later game is completed", () => {
  const priorWin = submitGuess(createGameState("2026-09-22"), puzzle, puzzle.answer);
  const inProgress = prepareStateForDate(priorWin, "2026-09-23");
  const followingDay = prepareStateForDate(inProgress, "2026-09-24");
  const win = submitGuess(followingDay, puzzle, puzzle.answer);

  assert.equal(win.stats.currentStreak, 1);
});

test("missing puzzle lookup returns null without inventing content", () => {
  assert.equal(findPuzzleForDate([puzzle], "2026-09-23"), null);
});
