/**
 * Strategy Provider
 *
 * Provides high-level strategic recommendations:
 * - Game state evaluation (winning/losing/even)
 * - Playstyle recommendation based on situation
 * - Win condition awareness
 * - Risk assessment
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { GameStateResponse } from "../types/api";

export const strategyProvider: Provider = {
  name: "LTCG_STRATEGY",
  description: "Provides high-level strategic recommendations based on current game state",

  async get(runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> {
    try {
      // Get game ID from state first, then message content
      const gameId = state.values?.LTCG_CURRENT_GAME_ID || (message.content as any)?.gameId;

      if (!gameId) {
        return {
          text: "No active game. Use FIND_GAME or JOIN_LOBBY to start playing.",
          values: { error: "NO_GAME_ID" },
          data: {},
        };
      }

      // Get API credentials from runtime settings
      const apiKey = runtime.getSetting("LTCG_API_KEY");
      const apiUrl = runtime.getSetting("LTCG_API_URL");

      if (!apiKey || !apiUrl) {
        return {
          text: "LTCG API credentials not configured. Please set LTCG_API_KEY and LTCG_API_URL.",
          values: { error: "MISSING_CONFIG" },
          data: {},
        };
      }

      // Create API client
      const client = new LTCGApiClient({
        apiKey: apiKey as string,
        baseUrl: apiUrl as string,
      });

      // Fetch game state
      const gameState: GameStateResponse = await client.getGameState(gameId);

      // Analyze strategy
      const strategy = analyzeStrategy(gameState);

      // Build human-readable text
      const text = formatStrategyAnalysis(strategy);

      // Structured values for template substitution
      const values = {
        gameState: strategy.gameState,
        playStyle: strategy.playStyle,
        priority: strategy.priority,
        riskLevel: strategy.riskLevel,
        canWinThisTurn: strategy.canWinThisTurn,
        needsDefense: strategy.needsDefense,
      };

      // Structured data for programmatic access
      const data = {
        ...strategy,
      };

      return { text, values, data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error analyzing strategy";

      return {
        text: `Error analyzing strategy: ${errorMessage}`,
        values: { error: "FETCH_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};

/**
 * Strategy analysis result
 */
interface StrategyAnalysis {
  gameState: "WINNING" | "SLIGHTLY_WINNING" | "EVEN" | "SLIGHTLY_LOSING" | "LOSING";
  playStyle: "AGGRESSIVE" | "DEFENSIVE" | "CONTROL" | "BALANCED";
  priority:
    | "FINISH_GAME"
    | "ESTABLISH_BOARD"
    | "CLEAR_OPPONENT"
    | "PROTECT_LIFE_POINTS"
    | "SURVIVE";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  winCondition: string;
  priorityActions: string[];
  canWinThisTurn: boolean;
  needsDefense: boolean;
}

/**
 * Analyze strategy based on game state
 * Note: API returns myBoard/opponentBoard and myLifePoints/opponentLifePoints
 */
function analyzeStrategy(gameState: GameStateResponse): StrategyAnalysis {
  // Use correct field names from API response
  const myLP = gameState.myLifePoints;
  const opponentLP = gameState.opponentLifePoints;
  const myMonsters = gameState.myBoard || [];
  const opponentMonsters = gameState.opponentBoard || [];
  // Note: Spell/trap zones not returned separately in current API
  const opponentBackrow: any[] = [];

  // Helper to get attack value from BoardCard
  const getAtk = (card: any) => card.currentAttack ?? card.attack ?? 0;

  // Evaluate game state
  const lpDiff = myLP - opponentLP;
  const myTotalAtk = myMonsters.reduce((sum, m) => sum + getAtk(m), 0);
  const opponentTotalAtk = opponentMonsters.reduce((sum, m) => sum + getAtk(m), 0);
  const monsterDiff = myMonsters.length - opponentMonsters.length;

  let gameStateEval: StrategyAnalysis["gameState"];
  if (lpDiff >= 3000 && monsterDiff >= 2) {
    gameStateEval = "WINNING";
  } else if (lpDiff >= 1000 && monsterDiff >= 1) {
    gameStateEval = "SLIGHTLY_WINNING";
  } else if (lpDiff <= -3000 || (lpDiff <= -1000 && monsterDiff <= -2)) {
    gameStateEval = "LOSING";
  } else if (lpDiff <= -1000 || monsterDiff <= -1) {
    gameStateEval = "SLIGHTLY_LOSING";
  } else {
    gameStateEval = "EVEN";
  }

  // Determine playstyle
  let playStyle: StrategyAnalysis["playStyle"];
  if (gameStateEval === "WINNING") {
    playStyle = "AGGRESSIVE";
  } else if (gameStateEval === "LOSING") {
    playStyle = "DEFENSIVE";
  } else if (opponentBackrow.length >= 2) {
    playStyle = "CONTROL";
  } else {
    playStyle = "BALANCED";
  }

  // Determine priority
  let priority: StrategyAnalysis["priority"];
  const canWinThisTurn = calculateCanWinThisTurn(myMonsters, opponentLP, opponentMonsters.length);

  if (canWinThisTurn) {
    priority = "FINISH_GAME";
  } else if (myLP <= 2000 || (opponentMonsters.length >= 2 && myMonsters.length === 0)) {
    priority = "SURVIVE";
  } else if (myLP <= 4000 && opponentTotalAtk >= myLP) {
    priority = "PROTECT_LIFE_POINTS";
  } else if (opponentMonsters.length >= 2) {
    priority = "CLEAR_OPPONENT";
  } else {
    priority = "ESTABLISH_BOARD";
  }

  // Determine risk level
  let riskLevel: StrategyAnalysis["riskLevel"];
  if (myLP <= 1000 || (opponentMonsters.length >= 3 && myMonsters.length === 0)) {
    riskLevel = "CRITICAL";
  } else if (myLP <= 3000 && opponentMonsters.length >= myMonsters.length) {
    riskLevel = "HIGH";
  } else if (opponentBackrow.length >= 2) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  // Determine win condition
  let winCondition: string;
  if (opponentLP <= 2000 && myMonsters.length > 0) {
    winCondition = "Deal direct damage to finish opponent";
  } else if (myTotalAtk > opponentTotalAtk + 2000) {
    winCondition = "Clear opponent field and attack for game";
  } else if (opponentMonsters.length === 0) {
    winCondition = "Summon strong monsters and attack directly";
  } else {
    winCondition = "Build board advantage and control the game";
  }

  // Generate priority actions
  const priorityActions = generatePriorityActions(
    gameState,
    gameStateEval,
    priority,
    canWinThisTurn
  );

  // Check if defense is needed
  const needsDefense =
    myLP <= 4000 ||
    (opponentMonsters.length > myMonsters.length && opponentTotalAtk > myTotalAtk) ||
    myMonsters.length === 0;

  return {
    gameState: gameStateEval,
    playStyle,
    priority,
    riskLevel,
    winCondition,
    priorityActions,
    canWinThisTurn,
    needsDefense,
  };
}

