/**
 * GameState save/load (task 0.3, ARCHITECTURE §3).
 *
 * Save = `JSON.stringify(GameState)`; load validates through the zod schema so
 * a corrupt or stale save is rejected loudly rather than producing a
 * malformed state. The prototype migration policy is "version bump = new
 * campaign" (schemas.ts), so there is no migration step here — an unexpected
 * `version` simply fails validation.
 */
import { GameState, type GameStateT } from "../data/schemas.js";

/** Serialize a validated GameState to a save string. */
export function serialize(state: GameStateT): string {
  // Parse first so we never persist a state that would fail to load back.
  return JSON.stringify(GameState.parse(state));
}

/**
 * Parse and validate a save string back into a GameState. Throws (zod
 * ZodError, or SyntaxError on malformed JSON) if the payload is not a valid
 * GameState.
 */
export function deserialize(json: string): GameStateT {
  return GameState.parse(JSON.parse(json));
}
