import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";

export async function executeSpecialSummon(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  targetCardId: Id<"cardDefinitions">,
  playerId: Id<"users">,
  fromLocation: "hand" | "graveyard" | "deck" | "board" | "banished"
): Promise<{ success: boolean; message: string }> {
  const isHost = playerId === gameState.hostId;
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;

  // Check board space (max 5)
  if (board.length >= 5) {
    return { success: false, message: "Monster zone is full" };
  }

  // Get card details
  const card = await ctx.db.get(targetCardId);
  if (!card) {
    return { success: false, message: "Card not found" };
  }

  // Validate it's a monster
  if (card.cardType !== "creature") {
    return { success: false, message: "Can only summon monsters" };
  }

  // Remove from source location
  let sourceZone: Id<"cardDefinitions">[] = [];
  if (fromLocation === "hand") {
    sourceZone = isHost ? gameState.hostHand : gameState.opponentHand;
  } else if (fromLocation === "graveyard") {
    sourceZone = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
  } else {
    return { success: false, message: `Cannot summon from ${fromLocation}` };
  }

  if (!sourceZone.includes(targetCardId)) {
    return { success: false, message: `Card not found in ${fromLocation}` };
  }

  const newSourceZone = sourceZone.filter((c) => c !== targetCardId);

  // Add to board
  const newBoardCard = {
    cardId: targetCardId,
    position: 1, // Attack position
    attack: card.attack || 0,
    defense: card.defense || 0,
    hasAttacked: true, // Cannot attack turn it's special summoned (simplified)
    isFaceDown: false,
  };

  const newBoard = [...board, newBoardCard];

  // Update state
  await ctx.db.patch(gameState._id, {
    [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
    [fromLocation === "hand"
      ? isHost
        ? "hostHand"
        : "opponentHand"
      : isHost
        ? "hostGraveyard"
        : "opponentGraveyard"]: newSourceZone,
  });

  return { success: true, message: `Special Summoned ${card.name} from ${fromLocation}` };
}
