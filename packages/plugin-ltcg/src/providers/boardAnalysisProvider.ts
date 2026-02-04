/**
 * Board Analysis Provider
 *
 * Provides strategic analysis of board position:
 * - Board advantage (who has more/stronger monsters)
 * - Threat assessment (opponent's backrow, strong monsters)
 * - Attack opportunities (safe attacks vs risky)
 * - Defensive concerns
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { BoardCard, GameStateResponse } from "../types/api";
import type { ChatMessageContent } from "../types/eliza";

export const boardAnalysisProvider: Provider = {
  name: "LTCG_BOARD_ANALYSIS",
  description: "Provides strategic analysis of the current board position",

  async get(runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> {
    try {
      // Get game ID from state first, then message content
      const messageContent = message.content as ChatMessageContent;
      const gameId = state.values?.LTCG_CURRENT_GAME_ID || messageContent.gameId;

      if (!gameId) {
        return {
          text: "No active game. Use FIND_GAME or JOIN_LOBBY to start playing.",
          values: { error: "NO_GAME_ID" },
          data: undefined,
        };
      }

      // Get API credentials from runtime settings
      const apiKey = runtime.getSetting("LTCG_API_KEY");
      const apiUrl = runtime.getSetting("LTCG_API_URL");

      if (!apiKey || !apiUrl) {
        return {
          text: "LTCG API credentials not configured. Please set LTCG_API_KEY and LTCG_API_URL.",
          values: { error: "MISSING_CONFIG" },
          data: undefined,
        };
      }

      // Create API client
      const client = new LTCGApiClient({
        apiKey: apiKey as string,
        baseUrl: apiUrl as string,
      });

      // Fetch game state - gameId is definitely a string after the check above
      const currentGameId = gameId as string;
      const gameState: GameStateResponse = await client.getGameState(currentGameId);

      // Analyze board
      const analysis = analyzeBoardState(gameState);

      // Build human-readable text
      const text = formatBoardAnalysis(analysis, gameState);

      // Structured values for template substitution
      const values = {
        advantage: analysis.advantage,
        myMonsterCount: analysis.myMonsterCount,
        opponentMonsterCount: analysis.opponentMonsterCount,
        myStrongestAtk:
          analysis.myStrongestMonster?.currentAttack || analysis.myStrongestMonster?.attack || 0,
        opponentStrongestAtk:
          analysis.opponentStrongestMonster?.currentAttack ||
          analysis.opponentStrongestMonster?.attack ||
          0,
        opponentBackrowCount: analysis.opponentBackrowCount,
        threatLevel: analysis.threatLevel,
      };

      // Structured data for programmatic access
      // Note: API returns myBoard/opponentBoard, not hostPlayer/opponentPlayer
      const data = {
        ...analysis,
        myMonsters: gameState.myBoard?.length || 0,
        opponentMonsters: gameState.opponentBoard?.length || 0,
        myBackrow: 0, // Spell/trap zone not returned separately in current API
        opponentBackrow: 0,
      };

      return { text, values, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error analyzing board";

      return {
        text: `Error analyzing board: ${errorMessage}`,
        values: { error: "FETCH_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};

/**
 * Board analysis result
 */
interface BoardAnalysis {
  advantage:
    | "STRONG_ADVANTAGE"
    | "SLIGHT_ADVANTAGE"
    | "EVEN"
    | "SLIGHT_DISADVANTAGE"
    | "STRONG_DISADVANTAGE";
  myMonsterCount: number;
  opponentMonsterCount: number;
  myStrongestMonster?: BoardCard;
  opponentStrongestMonster?: BoardCard;
  opponentBackrowCount: number;
  threats: string[];
  opportunities: string[];
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string;
}

/**
 * Analyze the board state
 * Note: API returns myBoard/opponentBoard with BoardCard format
 */
