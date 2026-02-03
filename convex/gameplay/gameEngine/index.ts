/**
 * Game Engine - Module Index
 *
 * Re-exports all game engine mutations from modular files.
 */

// Summons module (Normal Summon, Set Monster, Flip Summon)
export { normalSummon, setMonster, flipSummon } from "./summons";

// Positions module (Change Position)
export { changePosition } from "./positions";

// Spells & Traps module (Set Spell/Trap, Activate Spell, Activate Trap, Complete Search)
export { setSpellTrap, activateSpell, activateTrap, completeSearchEffect } from "./spellsTraps";

// Monster Effects module (Activate Monster Effect)
export { activateMonsterEffect } from "./monsterEffects";

// Selection-based Effects (Special Summon, Destruction Targets)
export {
  getGraveyardSummonTargets,
  getBanishedSummonTargets,
  completeSpecialSummon,
  getDestructionTargets,
} from "./selectionEffects";

// Turns module (End Turn)
export { endTurn } from "./turns";
