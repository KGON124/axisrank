// LocalStorage persistence layer

import type { AppState } from "./types";
import { defaultScoreConfig } from "./types";

const STORAGE_KEY = "axisrank-state";

/**
 * Save app state to LocalStorage.
 */
export function saveState(state: AppState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error("Failed to save state to LocalStorage:", e);
  }
}

/**
 * Load app state from LocalStorage.
 * Returns null if no saved state exists or if parsing fails.
 */
export function loadState(): AppState | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    const parsed = JSON.parse(serialized) as AppState;
    
    // Migration: Add defaultScoreConfig to older projects
    if (parsed.projects) {
      parsed.projects = parsed.projects.map(p => ({
        ...p,
        scoreConfig: p.scoreConfig || defaultScoreConfig
      }));
    }
    
    return parsed;
  } catch (e) {
    console.error("Failed to load state from LocalStorage:", e);
    return null;
  }
}

/**
 * Create a debounced auto-save function.
 * Saves to LocalStorage after a delay, resetting the timer on each call.
 */
export function createDebouncedSave(delayMs: number = 500): (state: AppState) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (state: AppState) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      saveState(state);
      timeoutId = null;
    }, delayMs);
  };
}