/**
 * Calculate if the game can be won this turn
 * Note: BoardCard uses hasAttacked, position, isFaceDown instead of canAttack
 */
function calculateCanWinThisTurn(
  myMonsters: any[],
  opponentLP: number,
  opponentMonsterCount: number
): boolean {
  if (opponentMonsterCount > 0) return false;

  // Helper to get attack value
  const getAtk = (card: any) => card.currentAttack ?? card.attack ?? 0;

  // Can attack if: not already attacked, in attack position (1), not face-down
  const totalDirectDamage = myMonsters.reduce((sum, m) => {
    const canAttack = !m.hasAttacked && m.position === 1 && !m.isFaceDown;
    return sum + (canAttack ? getAtk(m) : 0);
  }, 0);
  return totalDirectDamage >= opponentLP;
}

/**
 * Generate priority actions based on strategy
 */
function generatePriorityActions(
  _gameState: GameStateResponse,
  _gameStateEval: StrategyAnalysis["gameState"],
  priority: StrategyAnalysis["priority"],
  canWinThisTurn: boolean
): string[] {
  const actions: string[] = [];

  if (canWinThisTurn) {
    actions.push("Attack directly with all monsters to win the game");
    return actions;
  }

  switch (priority) {
    case "SURVIVE":
      actions.push("Set defensive trap cards (Mirror Force, Trap Hole, etc.)");
      actions.push("Summon strong defense position monsters");
      actions.push("DO NOT attack - protect life points");
      break;

    case "PROTECT_LIFE_POINTS":
      actions.push("Use defensive spells/traps to prevent damage");
      actions.push("Summon monsters in defense position");
      actions.push("Consider removing opponent threats with removal spells");
      break;

    case "CLEAR_OPPONENT":
      actions.push("Use removal spells (Raigeki, Dark Hole) to clear opponent board");
      actions.push("Attack weaker monsters to gain field advantage");
      actions.push("Set up for direct attacks next turn");
      break;

    case "ESTABLISH_BOARD":
      actions.push("Summon your strongest available monster");
      actions.push("Set protective backrow (traps/spells)");
      actions.push("Build card advantage for future turns");
      break;

    case "FINISH_GAME":
      actions.push("Attack directly with all available monsters");
      actions.push("Use direct damage spells if available");
      actions.push("Clear remaining opponent monsters");
      break;
  }

  return actions;
}

/**
 * Format strategy analysis as human-readable text
 */
function formatStrategyAnalysis(strategy: StrategyAnalysis): string {
  let text = "Strategic Analysis:\n";
  text += `- Game State: ${strategy.gameState.replace(/_/g, " ")}\n`;
  text += `- Recommended Style: ${strategy.playStyle} (${getPlayStyleDescription(strategy.playStyle)})\n`;
  text += `- Win Condition: ${strategy.winCondition}\n`;
  text += `- Risk Level: ${strategy.riskLevel}${strategy.riskLevel === "CRITICAL" ? " - DANGER!" : ""}\n`;

  if (strategy.priorityActions.length > 0) {
    text += "- Priority Actions:\n";
    strategy.priorityActions.forEach((action, index) => {
      text += `  ${index + 1}. ${action}\n`;
    });
  }

  return text;
}

/**
 * Get playstyle description
 */
function getPlayStyleDescription(playStyle: StrategyAnalysis["playStyle"]): string {
  switch (playStyle) {
    case "AGGRESSIVE":
      return "attack and pressure opponent";
    case "DEFENSIVE":
      return "survive and build resources";
    case "CONTROL":
      return "control board and tempo";
    case "BALANCED":
      return "adapt to situation";
    default:
      return "";
  }
}
