import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";
import { recordEventHelper } from "../../../gameEvents";

/**
 * Execute "Add to Hand" effect
 * Moves a card from graveyard (or other zone) to hand
 */
export async function executeToHand(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  targetCardId: Id<"cardDefinitions">,
  playerId: Id<"users">,
  sourceLocation: "graveyard" | "hand" | "board" | "deck" | "banished"
): Promise<{ success: boolean; message: string }> {
  const isHost = playerId === gameState.hostId;
  const hand = isHost ? gameState.hostHand : gameState.opponentHand;
  const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;
  const opponentHand = isHost ? gameState.opponentHand : gameState.hostHand;

  // Get card details
  const card = await ctx.db.get(targetCardId);
  if (!card) {
    return { success: false, message: "Card not found" };
  }

  let newHand = hand;
  let description = "";

  if (sourceLocation === "graveyard") {
    // Add from graveyard to hand (own card)
    if (!graveyard.includes(targetCardId)) {
      return { success: false, message: "Card not found in graveyard" };
    }

    const newGraveyard = graveyard.filter((c) => c !== targetCardId);
    newHand = [...hand, targetCardId];

    await ctx.db.patch(gameState._id, {
      [isHost ? "hostGraveyard" : "opponentGraveyard"]: newGraveyard,
      [isHost ? "hostHand" : "opponentHand"]: newHand,
    });

    description = `${card.name} added from graveyard to hand`;
  } else if (sourceLocation === "board") {
    // Return card from board to hand (bounce effect)
    // Check own board first
    const onOwnBoard = board.find((bc) => bc.cardId === targetCardId);
    const onOpponentBoard = opponentBoard.find((bc) => bc.cardId === targetCardId);

    if (onOwnBoard) {
      // Return own card to own hand
      const newBoard = board.filter((bc) => bc.cardId !== targetCardId);
      newHand = [...hand, targetCardId];

      await ctx.db.patch(gameState._id, {
        [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
        [isHost ? "hostHand" : "opponentHand"]: newHand,
      });

      description = `${card.name} returned to hand`;
    } else if (onOpponentBoard) {
      // Return opponent's card to opponent's hand
      const newOpponentBoard = opponentBoard.filter((bc) => bc.cardId !== targetCardId);
      const newOpponentHand = [...opponentHand, targetCardId];

      await ctx.db.patch(gameState._id, {
        [isHost ? "opponentBoard" : "hostBoard"]: newOpponentBoard,
        [isHost ? "opponentHand" : "hostHand"]: newOpponentHand,
      });

      description = `${card.name} returned to opponent's hand`;
    } else {
      return { success: false, message: "Card not found on field" };
    }
  } else {
    return { success: false, message: `Cannot add from ${sourceLocation} yet` };
  }

  // Record card_to_hand event
  const lobby = await ctx.db.get(lobbyId);
  const user = await ctx.db.get(playerId);

  await recordEventHelper(ctx, {
    lobbyId,
    gameId: lobby?.gameId || "",
    turnNumber: lobby?.turnNumber || 0,
    eventType: "card_to_hand",
    playerId,
    playerUsername: user?.username || "Unknown",
    description,
    metadata: {
      cardId: targetCardId,
      cardName: card.name,
      sourceLocation,
    },
  });

  return { success: true, message: description };
}
