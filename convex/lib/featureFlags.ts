/**
 * Feature Flags
 *
 * Centralized feature flag system for enabling/disabling features.
 * Use these flags to gradually roll out new features or toggle
 * between different implementations.
 *
 * IMPORTANT: Feature flags should be boolean values that default to
 * a safe state (usually false for new features).
 */

/**
 * Feature flag definitions
 *
 * Each flag has:
 * - A boolean value indicating if the feature is enabled
 * - A comment describing what the flag controls
 *
 * Guidelines:
 * - New features should default to false
 * - Once a feature is stable, consider removing the flag
 * - Document what each flag does and when it was added
 */
export const FEATURE_FLAGS = {
  /**
   * Use JSON-based effect parsing instead of text parsing
   *
   * When enabled:
   * - Card abilities defined as JSON objects are parsed using jsonParser.ts
   * - Provides more precise effect definitions with structured conditions
   *
   * When disabled:
   * - All abilities are parsed using the text parser (parser.ts)
   * - This is the current stable behavior
   *
   * @since v1.0.0
   * @default false
   */
  USE_JSON_EFFECTS: false,

  /**
   * Enable verbose effect execution logging
   *
   * When enabled:
   * - Detailed logs for each effect evaluation and execution
   * - Useful for debugging complex effect chains
   *
   * @since v1.0.0
   * @default false
   */
  VERBOSE_EFFECT_LOGGING: false,

  /**
   * Enable chain resolution debugging
   *
   * When enabled:
   * - Logs detailed information about chain link resolution
   * - Shows timing and spell speed calculations
   *
   * @since v1.0.0
   * @default false
   */
  DEBUG_CHAIN_RESOLUTION: false,

  /**
   * Enable experimental continuous effect evaluation
   *
   * When enabled:
   * - Uses optimized continuous effect calculation
   * - Caches effect results for better performance
   *
   * @since v1.0.0
   * @default false
   */
  OPTIMIZED_CONTINUOUS_EFFECTS: false,
} as const;

/**
 * Type for feature flag keys
 */
export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature flag is enabled
 *
 * @param flag - The feature flag to check
 * @returns Whether the flag is enabled
 *
 * @example
 * ```typescript
 * if (isFeatureEnabled("USE_JSON_EFFECTS")) {
 *   // Use JSON parser
 * } else {
 *   // Use text parser
 * }
 * ```
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}

/**
 * Get all enabled feature flags
 *
 * Useful for logging and debugging.
 *
 * @returns Array of enabled flag names
 */
export function getEnabledFeatures(): FeatureFlagKey[] {
  return (Object.entries(FEATURE_FLAGS) as [FeatureFlagKey, boolean][])
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key);
}

/**
 * Get feature flag configuration as a record
 *
 * Useful for including in debug logs or analytics.
 */
export function getFeatureFlagConfig(): Record<FeatureFlagKey, boolean> {
  return { ...FEATURE_FLAGS };
}
