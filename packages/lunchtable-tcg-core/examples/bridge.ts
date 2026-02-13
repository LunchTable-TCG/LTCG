/**
 * Example: Bridge Module
 *
 * This file demonstrates how a host Convex app wires @lunchtable-tcg components
 * together using function handles. The bridge module coordinates between the three
 * isolated components to create a complete TCG game experience.
 *
 * Setup Guide:
 * 1. Install components in your convex.config.ts
 * 2. Instantiate clients in a shared module
 * 3. Create bridge functions that coordinate between components
 * 4. Register hooks on game startup to wire components together
 *
 * Components:
 * - @lunchtable-tcg/core    - Card defs, decks, game state, phases, turns, matchmaking
 * - @lunchtable-tcg/combat  - Battle system, damage calculation, attack/defense
 * - @lunchtable-tcg/effects - Effect chains, triggers, continuous effects, OPT tracking
 */

// ==========================================
// STEP 1: Configure Components
// ==========================================

// Place this in your app's convex.config.ts:
/*
import { defineApp } from "convex/server";
import ltcgCore from "@lunchtable-tcg/core/convex.config";
import ltcgCombat from "@lunchtable-tcg/combat/convex.config";
import ltcgEffects from "@lunchtable-tcg/effects/convex.config";

const app = defineApp();
app.use(ltcgCore, { name: "ltcgCore" });
app.use(ltcgCombat, { name: "ltcgCombat" });
app.use(ltcgEffects, { name: "ltcgEffects" });

export default app;
*/

// ==========================================
// STEP 2: Instantiate Clients
// ==========================================

// Place this in convex/ltcg.ts (shared client instances):
/*
import { components } from "./_generated/api";
import { LTCGCore } from "@lunchtable-tcg/core";
import { LTCGCombat } from "@lunchtable-tcg/combat";
import { LTCGEffects } from "@lunchtable-tcg/effects";

export const core = new LTCGCore(components.ltcgCore);
export const combat = new LTCGCombat(components.ltcgCombat);
export const effects = new LTCGEffects(components.ltcgEffects);
*/

// ==========================================
// STEP 3: Bridge Functions
// ==========================================

// Place this in convex/gameBridge.ts:

