import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";

export async function executeModifyDEF(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  targetCardId: Id<"cardDefinitions">,
  modifier: number,
  _isHost: boolean // Deprecated parameter, kept for compatibility
): Promise<{ success: boolean; message: string }> {
  // Determine which board the target is on
  const hostIndex = gameState.hostBoard.findIndex((bc) => bc.cardId === targetCardId);
  const opponentIndex = gameState.opponentBoard.findIndex((bc) => bc.cardId === targetCardId);

  if (hostIndex === -1 && opponentIndex === -1) {
    return { success: false, message: "Target not found on field" };
  }

  // Target is on host's board
  if (hostIndex !== -1) {
    const card = gameState.hostBoard[hostIndex];
    if (!card) {
      return { success: false, message: "Card not found at index" };
    }
    const newBoard = [...gameState.hostBoard];
    newBoard[hostIndex] = {
      ...card,
      defense: Math.max(0, card.defense + modifier),
    };

    await ctx.db.patch(gameState._id, {
      hostBoard: newBoard,
    });
  }
  // Target is on opponent's board
  else {
    const card = gameState.opponentBoard[opponentIndex];
    if (!card) {
      return { success: false, message: "Card not found at index" };
    }
    const newBoard = [...gameState.opponentBoard];
    newBoard[opponentIndex] = {
      ...card,
      defense: Math.max(0, card.defense + modifier),
    };

    await ctx.db.patch(gameState._id, {
      opponentBoard: newBoard,
    });
  }

  const cardDef = await ctx.db.get(targetCardId);
  return {
    success: true,
    message: `${cardDef?.name || "Target"} DEF ${modifier > 0 ? "increased" : "decreased"} by ${Math.abs(modifier)}`,
  };
}
