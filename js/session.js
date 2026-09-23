import { isGameComplete, prepareStateForDate } from "./game.js";

// Resolves the latest saved state before a UI action. The browser adapter owns
// storage and clock access; keeping this decision pure makes stale-tab and
// midnight behavior deterministic to test.
export function reconcileActionState({
  activeDateKey,
  currentDateKey,
  currentState,
  persistedState,
}) {
  const dateChanged = currentDateKey !== activeDateKey;
  let state = currentState;

  if (persistedState) {
    // Another tab may already have rolled over and made progress on the new
    // date. Preserve that state; the caller's rollover render will then use it
    // directly instead of rebuilding the new day from the stale tab.
    state =
      dateChanged && persistedState.lastPlayedDate === currentDateKey
        ? persistedState
        : prepareStateForDate(persistedState, activeDateKey);
  }

  return {
    state,
    dateChanged,
    canAct: !dateChanged && Boolean(state) && !isGameComplete(state),
  };
}
