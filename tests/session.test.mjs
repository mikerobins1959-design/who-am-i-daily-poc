import assert from "node:assert/strict";
import test from "node:test";

import { createGameState, submitGuess } from "../js/game.js";
import { reconcileActionState } from "../js/session.js";

const puzzle = {
  answer: "Ada Lovelace",
};

test("a completed state from another tab blocks a stale tab action", () => {
  const staleState = createGameState("2026-09-22");
  const completedState = submitGuess(staleState, puzzle, puzzle.answer);

  const result = reconcileActionState({
    activeDateKey: "2026-09-22",
    currentDateKey: "2026-09-22",
    currentState: staleState,
    persistedState: completedState,
  });

  assert.equal(result.canAct, false);
  assert.equal(result.dateChanged, false);
  assert.deepEqual(result.state, completedState);
});

test("reconciliation adopts progress saved by another tab", () => {
  const staleState = createGameState("2026-09-22");
  const progressedState = { ...staleState, currentClueIndex: 1, optionsVisible: true };

  const result = reconcileActionState({
    activeDateKey: "2026-09-22",
    currentDateKey: "2026-09-22",
    currentState: staleState,
    persistedState: progressedState,
  });

  assert.equal(result.canAct, true);
  assert.equal(result.state.currentClueIndex, 1);
  assert.equal(result.state.optionsVisible, true);
});

test("an action is blocked when the local date changed after rendering", () => {
  const staleState = createGameState("2026-09-22");

  const result = reconcileActionState({
    activeDateKey: "2026-09-22",
    currentDateKey: "2026-09-23",
    currentState: staleState,
    persistedState: null,
  });

  assert.equal(result.canAct, false);
  assert.equal(result.dateChanged, true);
  assert.deepEqual(result.state, staleState);
});

test("a date change still adopts a just-completed saved state before rollover", () => {
  const staleState = createGameState("2026-09-22");
  const completedState = submitGuess(staleState, puzzle, puzzle.answer);

  const result = reconcileActionState({
    activeDateKey: "2026-09-22",
    currentDateKey: "2026-09-23",
    currentState: staleState,
    persistedState: completedState,
  });

  assert.equal(result.dateChanged, true);
  assert.deepEqual(result.state, completedState);
});

test("a stale tab preserves progress another tab made after date rollover", () => {
  const staleState = createGameState("2026-09-22");
  const newDateState = {
    ...createGameState("2026-09-23", staleState.stats, "2026-09-22"),
    currentClueIndex: 1,
    optionsVisible: true,
  };

  const result = reconcileActionState({
    activeDateKey: "2026-09-22",
    currentDateKey: "2026-09-23",
    currentState: staleState,
    persistedState: newDateState,
  });

  assert.equal(result.dateChanged, true);
  assert.deepEqual(result.state, newDateState);
});
