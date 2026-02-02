/**
 * LTCG Actions Index
 *
 * Exports all core game actions that enable AI agents to play the card game.
 */

import { activateSpellAction } from "./activateSpellAction";
import { activateTrapAction } from "./activateTrapAction";
import { attackAction } from "./attackAction";
import { chainResponseAction } from "./chainResponseAction";
import { changePositionAction } from "./changePositionAction";
import { createLobbyAction } from "./createLobbyAction";
import { endTurnAction } from "./endTurnAction";
import { findGameAction } from "./findGameAction";
import { flipSummonAction } from "./flipSummonAction";
import { getWalletInfoAction } from "./getWalletInfoAction";
import { ggAction } from "./ggAction";
import { joinLobbyAction } from "./joinLobbyAction";
import { reactToPlayAction } from "./reactToPlayAction";
import { registerAgentAction } from "./registerAgentAction";
import { sendChatMessageAction } from "./sendChatMessageAction";
import { setCardAction } from "./setCardAction";
import { storyModeAction } from "./storyModeAction";
import { summonAction } from "./summonAction";
import { surrenderAction } from "./surrenderAction";
import { trashTalkAction } from "./trashTalkAction";

/**
 * All LTCG game actions
 *
 * These actions allow the agent to:
 *
 * Game Management:
 * - Register new agent accounts
 * - Find and join games automatically
 * - Create lobbies (public or private)
 * - Join specific lobbies by ID or code
 * - Play story mode (instant AI battles)
 * - Surrender games
 *
 * Gameplay:
 * - Summon monsters (with tribute support)
 * - Set cards face-down
 * - Activate spells and traps
 * - Declare attacks
 * - Change monster positions
 * - Flip summon face-down monsters
 * - Chain responses to opponent actions
 * - End turn
 *
 * Personality & Chat:
 * - Trash talk based on game state
 * - React to opponent's plays
 * - Send good game messages
 * - Send messages to global chat (Tavern Hall)
 */
export const ltcgActions = [
  // Game Management Actions
  registerAgentAction,
  getWalletInfoAction,
  findGameAction,
  createLobbyAction,
  joinLobbyAction,
  storyModeAction,
  surrenderAction,

  // Gameplay Actions
  summonAction,
  setCardAction,
  activateSpellAction,
  activateTrapAction,
  endTurnAction,
  attackAction,
  changePositionAction,
  flipSummonAction,
  chainResponseAction,

  // Personality & Chat Actions
  trashTalkAction,
  reactToPlayAction,
  ggAction,
  sendChatMessageAction,
];

// Export individual actions for convenience
export {
  // Game Management
  registerAgentAction,
  getWalletInfoAction,
  findGameAction,
  createLobbyAction,
  joinLobbyAction,
  storyModeAction,
  surrenderAction,
  // Gameplay
  summonAction,
  setCardAction,
  activateSpellAction,
  activateTrapAction,
  endTurnAction,
  attackAction,
  changePositionAction,
  flipSummonAction,
  chainResponseAction,
  // Personality & Chat
  trashTalkAction,
  reactToPlayAction,
  ggAction,
  sendChatMessageAction,
};
