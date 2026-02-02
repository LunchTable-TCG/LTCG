/**
 * LTCG ElizaOS Providers
 *
 * Exports all providers that supply game context data to the LLM.
 */

import { boardAnalysisProvider } from "./boardAnalysisProvider";
import { cardDatabaseProvider } from "./cardDatabaseProvider";
import { deckProvider } from "./deckProvider";
import { gameStateProvider } from "./gameStateProvider";
import { globalChatProvider } from "./globalChatProvider";
import { handProvider } from "./handProvider";
import { legalActionsProvider } from "./legalActionsProvider";
import { opponentModelingProvider } from "./opponentModelingProvider";
import { strategyProvider } from "./strategyProvider";
import { winConditionProvider } from "./winConditionProvider";

/**
 * All LTCG providers for ElizaOS agent
 *
 * These providers give the LLM comprehensive game awareness:
 * 1. cardDatabaseProvider - All game cards, effects, and threat assessments
 * 2. deckProvider - Agent's deck composition and card catalog
 * 3. gameStateProvider - Current game state (LP, turn, phase, board summary)
 * 4. handProvider - Detailed hand analysis (cards, tributes, abilities)
 * 5. boardAnalysisProvider - Strategic board position analysis
 * 6. legalActionsProvider - Available actions with strategic context
 * 7. strategyProvider - High-level strategic recommendations
 * 8. globalChatProvider - Recent chat messages and online users (Tavern Hall)
 * 9. opponentModelingProvider - Opponent behavior patterns and predictions
 * 10. winConditionProvider - Win paths, lethal detection, and threat assessment
 */
export const ltcgProviders = [
  cardDatabaseProvider,
  deckProvider,
  gameStateProvider,
  handProvider,
  boardAnalysisProvider,
  legalActionsProvider,
  strategyProvider,
  globalChatProvider,
  opponentModelingProvider,
  winConditionProvider,
];

// Export individual providers for selective use
export { cardDatabaseProvider } from "./cardDatabaseProvider";
export { deckProvider } from "./deckProvider";
export { gameStateProvider } from "./gameStateProvider";
export { handProvider } from "./handProvider";
export { boardAnalysisProvider } from "./boardAnalysisProvider";
export { legalActionsProvider } from "./legalActionsProvider";
export { strategyProvider } from "./strategyProvider";
export { globalChatProvider } from "./globalChatProvider";
export { opponentModelingProvider } from "./opponentModelingProvider";
export { winConditionProvider } from "./winConditionProvider";
