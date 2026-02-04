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
import type { ChatMessageContent } from "../types/eliza";

export const gameStateProvider: Provider = {
  name: "LTCG_GAME_STATE",
  description:
    "Provides current game state overview including life points, turn info, and board summary",

  async get(runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> {
    try {
      // Get game ID from State (set by service or action)
      const messageContent = message.content as ChatMessageContent;
      const gameId = state.values.LTCG_CURRENT_GAME_ID || messageContent.gameId;

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

      // Assert gameId as string for type safety
      const gameIdString = String(gameId);

      // Fetch game state
      const gameState: GameStateResponse = await client.getGameState(gameIdString);

      // Use API's isMyTurn field (correct regardless of host/opponent role)
      const isMyTurn = gameState.isMyTurn ?? gameState.currentTurn === "host";

      // Extract values with new API fields and fallbacks
      const myLP = gameState.myLifePoints ?? gameState.hostPlayer?.lifePoints ?? 8000;
      const oppLP = gameState.opponentLifePoints ?? gameState.opponentPlayer?.lifePoints ?? 8000;
      const myMonsterCount =
        gameState.myBoard?.length ?? gameState.hostPlayer?.monsterZone?.length ?? 0;
      const oppMonsterCount =
        gameState.opponentBoard?.length ?? gameState.opponentPlayer?.monsterZone?.length ?? 0;
      const myBackrowCount = gameState.hostPlayer?.spellTrapZone?.length ?? 0;
      const oppBackrowCount = gameState.opponentPlayer?.spellTrapZone?.length ?? 0;
      const myGraveyardCount =
        gameState.myGraveyardCount ?? gameState.hostPlayer?.graveyard?.length ?? 0;
      const myBanishedCount = gameState.hostPlayer?.banished?.length ?? 0;
      const myDeckCount = gameState.myDeckCount ?? gameState.hostPlayer?.deckCount ?? 0;

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
- Your LP: ${myLP} | Opponent LP: ${oppLP}
- Your Field: ${myMonsterCount} monsters, ${myBackrowCount} spell/trap
- Opponent Field: ${oppMonsterCount} monsters, ${oppBackrowCount} spell/traps
- Graveyard: ${myGraveyardCount} cards | Banished: ${myBanishedCount} cards
- Deck: ${myDeckCount} cards remaining`;

      // Structured values for template substitution
      const values = {
        gameId: gameState.gameId,
        turnNumber: gameState.turnNumber,
        phase: gameState.phase,
        isMyTurn,
        myLifePoints: myLP,
        opponentLifePoints: oppLP,
        myMonsterCount,
        opponentMonsterCount: oppMonsterCount,
        myBackrowCount,
        opponentBackrowCount: oppBackrowCount,
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
  // Use new API fields with fallbacks
  const myBoard = gameState.myBoard ?? gameState.hostPlayer?.monsterZone ?? [];
  const oppBoard = gameState.opponentBoard ?? gameState.opponentPlayer?.monsterZone ?? [];
  const myLP = gameState.myLifePoints ?? gameState.hostPlayer?.lifePoints ?? 8000;
  const opponentLP = gameState.opponentLifePoints ?? gameState.opponentPlayer?.lifePoints ?? 8000;

  const myMonsters = myBoard.length;
  const opponentMonsters = oppBoard.length;

  // Calculate total ATK on board
  const myTotalAtk = myBoard.reduce((sum, m) => {
    const card = m as { attack?: number; atk?: number };
    return sum + (card.attack ?? card.atk ?? 0);
  }, 0);
  const opponentTotalAtk = oppBoard.reduce((sum, m) => {
    const card = m as { attack?: number; atk?: number };
    return sum + (card.attack ?? card.atk ?? 0);
  }, 0);

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
