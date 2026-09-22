export const GAME_STATUS = Object.freeze({
  IN_PROGRESS: "IN_PROGRESS",
  WON: "WON",
  FAILED: "FAILED",
});

const SCORE_BY_CLUE = Object.freeze([3, 2, 1]);
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getLocalDateKey(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("A valid Date is required.");
  }

  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validatePuzzles(puzzles) {
  if (!Array.isArray(puzzles)) {
    return { valid: false, reason: "Puzzle data must be an array." };
  }

  const dates = new Set();

  for (const [index, puzzle] of puzzles.entries()) {
    const label = `Puzzle ${index + 1}`;

    if (!isPlainObject(puzzle)) {
      return { valid: false, reason: `${label} must be an object.` };
    }

    if (!isValidDateKey(puzzle.date)) {
      return { valid: false, reason: `${label} has an invalid date.` };
    }

    if (dates.has(puzzle.date)) {
      return { valid: false, reason: `${label} duplicates date ${puzzle.date}.` };
    }
    dates.add(puzzle.date);

    if (typeof puzzle.answer !== "string" || puzzle.answer.length === 0) {
      return { valid: false, reason: `${label} must have a non-empty answer.` };
    }

    if (
      !Array.isArray(puzzle.clues) ||
      puzzle.clues.length !== 3 ||
      puzzle.clues.some((clue) => typeof clue !== "string" || clue.length === 0)
    ) {
      return { valid: false, reason: `${label} must have exactly 3 non-empty clues.` };
    }

    if (
      !Array.isArray(puzzle.options) ||
      puzzle.options.length !== 8 ||
      puzzle.options.some((option) => typeof option !== "string" || option.length === 0)
    ) {
      return { valid: false, reason: `${label} must have exactly 8 non-empty options.` };
    }

    if (new Set(puzzle.options).size !== puzzle.options.length) {
      return { valid: false, reason: `${label} must have 8 distinct options.` };
    }

    if (!puzzle.options.includes(puzzle.answer)) {
      return { valid: false, reason: `${label}'s answer must exactly match one option.` };
    }
  }

  return { valid: true, reason: "" };
}

export function findPuzzleForDate(puzzles, dateKey) {
  return puzzles.find((puzzle) => puzzle.date === dateKey) ?? null;
}

export function createDefaultStats() {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    scoreDistribution: {
      "3": 0,
      "2": 0,
      "1": 0,
      "0": 0,
    },
  };
}

export function createGameState(dateKey, stats = createDefaultStats(), lastCompletedDate = null) {
  if (!isValidDateKey(dateKey)) {
    throw new TypeError("A valid YYYY-MM-DD date key is required.");
  }

  if (lastCompletedDate !== null && !isValidDateKey(lastCompletedDate)) {
    throw new TypeError("lastCompletedDate must be null or a valid YYYY-MM-DD date key.");
  }

  return {
    lastPlayedDate: dateKey,
    lastCompletedDate,
    gameStatus: GAME_STATUS.IN_PROGRESS,
    currentClueIndex: 0,
    score: 0,
    optionsVisible: false,
    stats: cloneStats(stats),
  };
}

export function parseStoredState(serialized) {
  if (serialized === null) {
    return { state: null, warning: "" };
  }

  try {
    const state = JSON.parse(serialized);
    if (!isValidState(state)) {
      return {
        state: null,
        warning: "Saved game data was invalid and was ignored.",
      };
    }
    return { state: cloneState(state), warning: "" };
  } catch {
    return {
      state: null,
      warning: "Saved game data could not be read and was ignored.",
    };
  }
}

export function prepareStateForDate(savedState, dateKey) {
  if (!isValidDateKey(dateKey)) {
    throw new TypeError("A valid YYYY-MM-DD date key is required.");
  }

  if (!savedState) {
    return createGameState(dateKey);
  }

  if (!isValidState(savedState)) {
    return createGameState(dateKey);
  }

  if (savedState.lastPlayedDate === dateKey) {
    return cloneState(savedState);
  }

  return createGameState(dateKey, savedState.stats, savedState.lastCompletedDate);
}

export function revealOptions(state) {
  if (state.gameStatus !== GAME_STATUS.IN_PROGRESS || state.optionsVisible) {
    return cloneState(state);
  }

  return { ...cloneState(state), optionsVisible: true };
}

