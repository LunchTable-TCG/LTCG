import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// JSON ABILITY TYPES - Re-exported from cardHelpers for backwards compatibility
// ============================================================================

// Re-export all types and functions from cardHelpers
export type {
  EffectType,
  TriggerCondition,
  CostType,
  JsonCost,
  JsonEffect,
  JsonAbility,
  DisplayEffect,
} from "./cardHelpers";

export {
  getCardEffectsArray,
  getAbilityDisplayText,
  isJsonAbility,
  getTriggerLabel,
  getEffectTypeLabel,
  hasOPTRestriction,
  hasHOPTRestriction,
  isContinuousAbility,
  getProtectionFlags,
} from "./cardHelpers";
