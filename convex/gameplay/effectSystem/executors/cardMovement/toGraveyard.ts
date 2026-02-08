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
  fromLocation: "board" | "hand" | "deck" | "spell_trap" = "board"
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
    const boardCard = board.find((bc) => bc.cardId === targetCardId);

    // Tokens cease to exist when leaving the field — don't send to graveyard
    if (boardCard?.isToken) {
      const newBoard = board.filter((bc) => bc.cardId !== targetCardId);
      await ctx.db.patch(gameState._id, {
        [sourceField]: newBoard,
      });

      const tokenName = boardCard.tokenData?.name || "Token";
      const lobby = await ctx.db.get(lobbyId);
      const user = await ctx.db.get(playerId);
      await recordEventHelper(ctx, {
        lobbyId,
        gameId: lobby?.gameId || "",
        turnNumber: lobby?.turnNumber || 0,
        eventType: "card_to_graveyard",
        playerId,
        playerUsername: user?.username || "Unknown",
        description: `${tokenName} was removed from play (token)`,
        metadata: { cardId: targetCardId, fromLocation, isToken: true },
      });
      return { success: true, message: `${tokenName} removed from play (token)` };
    }

    const newBoard = board.filter((bc) => bc.cardId !== targetCardId);

    // Add to graveyard
    const graveyard = targetIsHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
    const newGraveyard = [...graveyard, targetCardId];

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic game state updates with flexible field types
    const updates: Record<string, any> = {
      [sourceField]: newBoard,
      [graveyardField]: newGraveyard,
    };

    // Destroy equipped spells when monster leaves the board
    if (boardCard?.equippedCards && boardCard.equippedCards.length > 0) {
      const equippedIds = boardCard.equippedCards;
      const hostEquips = gameState.hostSpellTrapZone.filter((st) =>
        equippedIds.includes(st.cardId)
      );
      if (hostEquips.length > 0) {
        updates["hostSpellTrapZone"] = gameState.hostSpellTrapZone.filter(
          (st) => !equippedIds.includes(st.cardId)
        );
        updates["hostGraveyard"] = [
          ...(updates["hostGraveyard"] ?? gameState.hostGraveyard),
          ...hostEquips.map((st) => st.cardId),
        ];
      }
      const opponentEquips = gameState.opponentSpellTrapZone.filter((st) =>
        equippedIds.includes(st.cardId)
      );
      if (opponentEquips.length > 0) {
        updates["opponentSpellTrapZone"] = gameState.opponentSpellTrapZone.filter(
          (st) => !equippedIds.includes(st.cardId)
        );
        updates["opponentGraveyard"] = [
          ...(updates["opponentGraveyard"] ?? gameState.opponentGraveyard),
          ...opponentEquips.map((st) => st.cardId),
        ];
      }
    }

    await ctx.db.patch(gameState._id, updates);
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
  } else if (fromLocation === "spell_trap") {
    const inHostZone = gameState.hostSpellTrapZone.some((sc) => sc.cardId === targetCardId);
    const inOpponentZone = gameState.opponentSpellTrapZone.some((sc) => sc.cardId === targetCardId);

    if (!inHostZone && !inOpponentZone) {
      return { success: false, message: "Card not found in spell/trap zone" };
    }

    targetIsHost = inHostZone;
    sourceField = targetIsHost ? "hostSpellTrapZone" : "opponentSpellTrapZone";
    graveyardField = targetIsHost ? "hostGraveyard" : "opponentGraveyard";

    const zone = targetIsHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;
    const newZone = zone.filter((sc) => sc.cardId !== targetCardId);
    const graveyard = targetIsHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
    const newGraveyard = [...graveyard, targetCardId];

    await ctx.db.patch(gameState._id, {
      [sourceField]: newZone,
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
