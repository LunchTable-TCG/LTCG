import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getCardAbility } from "../lib/abilityHelpers";
import { logger } from "../lib/debug";
import { executeEffect } from "./effectSystem/executor";
import { recordEventHelper } from "./gameEvents";

type TurnTrigger = "on_turn_start" | "on_turn_end";

function getUsername(user: Doc<"users"> | null): string {
  return user?.username ?? user?.name ?? "Unknown";
}

/**
 * Run board-based triggers that require no player prompts.
 *
 * This is intentionally conservative:
 * - Uses a snapshot of board card IDs for iteration
 * - Verifies the card is still on the field before executing each effect
 */
export async function runBoardTriggers(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  trigger: TurnTrigger
) {
  const hostUser = await ctx.db.get(gameState.hostId);
  const opponentUser = await ctx.db.get(gameState.opponentId);

  const hostUsername = getUsername(hostUser);
  const opponentUsername = getUsername(opponentUser);

  // Snapshot card IDs to keep ordering stable during mutations.
  const hostBoardSnapshot = gameState.hostBoard.map((bc) => bc.cardId);
  const opponentBoardSnapshot = gameState.opponentBoard.map((bc) => bc.cardId);

  const runForCard = async (
    controllerId: Id<"users">,
    controllerUsername: string,
    cardId: Id<"cardDefinitions">,
    controllerIsHost: boolean
  ) => {
    const cardDef = await ctx.db.get(cardId);
    const ability = getCardAbility(cardDef);
    if (!ability) return;

    for (let effectIndex = 0; effectIndex < ability.effects.length; effectIndex++) {
      const effect = ability.effects[effectIndex];
      if (!effect || effect.trigger !== trigger) continue;

      // Skip triggers for cards that have left the field since snapshot.
      const refreshedState = await ctx.db.get(gameState._id);
      if (!refreshedState) return;

      const boardNow = controllerIsHost ? refreshedState.hostBoard : refreshedState.opponentBoard;
      const stillOnField = boardNow.some((bc) => bc.cardId === cardId);
      if (!stillOnField) continue;

      const result = await executeEffect(
        ctx,
        refreshedState,
        lobbyId,
        effect,
        controllerId,
        cardId,
        [],
        effectIndex
      );

      if (result.success) {
        await recordEventHelper(ctx, {
          lobbyId,
          gameId: refreshedState.gameId,
          turnNumber: refreshedState.turnNumber ?? 0,
          eventType: "effect_activated",
          playerId: controllerId,
          playerUsername: controllerUsername,
          description: `${cardDef?.name ?? "Card"} agenda: ${result.message}`,
          metadata: { cardId, trigger },
        });
      } else if (result.requiresSelection) {
        // Agents and turn triggers must not prompt. Log and skip.
        logger.warn("Skipped trigger that requires selection", {
          lobbyId,
          gameId: refreshedState.gameId,
          trigger,
          cardId,
          effectIndex,
        });
      }
    }
  };

  // Run host board then opponent board for deterministic ordering.
  for (const cardId of hostBoardSnapshot) {
    await runForCard(gameState.hostId, hostUsername, cardId, true);
  }

  for (const cardId of opponentBoardSnapshot) {
    await runForCard(gameState.opponentId, opponentUsername, cardId, false);
  }
}

