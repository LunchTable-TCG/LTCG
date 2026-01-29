import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";

export async function executeModifyDEF(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  targetCardId: Id<"cardDefinitions">,
  modifier: number,
  isHost: boolean
): Promise<{ success: boolean; message: string }> {
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const cardIndex = board.findIndex((bc) => bc.cardId === targetCardId);

  if (cardIndex === -1) {
    return { success: false, message: "Target not found on field" };
  }

  const card = board[cardIndex];
  if (!card) {
    return { success: false, message: "Card not found at index" };
  }
  const newBoard = [...board];
  newBoard[cardIndex] = {
    ...card,
    defense: Math.max(0, card.defense + modifier),
  };

  await ctx.db.patch(gameState._id, {
    [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
  });

  const cardDef = await ctx.db.get(targetCardId);
  return {
    success: true,
    message: `${cardDef?.name || "Target"} DEF ${modifier > 0 ? "increased" : "decreased"} by ${Math.abs(modifier)}`,
  };
}
