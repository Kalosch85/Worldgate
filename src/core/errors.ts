/**
 * Rule-invalid actions throw `RuleError` (docs/specs/economy-and-roster.md §3).
 * Structurally impossible input (wrong shape, not a rule violation) is a
 * programmer error and may throw anything else.
 */
export class RuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RuleError";
    this.code = code;
  }
}
