import { DATE_CHECK_INTERVAL_MS, PUZZLES_URL, STORAGE_KEY } from "./config.js";
import {
  GAME_STATUS,
  advanceClue,
  createDefaultStats,
  findPuzzleForDate,
  getLocalDateKey,
  isGameComplete,
  parseStoredState,
  prepareStateForDate,
  revealOptions,
  submitGuess,
  validatePuzzles,
} from "./game.js";
import { reconcileActionState } from "./session.js";

const elements = {
  appStatus: document.querySelector("#app-status"),
  loadingState: document.querySelector("#loading-state"),
  gameState: document.querySelector("#game-state"),
  missingState: document.querySelector("#missing-state"),
  errorState: document.querySelector("#error-state"),
  puzzleDate: document.querySelector("#puzzle-date"),
  stageLabel: document.querySelector("#stage-label"),
  scoreValue: document.querySelector("#score-value"),
  scoreUnit: document.querySelector("#score-unit"),
  clueList: document.querySelector("#clue-list"),
  showOptionsButton: document.querySelector("#show-options-button"),
  nextClueButton: document.querySelector("#next-clue-button"),
  answerPanel: document.querySelector("#answer-panel"),
  answerOptions: document.querySelector("#answer-options"),
  resultPanel: document.querySelector("#result-panel"),
  resultTitle: document.querySelector("#result-title"),
  resultMessage: document.querySelector("#result-message"),
  statsPanel: document.querySelector("#stats-panel"),
  statPlayed: document.querySelector("#stat-played"),
  statWins: document.querySelector("#stat-wins"),
  statCurrentStreak: document.querySelector("#stat-current-streak"),
  statMaxStreak: document.querySelector("#stat-max-streak"),
  missingDate: document.querySelector("#missing-date"),
  errorMessage: document.querySelector("#error-message"),
  storageWarning: document.querySelector("#storage-warning"),
};

let puzzles = [];
let puzzle = null;
let state = null;
let activeDateKey = "";
let storageWarning = "";
let initialized = false;
let hasUnsavedChanges = false;

elements.showOptionsButton.addEventListener("click", () => {
  if (!prepareForAction()) return;
  state = revealOptions(state);
  saveState();
  renderGame();
  elements.answerOptions.querySelector(".answer-option")?.focus();
  announce("Answer options revealed.");
});

elements.nextClueButton.addEventListener("click", () => {
  if (!prepareForAction() || state.currentClueIndex >= 2) return;
  state = advanceClue(state);
  saveState();
  renderGame();
  announce(`Clue ${state.currentClueIndex + 1} revealed.`);
});

window.addEventListener("storage", synchronizeWithEnvironment);
window.addEventListener("focus", synchronizeWithEnvironment);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) synchronizeWithEnvironment();
});

initialize();