export function advanceClue(state) {
  if (
    state.gameStatus !== GAME_STATUS.IN_PROGRESS ||
    state.currentClueIndex >= SCORE_BY_CLUE.length - 1
  ) {
    return cloneState(state);
  }

  return {
    ...cloneState(state),
    currentClueIndex: state.currentClueIndex + 1,
  };
}

export function submitGuess(state, puzzle, selectedOption) {
  if (state.gameStatus !== GAME_STATUS.IN_PROGRESS) {
    return cloneState(state);
  }

  const correct = selectedOption === puzzle.answer;
  const score = correct ? SCORE_BY_CLUE[state.currentClueIndex] : 0;
  const stats = cloneStats(state.stats);

  stats.played += 1;
  stats.scoreDistribution[String(score)] += 1;

  if (correct) {
    stats.wins += 1;
    const previousDay = getPreviousDateKey(state.lastPlayedDate);
    stats.currentStreak = state.lastCompletedDate === previousDay ? stats.currentStreak + 1 : 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }

  return {
    ...cloneState(state),
    lastCompletedDate: state.lastPlayedDate,
    gameStatus: correct ? GAME_STATUS.WON : GAME_STATUS.FAILED,
    score,
    stats,
  };
}

export function isGameComplete(state) {
  return state.gameStatus === GAME_STATUS.WON || state.gameStatus === GAME_STATUS.FAILED;
}

function cloneState(state) {
  const inferredCompletionDate =
    state.gameStatus === GAME_STATUS.WON || state.gameStatus === GAME_STATUS.FAILED
      ? state.lastPlayedDate
      : null;

  return {
    ...state,
    lastCompletedDate: state.lastCompletedDate ?? inferredCompletionDate,
    optionsVisible: state.optionsVisible ?? false,
    stats: cloneStats(state.stats),
  };
}

function cloneStats(stats) {
  return {
    ...stats,
    scoreDistribution: { ...stats.scoreDistribution },
  };
}

function isValidState(state) {
  if (!isPlainObject(state) || !isValidDateKey(state.lastPlayedDate)) {
    return false;
  }

  if (!Object.values(GAME_STATUS).includes(state.gameStatus)) {
    return false;
  }

  if (
    state.lastCompletedDate !== undefined &&
    state.lastCompletedDate !== null &&
    !isValidDateKey(state.lastCompletedDate)
  ) {
    return false;
  }

  if (!Number.isInteger(state.currentClueIndex) || state.currentClueIndex < 0 || state.currentClueIndex > 2) {
    return false;
  }

  if (![0, 1, 2, 3].includes(state.score)) {
    return false;
  }

  if (state.optionsVisible !== undefined && typeof state.optionsVisible !== "boolean") {
    return false;
  }

  if (state.gameStatus === GAME_STATUS.IN_PROGRESS && state.score !== 0) {
    return false;
  }

  if (state.gameStatus === GAME_STATUS.WON && state.score !== SCORE_BY_CLUE[state.currentClueIndex]) {
    return false;
  }

  if (state.gameStatus === GAME_STATUS.FAILED && state.score !== 0) {
    return false;
  }

  if (
    state.lastCompletedDate !== undefined &&
    state.gameStatus !== GAME_STATUS.IN_PROGRESS &&
    state.lastCompletedDate !== state.lastPlayedDate
  ) {
    return false;
  }

  return isValidStats(state.stats);
}

function isValidStats(stats) {
  if (!isPlainObject(stats) || !isPlainObject(stats.scoreDistribution)) {
    return false;
  }

  const counts = [stats.played, stats.wins, stats.currentStreak, stats.maxStreak];
  const distribution = ["3", "2", "1", "0"].map((key) => stats.scoreDistribution[key]);

  if (![...counts, ...distribution].every(isNonNegativeInteger)) {
    return false;
  }

  if (stats.wins > stats.played || stats.currentStreak > stats.maxStreak) {
    return false;
  }

  const totalScores = distribution.reduce((sum, value) => sum + value, 0);
  const winningScores =
    stats.scoreDistribution["3"] + stats.scoreDistribution["2"] + stats.scoreDistribution["1"];

  return totalScores === stats.played && winningScores === stats.wins;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidDateKey(value) {
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function getPreviousDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
