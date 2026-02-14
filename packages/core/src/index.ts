/**
 * @ltcg/core - Shared types, utilities, and validators
 *
 * Core package containing shared code used across LTCG applications.
 *
 * @example
 * ```typescript
 * // Import from main entry
 * import { TypedQuery, TypedMutation } from "@ltcg/core";
 *
 * // Or import from specific modules
 * import { TypedQuery } from "@ltcg/core/types";
 * import { createTypedQuery } from "@ltcg/core/api";
 * ```
 */

// Re-export all modules
export * from "./types";
export * from "./config/gameConfig";
export * from "./utils";
export * from "./api";
export * from "./ui";
