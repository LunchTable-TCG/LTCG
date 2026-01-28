import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";
import { recordEventHelper } from "../../../gameEvents";

/**
 * Execute Send to Graveyard effect - Move card to GY without triggering destroy effects
 *
 * Different from destroy:
 * - Bypasses "cannot be destroyed by effects" protection
 * - Does NOT trigger "when destroyed" effects
 * - Direct send without destruction
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param lobbyId - Lobby ID for events
 * @param targetCardId - Card to send to graveyard
 * @param playerId - Player activating the effect
 * @param fromLocation - Source location (board, hand, deck)
 * @returns Success status and message
 */
export async function executeSendToGraveyard(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  targetCardId: Id<"cardDefinitions">,
  playerId: Id<"users">,
  fromLocation: "board" | "hand" | "deck" = "board"
): Promise<{ success: boolean; message: string }> {
  const isHost = playerId === gameState.hostId;

  // Get card details
  const card = await ctx.db.get(targetCardId);
  if (!card) {
    return { success: false, message: "Target card not found" };
  }

  // Determine which player owns the card and source location
  let sourceField: string;
  let targetIsHost = isHost;
  let graveyardField: string;

  if (fromLocation === "board") {
    const onHostBoard = gameState.hostBoard.some((bc) => bc.cardId === targetCardId);
    const onOpponentBoard = gameState.opponentBoard.some((bc) => bc.cardId === targetCardId);

    if (!onHostBoard && !onOpponentBoard) {
      return { success: false, message: "Card not found on field" };
    }

    targetIsHost = onHostBoard;
    sourceField = targetIsHost ? "hostBoard" : "opponentBoard";
    graveyardField = targetIsHost ? "hostGraveyard" : "opponentGraveyard";

    // Remove from board
    const board = targetIsHost ? gameState.hostBoard : gameState.opponentBoard;
    const newBoard = board.filter((bc) => bc.cardId !== targetCardId);

    // Add to graveyard
    const graveyard = targetIsHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
    const newGraveyard = [...graveyard, targetCardId];

    await ctx.db.patch(gameState._id, {
      [sourceField]: newBoard,
      [graveyardField]: newGraveyard,
    });
  } else if (fromLocation === "hand") {
    const inHostHand = gameState.hostHand.includes(targetCardId);
    const inOpponentHand = gameState.opponentHand.includes(targetCardId);

    if (!inHostHand && !inOpponentHand) {
      return { success: false, message: "Card not found in hand" };
    }

    targetIsHost = inHostHand;
    sourceField = targetIsHost ? "hostHand" : "opponentHand";
    graveyardField = targetIsHost ? "hostGraveyard" : "opponentGraveyard";

    // Remove from hand
    const hand = targetIsHost ? gameState.hostHand : gameState.opponentHand;
    const newHand = hand.filter((c) => c !== targetCardId);

    // Add to graveyard
    const graveyard = targetIsHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
    const newGraveyard = [...graveyard, targetCardId];

    await ctx.db.patch(gameState._id, {
      [sourceField]: newHand,
      [graveyardField]: newGraveyard,
    });
  } else {
    // deck
    const inHostDeck = gameState.hostDeck.includes(targetCardId);
    const inOpponentDeck = gameState.opponentDeck.includes(targetCardId);

    if (!inHostDeck && !inOpponentDeck) {
      return { success: false, message: "Card not found in deck" };
    }

    targetIsHost = inHostDeck;
    sourceField = targetIsHost ? "hostDeck" : "opponentDeck";
    graveyardField = targetIsHost ? "hostGraveyard" : "opponentGraveyard";

    // Remove from deck
    const deck = targetIsHost ? gameState.hostDeck : gameState.opponentDeck;
    const newDeck = deck.filter((c) => c !== targetCardId);

    // Add to graveyard
    const graveyard = targetIsHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
    const newGraveyard = [...graveyard, targetCardId];

    await ctx.db.patch(gameState._id, {
      [sourceField]: newDeck,
      [graveyardField]: newGraveyard,
    });
  }

  // Record event
  const lobby = await ctx.db.get(lobbyId);
  const user = await ctx.db.get(playerId);

  await recordEventHelper(ctx, {
    lobbyId,
    gameId: lobby?.gameId || "",
    turnNumber: lobby?.turnNumber || 0,
    eventType: "card_to_graveyard",
    playerId: playerId,
    playerUsername: user?.username || "Unknown",
    description: `Sent ${card.name} from ${fromLocation} to graveyard`,
    metadata: { cardId: targetCardId, fromLocation },
  });

  return { success: true, message: `Sent ${card.name} from ${fromLocation} to graveyard` };
}
