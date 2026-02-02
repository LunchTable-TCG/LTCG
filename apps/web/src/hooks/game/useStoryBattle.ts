/**
 * Story mode battle management with automatic AI turn execution.
 *
 * Specialized hook for story mode battles against AI opponents. Automatically
 * executes AI turns when it's the opponent's turn, with a brief delay for UX.
 * Handles battle completion with rewards calculation and callback support.
 *
 * Features:
 * - Automatic AI turn execution (1.5s delay)
 * - Battle completion with rewards
 * - Star rating calculation
 * - Optional completion callback
 * - AI turn state tracking
 * - Prevents multiple simultaneous AI turns
 *
 * @example
 * ```typescript
 * const {
 *   completeBattle,
 *   isAITurn,
 *   isExecutingAITurn
 * } = useStoryBattle({
 *   lobbyId,
 *   gameId,
 *   onBattleComplete: (result) => {
 *     console.log(`Won: ${result.won}`);
 *     console.log(`Rewards: ${result.rewards.gold} gold, ${result.rewards.xp} XP`);
 *     console.log(`Stars: ${result.starsEarned}/3`);
 *   }
 * });
 *
 * // AI turn executes automatically
 * if (isAITurn) {
 *   console.log("AI is thinking...");
 * }
 *
 * // Complete battle when game ends
 * if (gameEnded) {
 *   await completeBattle(attemptId, won, finalLP);
 * }
 * ```
 *
 * @param props - Configuration object
 * @param props.lobbyId - Game lobby ID
 * @param props.gameId - Game ID for AI execution
 * @param props.onBattleComplete - Optional callback when battle completes
 *
 * @returns {UseStoryBattleReturn} Story battle interface
 */

import { handleHookError, logError } from "@/lib/errorHandling";
import type { CompleteChapterResult } from "@/types";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

interface UseStoryBattleProps {
  lobbyId: Id<"gameLobbies">;
  gameId: string;
  onBattleComplete?: (result: CompleteChapterResult) => void;
}

interface UseStoryBattleReturn {
  completeBattle: (
    attemptId: Id<"storyBattleAttempts">,
    won: boolean,
    finalLP: number
  ) => Promise<{ success: boolean; result?: CompleteChapterResult; error?: string }>;
  isAITurn: boolean;
  isExecutingAITurn: boolean;
}

export function useStoryBattle({
  lobbyId,
  gameId,
  onBattleComplete,
}: UseStoryBattleProps): UseStoryBattleReturn {
  const executeAITurnMutation = useMutation(api.gameplay.ai.aiTurn.executeAITurn);
  const completeBattleMutation = useMutation(api.progression.story.completeChapter);

  // Get game state to check if AI needs to take turn
  const gameState = useQuery(api.gameplay.games.queries.getGameStateForPlayer, { lobbyId });

  // Track if we're currently executing AI turn
  const isExecutingAITurn = useRef(false);

  // Auto-execute AI turn when it's AI's turn
  useEffect(() => {
    if (!gameState || isExecutingAITurn.current) return;

    // Check if it's AI's turn (opponent's turn in story mode)
    if (!gameState.isYourTurn && gameState.currentPhase === "draw") {
      isExecutingAITurn.current = true;

      // Execute AI turn after a brief delay for UX
      setTimeout(async () => {
        try {
          await executeAITurnMutation({ gameId });
        } catch (error) {
          logError("AI turn", error);
        } finally {
          isExecutingAITurn.current = false;
        }
      }, 1500);
    }
  }, [gameState, gameId, executeAITurnMutation]);

  // Complete story battle
  const completeBattle = useCallback(
    async (attemptId: Id<"storyBattleAttempts">, won: boolean, finalLP: number) => {
      try {
        const mutationResult = await completeBattleMutation({
          attemptId,
          won,
          finalLP,
        });

        // Transform mutation result to match CompleteChapterResult interface
        // Mutation returns `success`, but callback expects `won`
        const result: CompleteChapterResult = {
          won: mutationResult.success,
          rewards: mutationResult.rewards,
          starsEarned: mutationResult.starsEarned,
          levelUp: mutationResult.levelUp,
          newBadges: mutationResult.newBadges,
          cardsReceived: mutationResult.cardsReceived,
        };

        onBattleComplete?.(result);

        return { success: true, result };
      } catch (error) {
        logError("Failed to complete story battle", error);
        const message = handleHookError(error, "Failed to complete story battle");
        return { success: false, error: message };
      }
    },
    [completeBattleMutation, onBattleComplete]
  );

  return {
    completeBattle,
    isAITurn: !gameState?.isYourTurn,
    isExecutingAITurn: isExecutingAITurn.current,
  };
}
