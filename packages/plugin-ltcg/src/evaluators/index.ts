/**
 * LTCG Evaluators Index
 *
 * Exports all evaluators that filter responses and validate strategic decisions.
 */

import { emotionalStateEvaluator } from "./emotionalStateEvaluator";
import { strategyEvaluator } from "./strategyEvaluator";

/**
 * All LTCG evaluators
 *
 * These evaluators:
 * - Filter inappropriate responses based on emotional state
 * - Prevent obviously bad strategic plays
 * - Ensure agent behavior is contextually appropriate
 */
export const ltcgEvaluators = [emotionalStateEvaluator, strategyEvaluator];

// Export individual evaluators for convenience
export { emotionalStateEvaluator, strategyEvaluator };
