import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";
import { getCardAbility } from "../../../../lib/abilityHelpers";
import { recordEventHelper } from "../../../gameEvents";

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

  // Check if target is a token - tokens are just removed, not sent to graveyard
  let isToken = false;
  if (onHostBoard) {
    const boardCard = hostBoard.find((bc) => bc.cardId === targetCardId);
    isToken = boardCard?.isToken === true;
  } else if (onOpponentBoard) {
    const boardCard = opponentBoard.find((bc) => bc.cardId === targetCardId);
    isToken = boardCard?.isToken === true;
  }

  // Check field spell zones
  const onHostFieldSpell = gameState.hostFieldSpell?.cardId === targetCardId;
  const onOpponentFieldSpell = gameState.opponentFieldSpell?.cardId === targetCardId;

  // Check spell/trap zones
  const onHostSpellTrapZone = gameState.hostSpellTrapZone.some((st) => st.cardId === targetCardId);
  const onOpponentSpellTrapZone = gameState.opponentSpellTrapZone.some(
    (st) => st.cardId === targetCardId
  );

  if (
    !onHostBoard &&
    !onOpponentBoard &&
    !onHostFieldSpell &&
    !onOpponentFieldSpell &&
    !onHostSpellTrapZone &&
    !onOpponentSpellTrapZone
  ) {
    return { success: false, message: "Target not found on field" };
  }

  // Determine which side owns the card and which zones to update
  const targetIsHost = onHostBoard || onHostFieldSpell || onHostSpellTrapZone;
  const targetOwnerId = targetIsHost ? gameState.hostId : gameState.opponentId;
  const graveyard = targetIsHost ? gameState.hostGraveyard : gameState.opponentGraveyard;

  // If destroying a token, just remove it from board (don't send to graveyard)
  if (isToken) {
    // Get token name for event
    const board = targetIsHost ? hostBoard : opponentBoard;
    const tokenCard = board.find((bc) => bc.cardId === targetCardId);
    const tokenName = tokenCard?.tokenData?.name || "Token";

    // Remove from board
    const newBoard = board.filter((bc) => bc.cardId !== targetCardId);
    await ctx.db.patch(gameState._id, {
      [targetIsHost ? "hostBoard" : "opponentBoard"]: newBoard,
    });

    // Record event
    const lobby = await ctx.db.get(lobbyId);
    const user = await ctx.db.get(playerId);

    await recordEventHelper(ctx, {
      lobbyId,
      gameId: lobby?.gameId || "",
      turnNumber: lobby?.turnNumber || 0,
      eventType: "card_destroyed",
      playerId,
      playerUsername: user?.username || "Unknown",
      description: `${tokenName} was destroyed and removed from play`,
      metadata: {
        cardId: targetCardId,
        reason: "token_destroyed",
        isToken: true,
      },
    });

    return {
      success: true,
      message: `Destroyed ${tokenName} (token)`,
      destroyedCardId: targetCardId,
      destroyedCardOwnerId: targetOwnerId,
      hadDestroyTrigger: false, // Tokens don't have on_destroy effects
    };
  }

  // Check for "Cannot be destroyed by effects" protection (only for monsters)
  if (onHostBoard || onOpponentBoard) {
    const board = targetIsHost ? hostBoard : opponentBoard;
    const boardCard = board.find((bc) => bc.cardId === targetCardId);
    if (boardCard?.cannotBeDestroyedByEffects) {
      const card = await ctx.db.get(targetCardId);
      return {
        success: false,
        message: `${card?.name || "Card"} cannot be destroyed by card effects`,
      };
    }
  }

  // Get card details for trigger check
  const card = await ctx.db.get(targetCardId);

  // Check if card has on_destroy trigger (will be handled by executor.ts)
  let hadDestroyTrigger = false;
  const parsedAbility = getCardAbility(card);
  if (parsedAbility) {
    hadDestroyTrigger = parsedAbility.effects.some(
      (effect) =>
        effect.trigger === "on_destroy" ||
        effect.trigger === "on_destroy_by_battle" ||
        effect.trigger === "on_destroy_by_effect"
    );
  }

  // Add to graveyard
  const newGraveyard = [...graveyard, targetCardId];

  // Remove from appropriate zone
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic game state updates with flexible field types
  const updates: Record<string, any> = {
    [targetIsHost ? "hostGraveyard" : "opponentGraveyard"]: newGraveyard,
  };

  if (onHostBoard) {
    // If destroying a monster, also destroy its equip spells
    const boardCard = hostBoard.find((bc) => bc.cardId === targetCardId);
    if (boardCard?.equippedCards && boardCard.equippedCards.length > 0) {
      const equippedIds = boardCard.equippedCards;
      const hostEquips = gameState.hostSpellTrapZone.filter((st) =>
        equippedIds.includes(st.cardId)
      );
      if (hostEquips.length > 0) {
        updates["hostSpellTrapZone"] = gameState.hostSpellTrapZone.filter(
          (st) => !equippedIds.includes(st.cardId)
        );
        // Accumulate onto newGraveyard (which already includes the destroyed monster)
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
    updates["hostBoard"] = hostBoard.filter((bc) => bc.cardId !== targetCardId);
  } else if (onOpponentBoard) {
    // If destroying a monster, also destroy its equip spells
    const boardCard = opponentBoard.find((bc) => bc.cardId === targetCardId);
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
    updates["opponentBoard"] = opponentBoard.filter((bc) => bc.cardId !== targetCardId);
  } else if (onHostFieldSpell) {
    updates["hostFieldSpell"] = undefined;
  } else if (onOpponentFieldSpell) {
    updates["opponentFieldSpell"] = undefined;
  } else if (onHostSpellTrapZone) {
    // If destroying an equip spell, remove it from the monster's equippedCards array
    const equipSpell = gameState.hostSpellTrapZone.find((st) => st.cardId === targetCardId);
    if (equipSpell?.equippedTo) {
      // Find the monster and remove this equip from its list
      const hostMonsterIdx = hostBoard.findIndex((m) => m.cardId === equipSpell.equippedTo);
      const opponentMonsterIdx = opponentBoard.findIndex((m) => m.cardId === equipSpell.equippedTo);

      if (hostMonsterIdx !== -1) {
        const monster = hostBoard[hostMonsterIdx];
        if (monster) {
          const updatedMonster = {
            ...monster,
            equippedCards: (monster.equippedCards || []).filter((id) => id !== targetCardId),
          };
          const updatedBoard = [...hostBoard];
          updatedBoard[hostMonsterIdx] = updatedMonster;
          updates["hostBoard"] = updatedBoard;
        }
      } else if (opponentMonsterIdx !== -1) {
        const monster = opponentBoard[opponentMonsterIdx];
        if (monster) {
          const updatedMonster = {
            ...monster,
            equippedCards: (monster.equippedCards || []).filter((id) => id !== targetCardId),
          };
          const updatedBoard = [...opponentBoard];
          updatedBoard[opponentMonsterIdx] = updatedMonster;
          updates["opponentBoard"] = updatedBoard;
        }
      }
    }
    updates["hostSpellTrapZone"] = gameState.hostSpellTrapZone.filter(
      (st) => st.cardId !== targetCardId
    );
  } else if (onOpponentSpellTrapZone) {
    // If destroying an equip spell, remove it from the monster's equippedCards array
    const equipSpell = gameState.opponentSpellTrapZone.find((st) => st.cardId === targetCardId);
    if (equipSpell?.equippedTo) {
      // Find the monster and remove this equip from its list
      const hostMonsterIdx = hostBoard.findIndex((m) => m.cardId === equipSpell.equippedTo);
      const opponentMonsterIdx = opponentBoard.findIndex((m) => m.cardId === equipSpell.equippedTo);

      if (hostMonsterIdx !== -1) {
        const monster = hostBoard[hostMonsterIdx];
        if (monster) {
          const updatedMonster = {
            ...monster,
            equippedCards: (monster.equippedCards || []).filter((id) => id !== targetCardId),
          };
          const updatedBoard = [...hostBoard];
          updatedBoard[hostMonsterIdx] = updatedMonster;
          updates["hostBoard"] = updatedBoard;
        }
      } else if (opponentMonsterIdx !== -1) {
        const monster = opponentBoard[opponentMonsterIdx];
        if (monster) {
          const updatedMonster = {
            ...monster,
            equippedCards: (monster.equippedCards || []).filter((id) => id !== targetCardId),
          };
          const updatedBoard = [...opponentBoard];
          updatedBoard[opponentMonsterIdx] = updatedMonster;
          updates["opponentBoard"] = updatedBoard;
        }
      }
    }
    updates["opponentSpellTrapZone"] = gameState.opponentSpellTrapZone.filter(
      (st) => st.cardId !== targetCardId
    );
  }

  await ctx.db.patch(gameState._id, updates);

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
