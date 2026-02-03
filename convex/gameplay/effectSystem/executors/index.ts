/**
 * Effect Executors
 *
 * Individual executor functions for each effect type.
 * Organized into logical categories for better maintainability.
 */

// Combat executors
export { executeDamage } from "./combat/damage";
export { executeGainLP } from "./combat/gainLP";
export { executeModifyATK } from "./combat/modifyATK";
export { executeModifyDEF } from "./combat/modifyDEF";

// Card movement executors
export { executeDraw } from "./cardMovement/draw";
export { executeSearch } from "./cardMovement/search";
export { executeToHand } from "./cardMovement/toHand";
export { executeSendToGraveyard } from "./cardMovement/toGraveyard";
export { executeBanish } from "./cardMovement/banish";
export { executeReturnToDeck } from "./cardMovement/returnToDeck";
export { executeMill } from "./cardMovement/mill";
export { executeDiscard } from "./cardMovement/discard";

// Summon executors
export { executeSpecialSummon } from "./summon/summon";
export { executeDestroy } from "./summon/destroy";
export { executeGenerateToken } from "./summon/generateToken";

// Utility executors
export { executeNegate } from "./utility/negate";
