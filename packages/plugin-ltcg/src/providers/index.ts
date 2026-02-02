/**
 * LTCG ElizaOS Providers
 *
 * Exports all providers that supply game context data to the LLM.
 */

import { boardAnalysisProvider } from "./boardAnalysisProvider";
import { deckProvider } from "./deckProvider";
import { gameStateProvider } from "./gameStateProvider";
import { globalChatProvider } from "./globalChatProvider";
import { handProvider } from "./handProvider";
import { legalActionsProvider } from "./legalActionsProvider";
import { strategyProvider } from "./strategyProvider";

/**
 * All LTCG providers for ElizaOS agent
 *
 * These providers give the LLM comprehensive game awareness:
 * 1. deckProvider - Agent's deck composition and card catalog
 * 2. gameStateProvider - Current game state (LP, turn, phase, board summary)
 * 3. handProvider - Detailed hand analysis (cards, tributes, abilities)
 * 4. boardAnalysisProvider - Strategic board position analysis
 * 5. legalActionsProvider - Available actions and their parameters
 * 6. strategyProvider - High-level strategic recommendations
 * 7. globalChatProvider - Recent chat messages and online users (Tavern Hall)
 */
export const ltcgProviders = [
  deckProvider,
  gameStateProvider,
  handProvider,
  boardAnalysisProvider,
  legalActionsProvider,
  strategyProvider,
  globalChatProvider,
];

// Export individual providers for selective use
export { deckProvider } from "./deckProvider";
export { gameStateProvider } from "./gameStateProvider";
export { handProvider } from "./handProvider";
export { boardAnalysisProvider } from "./boardAnalysisProvider";
export { legalActionsProvider } from "./legalActionsProvider";
export { strategyProvider } from "./strategyProvider";
export { globalChatProvider } from "./globalChatProvider";
