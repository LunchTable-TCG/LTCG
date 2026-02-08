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
  fromLocation: "board" | "graveyard" | "hand" | "deck" | "banished" | "spell_trap" = "board"
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
  } else if (fromLocation === "spell_trap") {
    const inHostZone = gameState.hostSpellTrapZone.some((sc) => sc.cardId === targetCardId);
    const inOpponentZone = gameState.opponentSpellTrapZone.some((sc) => sc.cardId === targetCardId);

    if (!inHostZone && !inOpponentZone) {
      return { success: false, message: "Card not found in spell/trap zone" };
    }

    targetIsHost = inHostZone;
    sourceZone = (targetIsHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone).map(
      (sc) => sc.cardId
    );
    sourceField = targetIsHost ? "hostSpellTrapZone" : "opponentSpellTrapZone";
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

  // Tokens cease to exist when leaving the field — don't send to banished zone
  if (fromLocation === "board") {
    const board = targetIsHost ? gameState.hostBoard : gameState.opponentBoard;
    const boardCard = board.find((bc) => bc.cardId === targetCardId);
    if (boardCard?.isToken) {
      const newBoard = board.filter((bc) => bc.cardId !== targetCardId);
      await ctx.db.patch(gameState._id, {
        [sourceField]: newBoard,
      });
      const tokenName = boardCard.tokenData?.name || "Token";
      return { success: true, message: `${tokenName} removed from play (token)` };
    }
  }

  // Remove from source zone
  const newSourceZone =
    fromLocation === "board"
      ? (targetIsHost ? gameState.hostBoard : gameState.opponentBoard).filter(
          (bc) => bc.cardId !== targetCardId
        )
      : fromLocation === "spell_trap"
        ? (targetIsHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone).filter(
            (sc) => sc.cardId !== targetCardId
          )
        : sourceZone.filter((c) => c !== targetCardId);

  // Add to banished zone
  const banishedZone = targetIsHost ? gameState.hostBanished : gameState.opponentBanished;
  const newBanishedZone = [...banishedZone, targetCardId];

  // Build update
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic game state updates with flexible field types
  const updates: Record<string, any> = {
    [sourceField]: newSourceZone,
    [targetIsHost ? "hostBanished" : "opponentBanished"]: newBanishedZone,
  };

  // Destroy equipped spells when monster is banished from board
  if (fromLocation === "board") {
    const board = targetIsHost ? gameState.hostBoard : gameState.opponentBoard;
    const boardCard = board.find((bc) => bc.cardId === targetCardId);
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
          ...gameState.hostGraveyard,
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
          ...gameState.opponentGraveyard,
          ...opponentEquips.map((st) => st.cardId),
        ];
      }
    }
  }

  // Update game state
  await ctx.db.patch(gameState._id, updates);

  return { success: true, message: `Banished ${card.name} from ${fromLocation}` };
}
