/**
 * Effect System Parser
 *
 * Parses JSON ability definitions into structured effect data.
 * Only JSON format is supported - text parsing has been removed.
 */

import type { ParsedAbility, JsonAbility } from "./types";
import { parseJsonAbility } from "./jsonParser";

/**
 * Parse a JSON ability definition into ParsedAbility format
 *
 * This is the main entry point for parsing abilities.
 * Only JSON format is supported.
 *
 * @param ability - A JSON ability definition object
 * @returns ParsedAbility compatible with the effect executor
 *
 * @example
 * ```typescript
 * const parsed = parseUnifiedAbility({
 *   trigger: "manual",
 *   effects: [{ effect: { effectType: "draw", count: 2 } }]
 * });
 * ```
 */
export function parseUnifiedAbility(ability: JsonAbility): ParsedAbility {
  return parseJsonAbility(ability);
}
