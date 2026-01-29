import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";

/**
 * Execute Banish effect - Remove card from play to banished zone
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param targetCardId - Card to banish
 * @param playerId - Player activating the effect
 * @param fromLocation - Source location (board, graveyard, hand, deck)
 * @returns Success status and message
 */
export async function executeBanish(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  targetCardId: Id<"cardDefinitions">,
  playerId: Id<"users">,
  fromLocation: "board" | "graveyard" | "hand" | "deck" | "banished" = "board"
): Promise<{ success: boolean; message: string }> {
  // Can't banish something already banished
  if (fromLocation === "banished") {
    return { success: false, message: "Card is already banished" };
  }
  const isHost = playerId === gameState.hostId;

  // Get card details
  const card = await ctx.db.get(targetCardId);
  if (!card) {
    return { success: false, message: "Target card not found" };
  }

  // Determine which player owns the card
  let sourceZone: Id<"cardDefinitions">[];
  let sourceField: string;
  let targetIsHost = isHost;

  // Find card in specified location
  if (fromLocation === "board") {
    const onHostBoard = gameState.hostBoard.some((bc) => bc.cardId === targetCardId);
    const onOpponentBoard = gameState.opponentBoard.some((bc) => bc.cardId === targetCardId);

    if (!onHostBoard && !onOpponentBoard) {
      return { success: false, message: "Card not found on field" };
    }

    targetIsHost = onHostBoard;
    sourceZone = targetIsHost
      ? gameState.hostBoard.map((bc) => bc.cardId)
      : gameState.opponentBoard.map((bc) => bc.cardId);
    sourceField = targetIsHost ? "hostBoard" : "opponentBoard";
  } else if (fromLocation === "graveyard") {
    const inHostGY = gameState.hostGraveyard.includes(targetCardId);
    const inOpponentGY = gameState.opponentGraveyard.includes(targetCardId);

    if (!inHostGY && !inOpponentGY) {
      return { success: false, message: "Card not found in graveyard" };
    }

    targetIsHost = inHostGY;
    sourceZone = targetIsHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
    sourceField = targetIsHost ? "hostGraveyard" : "opponentGraveyard";
  } else if (fromLocation === "hand") {
    const inHostHand = gameState.hostHand.includes(targetCardId);
    const inOpponentHand = gameState.opponentHand.includes(targetCardId);

    if (!inHostHand && !inOpponentHand) {
      return { success: false, message: "Card not found in hand" };
    }

    targetIsHost = inHostHand;
    sourceZone = targetIsHost ? gameState.hostHand : gameState.opponentHand;
    sourceField = targetIsHost ? "hostHand" : "opponentHand";
  } else {
    // deck
    const inHostDeck = gameState.hostDeck.includes(targetCardId);
    const inOpponentDeck = gameState.opponentDeck.includes(targetCardId);

    if (!inHostDeck && !inOpponentDeck) {
      return { success: false, message: "Card not found in deck" };
    }

    targetIsHost = inHostDeck;
    sourceZone = targetIsHost ? gameState.hostDeck : gameState.opponentDeck;
    sourceField = targetIsHost ? "hostDeck" : "opponentDeck";
  }

  // Remove from source zone
  const newSourceZone =
    fromLocation === "board"
      ? (targetIsHost ? gameState.hostBoard : gameState.opponentBoard).filter(
          (bc) => bc.cardId !== targetCardId
        )
      : sourceZone.filter((c) => c !== targetCardId);

  // Add to banished zone
  const banishedZone = targetIsHost ? gameState.hostBanished : gameState.opponentBanished;
  const newBanishedZone = [...banishedZone, targetCardId];

  // Update game state
  await ctx.db.patch(gameState._id, {
    [sourceField]: fromLocation === "board" ? newSourceZone : newSourceZone,
    [targetIsHost ? "hostBanished" : "opponentBanished"]: newBanishedZone,
  });

  return { success: true, message: `Banished ${card.name} from ${fromLocation}` };
}
