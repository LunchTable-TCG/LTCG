/**
 * Game State Provider
 *
 * Provides current game state overview including:
 * - Life points (agent vs opponent)
 * - Turn number and current phase
 * - Current turn player (is it my turn?)
 * - Board summary (# of monsters, spells/traps)
 * - Graveyard and banished card counts
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { GameStateResponse } from "../types/api";

export const gameStateProvider: Provider = {
  name: "LTCG_GAME_STATE",
  description:
    "Provides current game state overview including life points, turn info, and board summary",

  async get(runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> {
    try {
      // Get game ID from State (set by service or action)
      const gameId = state.values.LTCG_CURRENT_GAME_ID || (message.content as any)?.gameId;

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

      // Determine if it's the agent's turn
      const isMyTurn = gameState.currentTurn === "host"; // Assuming agent is always host

      // Format phase name for display
      const phaseNames: Record<string, string> = {
        draw: "Draw Phase",
        standby: "Standby Phase",
        main1: "Main Phase 1",
        battle: "Battle Phase",
        main2: "Main Phase 2",
        end: "End Phase",
      };

      const phaseName = phaseNames[gameState.phase] || gameState.phase;

      // Build human-readable text
      const text = `Game State:
- Turn ${gameState.turnNumber}, ${phaseName} (${isMyTurn ? "YOUR TURN" : "OPPONENT TURN"})
- Your LP: ${gameState.hostPlayer.lifePoints} | Opponent LP: ${gameState.opponentPlayer.lifePoints}
- Your Field: ${gameState.hostPlayer.monsterZone.length} monsters, ${gameState.hostPlayer.spellTrapZone.length} spell/trap
- Opponent Field: ${gameState.opponentPlayer.monsterZone.length} monsters, ${gameState.opponentPlayer.spellTrapZone.length} spell/traps
- Graveyard: ${gameState.hostPlayer.graveyard.length} cards | Banished: ${gameState.hostPlayer.banished.length} cards
- Deck: ${gameState.hostPlayer.deckCount} cards remaining`;

      // Structured values for template substitution
      const values = {
        gameId: gameState.gameId,
        turnNumber: gameState.turnNumber,
        phase: gameState.phase,
        isMyTurn,
        myLifePoints: gameState.hostPlayer.lifePoints,
        opponentLifePoints: gameState.opponentPlayer.lifePoints,
        myMonsterCount: gameState.hostPlayer.monsterZone.length,
        opponentMonsterCount: gameState.opponentPlayer.monsterZone.length,
        myBackrowCount: gameState.hostPlayer.spellTrapZone.length,
        opponentBackrowCount: gameState.opponentPlayer.spellTrapZone.length,
      };

      // Structured data for programmatic access
      const data = {
        gameState,
        isMyTurn,
        advantage: calculateAdvantage(gameState),
      };

      return { text, values, data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error fetching game state";

      return {
        text: `Error fetching game state: ${errorMessage}`,
        values: { error: "FETCH_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};

/**
 * Calculate board advantage
 */
function calculateAdvantage(gameState: GameStateResponse): string {
  const myMonsters = gameState.hostPlayer.monsterZone.length;
  const opponentMonsters = gameState.opponentPlayer.monsterZone.length;
  const myLP = gameState.hostPlayer.lifePoints;
  const opponentLP = gameState.opponentPlayer.lifePoints;

  // Calculate total ATK on board
  const myTotalAtk = gameState.hostPlayer.monsterZone.reduce((sum, m) => sum + m.atk, 0);
  const opponentTotalAtk = gameState.opponentPlayer.monsterZone.reduce((sum, m) => sum + m.atk, 0);

  // Simple advantage calculation
  const monsterAdvantage = myMonsters - opponentMonsters;
  const atkAdvantage = myTotalAtk - opponentTotalAtk;
  const lpAdvantage = myLP - opponentLP;

  // Weighted score
  const score = monsterAdvantage * 500 + atkAdvantage + lpAdvantage / 10;

  if (score > 2000) return "STRONG_ADVANTAGE";
  if (score > 500) return "SLIGHT_ADVANTAGE";
  if (score > -500) return "EVEN";
  if (score > -2000) return "SLIGHT_DISADVANTAGE";
  return "STRONG_DISADVANTAGE";
}
