/**
 * Save/load plumbing (task 2.1, ARCHITECTURE §3). Two persistence surfaces
 * over the same serialized string:
 *   - autosave to localStorage (survives reload)
 *   - an export/import string the player can copy out and paste back in
 *
 * Both go through core's schema-validated serialize/deserialize, so a corrupt
 * or stale payload is rejected rather than loaded (version bump = new campaign).
 */
import { deserialize, serialize } from "../core/serialize.js";
import type { GameStateT } from "../data/schemas.js";

const SAVE_KEY = "worldgate/save/v1";

/** True when a browser localStorage is reachable (guards SSR / locked-down envs). */
function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Write the campaign to localStorage. Silently no-ops if storage is unavailable. */
export function saveToStorage(state: GameStateT): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(SAVE_KEY, serialize(state));
  } catch {
    // Quota or private-mode failures are non-fatal for the prototype.
  }
}

/** Load the autosaved campaign, or null if none / invalid. */
export function loadFromStorage(): GameStateT | null {
  const s = storage();
  if (!s) return null;
  const raw = s.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return deserialize(raw);
  } catch {
    return null;
  }
}

/** True when a (structurally present) autosave exists. */
export function hasStoredSave(): boolean {
  const s = storage();
  return !!s && s.getItem(SAVE_KEY) !== null;
}

/** Remove the autosave. */
export function clearStorage(): void {
  storage()?.removeItem(SAVE_KEY);
}

/** The copy-out export string. */
export function exportSave(state: GameStateT): string {
  return serialize(state);
}

/**
 * Parse a pasted export string back into a GameState. Returns an error message
 * instead of throwing so the UI can surface it inline.
 */
export function importSave(text: string): { ok: true; state: GameStateT } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Paste a save string first." };
  try {
    return { ok: true, state: deserialize(trimmed) };
  } catch {
    return { ok: false, error: "That is not a valid Worldgate save." };
  }
}