/*
import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { createFunctionHandle } from "convex/server";
import { core, combat, effects } from "./ltcg";
import { api, internal } from "./_generated/api";

// ------------------------------------------
// Core Bridge: Apply battle damage to game state
// ------------------------------------------

// This bridge function is called when a battle resolves in the combat component.
// It applies damage/destruction to the core game state and triggers downstream effects.
export const applyBattleDamage = internalMutation({
  args: {
    gameId: v.string(),
    battleId: v.string(),
    result: v.object({
      winner: v.string(), // "attacker" | "defender" | "draw"
      damageDealt: v.number(),
      damageTo: v.string(), // playerId
      destroyedCards: v.array(v.string()),
      attackerId: v.string(),
      targetId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { gameId, battleId, result }) => {
    // 1. Apply damage to player life points
    if (result.damageDealt > 0) {
      await core.game.modifyLP(ctx, {
        gameId,
        playerId: result.damageTo,
        delta: -result.damageDealt,
      });
    }

    // 2. Destroy cards that lost the battle
    for (const cardId of result.destroyedCards) {
      const gameState = await core.game.getState(ctx, { gameId });
      const playerState = gameState.players.find(p =>
        p.field.some((c: any) => c.instanceId === cardId)
      );

      if (playerState) {
        await core.game.moveCard(ctx, {
          gameId,
          playerId: playerState.id,
          instanceId: cardId,
          from: "field",
          to: "graveyard",
        });

        // Trigger "on_destroy" effects
        await ctx.runMutation(internal.gameBridge.onCardDestroyed, {
          gameId,
          cardId,
          reason: "battle",
        });
      }
    }

    // 3. Log the battle result
    await core.events.log(ctx, {
      gameId,
      type: "battle_resolved",
      data: {
        battleId,
        result,
      },
    });

    // 4. Check for game-ending condition (LP <= 0)
    const finalState = await core.game.getState(ctx, { gameId });
    for (const player of finalState.players) {
      if (player.lifePoints <= 0) {
        const opponent = finalState.players.find(p => p.id !== player.id);
        await core.game.endGame(ctx, {
          gameId,
          winnerId: opponent?.id,
          reason: "life_points_zero",
        });
      }
    }
  },
});

// ------------------------------------------
// Effect Bridge: Handle card destruction triggers
// ------------------------------------------

// This bridge is called when a card is destroyed.
// It checks for triggered effects and opens a chain window if needed.
export const onCardDestroyed = internalMutation({
  args: {
    gameId: v.string(),
    cardId: v.string(),
    reason: v.string(), // "battle" | "effect" | "rule"
  },
  handler: async (ctx, { gameId, cardId, reason }) => {
    // 1. Get all triggers registered for "on_destroy"
    const triggers = await effects.triggers.getTriggered(ctx, {
      gameId,
      triggerEvent: "on_destroy",
    });

    // 2. Filter triggers that care about this card
    const relevantTriggers = triggers.filter((t: any) =>
      !t.metadata?.filter || t.metadata.filter({ cardId, reason })
    );

    if (relevantTriggers.length === 0) {
      return;
    }

    // 3. Start a chain for trigger effects
    const chainId = await effects.chains.startChain(ctx, {
      gameId,
      priorityPlayerId: relevantTriggers[0].metadata.playerId,
    });

    // 4. Add each trigger to the chain (in SEGOC order)
    for (const trigger of relevantTriggers) {
      await effects.chains.addToChain(ctx, {
        chainId,
        cardId: trigger.sourceCardId,
        playerId: trigger.metadata.playerId,
        effectId: trigger.metadata.effectId,
        spellSpeed: trigger.spellSpeed,
        targets: [cardId],
      });
    }

    // 5. Log the trigger activation
    await core.events.log(ctx, {
      gameId,
      type: "triggers_activated",
      data: {
        event: "on_destroy",
        cardId,
        triggers: relevantTriggers.map((t: any) => t._id),
      },
    });
  },
});

// ------------------------------------------
// Effect Bridge: Handle damage dealt triggers
// ------------------------------------------

export const onDamageDealt = internalMutation({
  args: {
    gameId: v.string(),
    playerId: v.string(),
    amount: v.number(),
    source: v.string(), // cardId or "battle"
  },
  handler: async (ctx, { gameId, playerId, amount, source }) => {
    const triggers = await effects.triggers.getTriggered(ctx, {
      gameId,
      triggerEvent: "on_damage",
    });

    if (triggers.length === 0) {
      return;
    }

    const chainId = await effects.chains.startChain(ctx, {
      gameId,
      priorityPlayerId: playerId,
    });

    for (const trigger of triggers) {
      await effects.chains.addToChain(ctx, {
        chainId,
        cardId: trigger.sourceCardId,
        playerId: trigger.metadata.playerId,
        effectId: trigger.metadata.effectId,
        spellSpeed: trigger.spellSpeed,
        targets: [playerId],
      });
    }

    await core.events.log(ctx, {
      gameId,
      type: "triggers_activated",
      data: {
        event: "on_damage",
        playerId,
        amount,
        source,
      },
    });
  },
});

// ------------------------------------------
// Effect Bridge: Handle phase change triggers
// ------------------------------------------

export const onPhaseEnter = internalMutation({
  args: {
    gameId: v.string(),
    phase: v.string(),
    playerId: v.string(),
  },
  handler: async (ctx, { gameId, phase, playerId }) => {
    // Clean up effects that expire at phase boundaries
    const gameState = await core.game.getState(ctx, { gameId });
    await effects.effects.cleanupExpired(ctx, {
      gameId,
      currentTurn: gameState.turnNumber,
      currentPhase: phase,
    });

    // Check for phase-enter triggers
    const triggers = await effects.triggers.getTriggered(ctx, {
      gameId,
      triggerEvent: "phase_enter",
    });

    const phaseTriggers = triggers.filter(
      (t: any) => t.metadata?.phase === phase
    );

    if (phaseTriggers.length > 0) {
      const chainId = await effects.chains.startChain(ctx, {
        gameId,
        priorityPlayerId: playerId,
      });

      for (const trigger of phaseTriggers) {
        await effects.chains.addToChain(ctx, {
          chainId,
          cardId: trigger.sourceCardId,
          playerId: trigger.metadata.playerId,
          effectId: trigger.metadata.effectId,
          spellSpeed: trigger.spellSpeed,
          targets: [],
        });
      }
    }

    await core.events.log(ctx, {
      gameId,
      type: "phase_entered",
      data: { phase, playerId },
    });
  },
});

// ------------------------------------------
// Effect Bridge: Handle turn end triggers
// ------------------------------------------

export const onTurnEnd = internalMutation({
  args: {
    gameId: v.string(),
    playerId: v.string(),
    turnNumber: v.number(),
  },
  handler: async (ctx, { gameId, playerId, turnNumber }) => {
    // Reset OPT tracking for the new turn
    await effects.effects.resetForTurn(ctx, {
      gameId,
      currentTurn: turnNumber + 1,
    });

    // Clean up turn-based effects
    await effects.effects.cleanupExpired(ctx, {
      gameId,
      currentTurn: turnNumber + 1,
      currentPhase: "draw",
    });

    await core.events.log(ctx, {
      gameId,
      type: "turn_ended",
      data: { playerId, turnNumber },
    });
  },
});

// ------------------------------------------
// Effect Bridge: Apply continuous effects to card stats
// ------------------------------------------

export const getModifiedStats = mutation({
  args: {
    gameId: v.string(),
    cardId: v.string(),
    baseStats: v.object({
      attack: v.number(),
      defense: v.number(),
    }),
  },
  handler: async (ctx, { gameId, cardId, baseStats }) => {
    // Get all active modifiers targeting this card
    const modifiers = await effects.effects.getModifiers(ctx, {
      gameId,
      targetCardId: cardId,
    });

    let attack = baseStats.attack;
    let defense = baseStats.defense;

    // Apply each modifier in sequence
    for (const mod of modifiers) {
      if (mod.stat === "attack") {
        attack += mod.delta;
      } else if (mod.stat === "defense") {
        defense += mod.delta;
      }
    }

    return {
      attack: Math.max(0, attack),
      defense: Math.max(0, defense),
      modifiers,
    };
  },
});

// ------------------------------------------
// Game Flow: Full attack sequence
// ------------------------------------------

// This is the main entry point for a player attacking.
// It coordinates combat + effects + core state updates.
export const performAttack = mutation({
  args: {
    gameId: v.string(),
    attackerId: v.string(),
    targetId: v.optional(v.string()), // undefined = direct attack
    playerId: v.string(),
  },
  handler: async (ctx, { gameId, attackerId, targetId, playerId }) => {
    // 1. Verify game state and phase
    const gameState = await core.game.getState(ctx, { gameId });
    if (gameState.currentPhase !== "battle") {
      throw new Error("Can only attack during battle phase");
    }
    if (gameState.players[gameState.currentPlayerIndex].id !== playerId) {
      throw new Error("Not your turn");
    }

    // 2. Get attacker's current stats (with continuous effects applied)
    const attackerCard = gameState.players[gameState.currentPlayerIndex].field
      .find((c: any) => c.instanceId === attackerId);
    if (!attackerCard) {
      throw new Error("Attacker not on field");
    }

    const attackerStats = await ctx.runMutation(
      api.gameBridge.getModifiedStats,
      {
        gameId,
        cardId: attackerId,
        baseStats: {
          attack: attackerCard.attack,
          defense: attackerCard.defense,
        },
      }
    );

    // 3. Get target stats if attacking a monster
    let targetStats;
    if (targetId) {
      const opponent = gameState.players.find(
        p => p.id !== playerId
      );
      const targetCard = opponent?.field.find(
        (c: any) => c.instanceId === targetId
      );
      if (!targetCard) {
        throw new Error("Target not found");
      }

      targetStats = await ctx.runMutation(
        api.gameBridge.getModifiedStats,
        {
          gameId,
          cardId: targetId,
          baseStats: {
            attack: targetCard.attack,
            defense: targetCard.defense,
          },
        }
      );
    }

    // 4. Check for "on_attack" triggers
    const attackTriggers = await effects.triggers.getTriggered(ctx, {
      gameId,
      triggerEvent: "on_attack",
    });

    if (attackTriggers.length > 0) {
      // Open chain window for fast effects/traps
      // This would pause execution and wait for player input via UI
      // For this example, we skip the chain
    }

    // 5. Declare the attack in combat component
    const battleId = await combat.battle.declareAttack(ctx, {
      gameId,
      attackerId,
      targetId: targetId || "player",
      attackerPlayerId: playerId,
      attackerStats: {
        attack: attackerStats.attack,
        defense: attackerStats.defense,
      },
      targetStats: targetId ? {
        attack: targetStats.attack,
        defense: targetStats.defense,
        position: "attack", // or "defense"
      } : undefined,
    });

    // 6. Apply any battle modifiers from effects
    const battleModifiers = await effects.effects.getModifiers(ctx, {
      gameId,
    });

    for (const mod of battleModifiers) {
      if (mod.metadata?.applyToBattle === battleId) {
        await combat.battle.addModifier(ctx, {
          battleId,
          source: mod.sourceCardId,
          stat: mod.stat,
          delta: mod.delta,
        });
      }
    }

    // 7. Advance battle to damage calculation
    await combat.battle.advanceBattlePhase(ctx, { battleId });

    // 8. Resolve the battle
    const result = await combat.battle.resolveBattle(ctx, {
      battleId,
      turn: gameState.turnNumber,
    });

    // 9. Apply battle result to core game state
    await ctx.runMutation(internal.gameBridge.applyBattleDamage, {
      gameId,
      battleId,
      result: {
        winner: result.winner,
        damageDealt: result.damageDealt,
        damageTo: result.damageTo,
        destroyedCards: result.destroyedCards,
        attackerId,
        targetId,
      },
    });

    return {
      battleId,
      result,
    };
  },
});

// ==========================================
// STEP 4: Register Hooks on Game Setup
// ==========================================

// Call this when creating a new game to wire components together.
export const setupGameHooks = mutation({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, { gameId }) => {
    // Hook 1: Battle damage applies to core game state
    const damageHandle = await createFunctionHandle(
      internal.gameBridge.applyBattleDamage
    );
    await core.hooks.register(ctx, {
      event: "battle_resolved",
      callbackHandle: damageHandle,
      filter: { gameId },
    });

    // Hook 2: Card destruction triggers effect chains
    const destroyHandle = await createFunctionHandle(
      internal.gameBridge.onCardDestroyed
    );
    await core.hooks.register(ctx, {
      event: "card_destroyed",
      callbackHandle: destroyHandle,
      filter: { gameId },
    });

    // Hook 3: Phase changes clean up effects and trigger events
    const phaseHandle = await createFunctionHandle(
      internal.gameBridge.onPhaseEnter
    );
    await core.hooks.onPhaseEnter(ctx, {
      phase: "all",
      callbackHandle: phaseHandle,
    });

    // Hook 4: Turn end resets OPT and cleans effects
    const turnEndHandle = await createFunctionHandle(
      internal.gameBridge.onTurnEnd
    );
    await core.hooks.onTurnEnd(ctx, {
      callbackHandle: turnEndHandle,
    });

    // Hook 5: Damage dealt triggers effects
    const damageDealtHandle = await createFunctionHandle(
      internal.gameBridge.onDamageDealt
    );
    await core.hooks.register(ctx, {
      event: "damage_dealt",
      callbackHandle: damageDealtHandle,
      filter: { gameId },
    });

    await core.events.log(ctx, {
      gameId,
      type: "hooks_registered",
      data: { hookCount: 5 },
    });
  },
});

// ==========================================
// STEP 5: Create Game with Full Setup
// ==========================================

export const createGame = mutation({
  args: {
    player1Id: v.string(),
    player2Id: v.string(),
    deck1Id: v.string(),
    deck2Id: v.string(),
  },
  handler: async (ctx, { player1Id, player2Id, deck1Id, deck2Id }) => {
    // 1. Create the game in core component
    const gameId = await core.game.create(ctx, {
      players: [
        { id: player1Id, deckId: deck1Id },
        { id: player2Id, deckId: deck2Id },
      ],
      config: {
        startingLP: 8000,
        maxHandSize: 7,
        phases: ["draw", "standby", "main1", "battle", "main2", "end"],
        drawPerTurn: 1,
        maxFieldSlots: 5,
        maxBackrowSlots: 5,
      },
    });

    // 2. Wire components together via hooks
    await ctx.runMutation(api.gameBridge.setupGameHooks, { gameId });

    // 3. Return the game ID
    return gameId;
  },
});

// ==========================================
// Usage in Your App
// ==========================================

// From React components:
/*
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

function GameLobby() {
  const createGame = useMutation(api.gameBridge.createGame);
  const performAttack = useMutation(api.gameBridge.performAttack);

  const handleStartGame = async () => {
    const gameId = await createGame({
      player1Id: currentUser.id,
      player2Id: opponent.id,
      deck1Id: selectedDeck.id,
      deck2Id: opponentDeck.id,
    });
    router.push(`/game/${gameId}`);
  };

  const handleAttack = async () => {
    await performAttack({
      gameId,
      attackerId: selectedCard.instanceId,
      targetId: targetCard?.instanceId,
      playerId: currentUser.id,
    });
  };

  return (
    <div>
      <button onClick={handleStartGame}>Start Game</button>
      <button onClick={handleAttack}>Attack</button>
    </div>
  );
}
*/
*/
