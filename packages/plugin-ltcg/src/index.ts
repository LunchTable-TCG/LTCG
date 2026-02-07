/**
 * LTCG ElizaOS Plugin
 *
 * Main entry point for the LTCG card game plugin.
 * This plugin enables AI agents to play the Legendary Trading Card Game
 * with full gameplay capabilities, real-time updates, and customizable personalities.
 */

// Main plugin export
export { default } from "./plugin.js";
export { default as ltcgPlugin } from "./plugin.js";

// Actions - Core gameplay commands
export { ltcgActions } from "./actions";
export {
  // Game Management
  registerAgentAction,
  findGameAction,
  createLobbyAction,
  joinLobbyAction,
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
} from "./actions";

// Providers - Context data for LLM
export { ltcgProviders } from "./providers";
export {
  gameStateProvider,
  handProvider,
  boardAnalysisProvider,
  legalActionsProvider,
  strategyProvider,
} from "./providers";

// Evaluators - Response filtering
export { ltcgEvaluators } from "./evaluators";
export { emotionalStateEvaluator, strategyEvaluator } from "./evaluators";

// Webhooks - Real-time event handling
export * from "./webhooks";

// Services - Real-time updates and autonomous gameplay
export { LTCGPollingService } from "./services/LTCGPollingService";
export { RetakeChatService } from "./services/retakeChatService";
export { TurnOrchestrator } from "./services/TurnOrchestrator";
export { StateAggregator } from "./services/StateAggregator";

// Service types and interfaces (for dependency injection)
export {
  SERVICE_TYPES,
  type IPollingService,
  type ITurnOrchestrator,
  type IStateAggregator,
  type OrchestratorEvent,
  type TurnStartedEvent,
  type ChainWaitingEvent,
} from "./services/types";

// Clients - API connections
export { LTCGApiClient } from "./client/LTCGApiClient";
export * from "./client/errors";

// Types - TypeScript definitions
export * from "./types/api";
// Re-export game types excluding duplicates that are already in api.ts
export type {
  Id,
  GamePhase,
  TurnPlayer,
  GameStatus,
  CardType,
  MonsterPosition,
  SpellType,
  TrapType,
  MonsterAttribute,
  MonsterRace,
  GameState,
  PlayerGameState,
  OpponentGameState,
  Card,
  // Note: MonsterCard, CardInHand, CardInGraveyard, Target are already exported from api.ts
  SpellCard,
  TrapCard,
  MonsterOnBoard,
  SpellTrapOnBoard,
  CardAbility,
  AbilityCost,
  CardEffect,
  GameAction,
  SummonAction,
  AttackAction,
  SpellActivationAction,
  BattleResult,
  DamageEvent,
  ChainLink,
  ChainState,
  BoardAnalysis,
  Threat,
  AttackOpportunity,
  StrategyRecommendation,
  DecisionContext,
} from "./types/game";
export * from "./types/plugin";

// Configuration
export * from "./config";
export * from "./constants";
