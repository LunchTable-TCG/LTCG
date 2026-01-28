import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";
import { recordEventHelper } from "../../../gameEvents";
import { parseAbility } from "../../parser";

export async function executeDestroy(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  targetCardId: Id<"cardDefinitions">,
  playerId: Id<"users">
): Promise<{
  success: boolean;
  message: string;
  destroyedCardId?: Id<"cardDefinitions">;
  destroyedCardOwnerId?: Id<"users">;
  hadDestroyTrigger?: boolean;
}> {

  // Check both boards for target
  const hostBoard = gameState.hostBoard;
  const opponentBoard = gameState.opponentBoard;

  const onHostBoard = hostBoard.some((bc) => bc.cardId === targetCardId);
  const onOpponentBoard = opponentBoard.some((bc) => bc.cardId === targetCardId);

  if (!onHostBoard && !onOpponentBoard) {
    return { success: false, message: "Target not found on field" };
  }

  // Determine which board and graveyard
  const targetIsHost = onHostBoard;
  const targetOwnerId = targetIsHost ? gameState.hostId : gameState.opponentId;
  const board = targetIsHost ? hostBoard : opponentBoard;
  const graveyard = targetIsHost ? gameState.hostGraveyard : gameState.opponentGraveyard;

  // Check for "Cannot be destroyed by effects" protection
  const boardCard = board.find((bc) => bc.cardId === targetCardId);
  if (boardCard?.cannotBeDestroyedByEffects) {
    const card = await ctx.db.get(targetCardId);
    return {
      success: false,
      message: `${card?.name || "Card"} cannot be destroyed by card effects`,
    };
  }

  // Get card details for trigger check
  const card = await ctx.db.get(targetCardId);

  // Check if card has on_destroy trigger (will be handled by executor.ts)
  let hadDestroyTrigger = false;
  if (card?.ability) {
    const parsedEffect = parseAbility(card.ability);
    hadDestroyTrigger = parsedEffect?.trigger === "on_destroy";
  }

  // Remove from board
  const newBoard = board.filter((bc) => bc.cardId !== targetCardId);

  // Add to graveyard
  const newGraveyard = [...graveyard, targetCardId];

  await ctx.db.patch(gameState._id, {
    [targetIsHost ? "hostBoard" : "opponentBoard"]: newBoard,
    [targetIsHost ? "hostGraveyard" : "opponentGraveyard"]: newGraveyard,
  });

  // Record event
  const lobby = await ctx.db.get(lobbyId);
  const user = await ctx.db.get(playerId);

  await recordEventHelper(ctx, {
    lobbyId,
    gameId: lobby?.gameId || "",
    turnNumber: lobby?.turnNumber || 0,
    eventType: "card_to_graveyard",
    playerId,
    playerUsername: user?.username || "Unknown",
    description: `${card?.name || "Card"} was destroyed by card effect`,
    metadata: { cardId: targetCardId, reason: "effect_destroy" },
  });

  return {
    success: true,
    message: `Destroyed ${card?.name || "target"}`,
    destroyedCardId: targetCardId,
    destroyedCardOwnerId: targetOwnerId,
    hadDestroyTrigger,
  };
}