function analyzeBoardState(gameState: GameStateResponse): BoardAnalysis {
  // Use myBoard/opponentBoard from the actual API response
  const myMonsters = gameState.myBoard || [];
  const opponentMonsters = gameState.opponentBoard || [];
  // Note: Spell/trap zone not returned separately in current API
  const opponentBackrow: BoardCard[] = [];

  // Helper to get attack value from BoardCard
  const getAtk = (card: BoardCard) => card.currentAttack ?? card.attack ?? 0;

  // Find strongest monsters
  const myStrongestMonster =
    myMonsters.length > 0
      ? myMonsters.reduce((strongest, monster) =>
          getAtk(monster) > getAtk(strongest) ? monster : strongest
        )
      : undefined;

  const opponentStrongestMonster =
    opponentMonsters.length > 0
      ? opponentMonsters.reduce((strongest, monster) =>
          getAtk(monster) > getAtk(strongest) ? monster : strongest
        )
      : undefined;

  // Calculate advantage
  const myTotalAtk = myMonsters.reduce((sum, m) => sum + getAtk(m), 0);
  const opponentTotalAtk = opponentMonsters.reduce((sum, m) => sum + getAtk(m), 0);

  const monsterAdvantage = myMonsters.length - opponentMonsters.length;
  const atkAdvantage = myTotalAtk - opponentTotalAtk;

  let advantage: BoardAnalysis["advantage"];
  if (monsterAdvantage >= 2 || atkAdvantage >= 2000) {
    advantage = "STRONG_ADVANTAGE";
  } else if (monsterAdvantage >= 1 || atkAdvantage >= 500) {
    advantage = "SLIGHT_ADVANTAGE";
  } else if (monsterAdvantage <= -2 || atkAdvantage <= -2000) {
    advantage = "STRONG_DISADVANTAGE";
  } else if (monsterAdvantage <= -1 || atkAdvantage <= -500) {
    advantage = "SLIGHT_DISADVANTAGE";
  } else {
    advantage = "EVEN";
  }

  // Assess threats
  const threats: string[] = [];

  if (
    opponentStrongestMonster &&
    myStrongestMonster &&
    getAtk(opponentStrongestMonster) > getAtk(myStrongestMonster)
  ) {
    threats.push(
      `Opponent's ${opponentStrongestMonster.name} (${getAtk(opponentStrongestMonster)} ATK) is stronger than your strongest monster`
    );
  }

  if (opponentBackrow.length >= 3) {
    threats.push(`Opponent has ${opponentBackrow.length} set backrow - likely has traps`);
  } else if (opponentBackrow.length > 0) {
    threats.push(`Opponent has ${opponentBackrow.length} set card(s) in backrow`);
  }

  if (myMonsters.length === 0 && opponentMonsters.length > 0) {
    threats.push("No monsters on your field - vulnerable to direct attacks");
  }

  // Assess opportunities
  const opportunities: string[] = [];

  // Check for direct attack opportunity
  // Note: BoardCard uses hasAttacked (true = already attacked this turn)
  if (opponentMonsters.length === 0 && myMonsters.length > 0) {
    const totalDamage = myMonsters.reduce(
      (sum, m) => sum + (!m.hasAttacked && m.position === 1 ? getAtk(m) : 0),
      0
    );
    opportunities.push(`Direct attack possible for ${totalDamage} damage`);
  }

  myMonsters.forEach((myMonster) => {
    // Can attack if: not already attacked, in attack position, not face-down
    const canAttack = !myMonster.hasAttacked && myMonster.position === 1 && !myMonster.isFaceDown;
    if (!canAttack) return;

    const canDefeatOpponents = opponentMonsters.filter((opp) => getAtk(myMonster) > getAtk(opp));

    if (canDefeatOpponents.length > 0) {
      opportunities.push(
        `${myMonster.name} can safely attack ${canDefeatOpponents.map((m) => m.name).join(", ")}`
      );
    }
  });

  // Determine threat level
  let threatLevel: BoardAnalysis["threatLevel"];
  if (
    advantage === "STRONG_DISADVANTAGE" ||
    (myMonsters.length === 0 && opponentMonsters.length >= 2)
  ) {
    threatLevel = "CRITICAL";
  } else if (advantage === "SLIGHT_DISADVANTAGE" || threats.length >= 2) {
    threatLevel = "HIGH";
  } else if (threats.length === 1) {
    threatLevel = "MEDIUM";
  } else {
    threatLevel = "LOW";
  }

  // Generate recommendation
  let recommendation: string;
  if (advantage === "STRONG_ADVANTAGE") {
    recommendation = "Press your advantage - attack aggressively";
  } else if (advantage === "SLIGHT_ADVANTAGE") {
    recommendation = "Maintain board control and look for openings";
  } else if (advantage === "SLIGHT_DISADVANTAGE") {
    recommendation = "Set up defense or use removal spells";
  } else if (advantage === "STRONG_DISADVANTAGE") {
    recommendation = "Defensive play required - survive and rebuild";
  } else {
    recommendation = "Play cautiously - board is balanced";
  }

  return {
    advantage,
    myMonsterCount: myMonsters.length,
    opponentMonsterCount: opponentMonsters.length,
    myStrongestMonster,
    opponentStrongestMonster,
    opponentBackrowCount: opponentBackrow.length,
    threats,
    opportunities,
    threatLevel,
    recommendation,
  };
}

/**
 * Format board analysis as human-readable text
 */
function formatBoardAnalysis(analysis: BoardAnalysis, _gameState: GameStateResponse): string {
  // Helper to get attack value from BoardCard
  const getAtk = (card: BoardCard) => card.currentAttack ?? card.attack ?? 0;

  let text = "Board Analysis:\n";
  text += `- Advantage: ${analysis.advantage.replace(/_/g, " ")}\n`;

  if (analysis.myStrongestMonster) {
    text += `- Your Strongest: ${analysis.myStrongestMonster.name} (${getAtk(analysis.myStrongestMonster)} ATK)\n`;
  } else {
    text += "- Your Strongest: None (no monsters on field)\n";
  }

  if (analysis.opponentStrongestMonster) {
    const isThreat = analysis.myStrongestMonster
      ? getAtk(analysis.opponentStrongestMonster) > getAtk(analysis.myStrongestMonster)
      : true;
    text += `- Opponent Strongest: ${analysis.opponentStrongestMonster.name} (${getAtk(analysis.opponentStrongestMonster)} ATK)${isThreat ? " - THREAT!" : ""}\n`;
  } else {
    text += "- Opponent Strongest: None (no monsters on field)\n";
  }

  if (analysis.threats.length > 0) {
    text += "- Threats:\n";
    analysis.threats.forEach((threat) => {
      text += `  * ${threat}\n`;
    });
  }

  if (analysis.opportunities.length > 0) {
    text += "- Attack Opportunities:\n";
    analysis.opportunities.forEach((opp) => {
      text += `  * ${opp}\n`;
    });
  } else {
    text += "- Attack Opportunities: None safe\n";
  }

  text += `- Recommendation: ${analysis.recommendation}`;

  return text;
}
