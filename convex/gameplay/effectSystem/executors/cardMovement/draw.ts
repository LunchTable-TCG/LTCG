import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";

export async function executeDraw(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  count: number
): Promise<{ success: boolean; message: string }> {
  const isHost = playerId === gameState.hostId;
  const deck = isHost ? gameState.hostDeck : gameState.opponentDeck;
  const hand = isHost ? gameState.hostHand : gameState.opponentHand;

  // Draw as many cards as available (partial draw if deck runs out)
  const actualDrawCount = Math.min(count, deck.length);

  if (actualDrawCount === 0) {
    // No cards available to draw
    return { success: false, message: "No cards left in deck (deck out)" };
  }

  // Draw cards
  const drawnCards = deck.slice(0, actualDrawCount);
  const newDeck = deck.slice(actualDrawCount);
  const newHand = [...hand, ...drawnCards];

  await ctx.db.patch(gameState._id, {
    [isHost ? "hostDeck" : "opponentDeck"]: newDeck,
    [isHost ? "hostHand" : "opponentHand"]: newHand,
  });

  if (actualDrawCount < count) {
    // Partial draw - drew what was available
    return {
      success: true,
      message: `Drew ${actualDrawCount} card(s) (only ${actualDrawCount} available)`
    };
  }

  return { success: true, message: `Drew ${count} card(s)` };
}