async function initialize() {
  state = loadState();

  try {
    const response = await fetch(PUZZLES_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Puzzle data request failed with status ${response.status}.`);
    }

    const data = await response.json();
    const validation = validatePuzzles(data);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    puzzles = data;
    initialized = true;
    showToday();
    window.setInterval(checkForDateChange, DATE_CHECK_INTERVAL_MS);
  } catch (error) {
    showError(error instanceof Error ? error.message : "The puzzle could not be loaded.");
  }
}

function loadState() {
  return readStoredState().state;
}

function readStoredState() {
  try {
    const parsed = parseStoredState(window.localStorage.getItem(STORAGE_KEY));
    if (parsed.warning) storageWarning = parsed.warning;
    return { state: parsed.state, available: true };
  } catch {
    storageWarning = "Browser storage is unavailable. Progress may be lost when this page closes.";
    return { state: null, available: false };
  }
}

function saveState() {
  if (!state) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    hasUnsavedChanges = false;
  } catch {
    hasUnsavedChanges = true;
    storageWarning = "Progress could not be saved. Keep this page open to continue this game.";
  }

  renderStorageWarning();
}

function showToday() {
  activeDateKey = getLocalDateKey();
  puzzle = findPuzzleForDate(puzzles, activeDateKey);

  if (!puzzle) {
    renderMissingPuzzle();
    return;
  }

  const nextState = prepareStateForDate(state, activeDateKey);
  const stateChanged = JSON.stringify(nextState) !== JSON.stringify(state);
  state = nextState;

  if (stateChanged) saveState();
  renderGame();
}

function checkForDateChange() {
  synchronizeWithEnvironment();
}

function prepareForAction() {
  const result = synchronizeWithEnvironment();
  return Boolean(result?.canAct && puzzle);
}

function synchronizeWithEnvironment() {
  if (!initialized) return null;

  const currentDateKey = getLocalDateKey();
  const persistedState = hasUnsavedChanges ? null : readStoredState().state;

  // A missing-puzzle view has no daily state of its own. It may still receive
  // updated historical stats from another tab, but must not create a state for
  // the missing date merely because a focus or storage event fired.
  if (!puzzle && currentDateKey === activeDateKey) {
    const changed = persistedState && JSON.stringify(persistedState) !== JSON.stringify(state);
    if (changed) {
      state = persistedState;
      renderMissingPuzzle();
    } else {
      renderStorageWarning();
    }
    return { state, dateChanged: false, canAct: false };
  }

  const result = reconcileActionState({
    activeDateKey,
    currentDateKey,
    currentState: state,
    persistedState,
  });
  const stateChanged = JSON.stringify(result.state) !== JSON.stringify(state);
  state = result.state;

  if (result.dateChanged) {
    showToday();
    announce(`The local date changed to ${activeDateKey}.`);
    return { state, dateChanged: true, canAct: false };
  }

  if (stateChanged) renderGame();
  else renderStorageWarning();

  return result;
}

function renderGame() {
  showView(elements.gameState);
  elements.statsPanel.hidden = false;
  elements.puzzleDate.textContent = activeDateKey;
  elements.stageLabel.textContent = isGameComplete(state)
    ? "Daily result"
    : `Clue ${state.currentClueIndex + 1} of 3`;
  const pointsOnOffer = isGameComplete(state) ? state.score : 3 - state.currentClueIndex;
  elements.scoreValue.textContent = String(pointsOnOffer);
  elements.scoreUnit.textContent = pointsOnOffer === 1 ? "pt" : "pts";

  renderClues();
  renderOptions();
  renderResult();
  renderStats(state.stats);
  renderStorageWarning();
}

function renderClues() {
  elements.clueList.replaceChildren();

  puzzle.clues.forEach((clue, index) => {
    const item = document.createElement("li");
    item.id = `clue-${index + 1}`;
    item.className = "clue";

    if (index > state.currentClueIndex) {
      item.hidden = true;
    }

    if (index === state.currentClueIndex) {
      item.classList.add("clue--current");
    }

    const label = document.createElement("span");
    label.className = "clue__label";
    label.textContent = `Clue ${index + 1}`;

    const text = document.createElement("p");
    text.textContent = clue;

    item.append(label, text);
    elements.clueList.append(item);
  });
}

function renderOptions() {
  const complete = isGameComplete(state);
  elements.showOptionsButton.hidden = state.optionsVisible || complete;
  elements.showOptionsButton.disabled = complete;
  elements.nextClueButton.hidden = complete || state.currentClueIndex >= 2;
  elements.nextClueButton.disabled = complete;
  elements.answerPanel.hidden = !state.optionsVisible || complete;
  elements.answerOptions.replaceChildren();

  if (!state.optionsVisible) return;

  puzzle.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-option";
    button.textContent = option;
    button.disabled = complete;
    button.addEventListener("click", () => makeGuess(option));
    elements.answerOptions.append(button);
  });
}

function makeGuess(selectedOption) {
  if (!prepareForAction()) return;

  state = submitGuess(state, puzzle, selectedOption);
  saveState();
  renderGame();
  elements.resultPanel.focus();

  announce(
    state.gameStatus === GAME_STATUS.WON
      ? `Correct. You scored ${state.score} point${state.score === 1 ? "" : "s"}.`
      : `Incorrect. Today's game is over.`,
  );
}

function renderResult() {
  const complete = isGameComplete(state);
  elements.resultPanel.hidden = !complete;
  if (!complete) return;

  if (state.gameStatus === GAME_STATUS.WON) {
    elements.resultTitle.textContent = "Correct";
    elements.resultMessage.textContent = `You identified ${puzzle.answer} for ${state.score} point${state.score === 1 ? "" : "s"}.`;
  } else {
    elements.resultTitle.textContent = "Sudden death";
    elements.resultMessage.textContent = `That answer was incorrect. Today's answer was ${puzzle.answer}.`;
  }
}

function renderMissingPuzzle() {
  showView(elements.missingState);
  elements.statsPanel.hidden = false;
  elements.missingDate.textContent = activeDateKey;
  renderStats(state?.stats ?? createDefaultStats());
  renderStorageWarning();
  announce(`No puzzle is scheduled for ${activeDateKey}.`);
}

function showError(message) {
  showView(elements.errorState);
  elements.statsPanel.hidden = false;
  elements.errorMessage.textContent = message;
  renderStats(state?.stats ?? createDefaultStats());
  renderStorageWarning();
  announce("The game could not be loaded.");
}

function showView(view) {
  [elements.loadingState, elements.gameState, elements.missingState, elements.errorState].forEach(
    (candidate) => {
      candidate.hidden = candidate !== view;
    },
  );
}

function renderStats(stats) {
  elements.statPlayed.textContent = String(stats.played);
  elements.statWins.textContent = String(stats.wins);
  elements.statCurrentStreak.textContent = String(stats.currentStreak);
  elements.statMaxStreak.textContent = String(stats.maxStreak);

  const scores = [3, 2, 1, 0];
  const largest = Math.max(...scores.map((score) => stats.scoreDistribution[String(score)]));

  for (const score of scores) {
    const row = document.querySelector(`#distribution-${score}`);
    if (!row) continue;

    const count = stats.scoreDistribution[String(score)];
    row.querySelector(".distribution-value").textContent = String(count);

    // Scale each bar against the largest bucket rather than the total, so the
    // shape of the distribution stays readable at any number of games played.
    row.querySelector(".distribution-bar").style.setProperty(
      "--distribution-width",
      largest === 0 ? "0%" : `${(count / largest) * 100}%`,
    );
  }
}

function renderStorageWarning() {
  elements.storageWarning.hidden = storageWarning.length === 0;
  elements.storageWarning.textContent = storageWarning;
}

function announce(message) {
  elements.appStatus.textContent = message;
}
