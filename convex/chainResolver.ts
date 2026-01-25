/**
 * Chain Resolver
 *
 * Handles Yu-Gi-Oh chain mechanics:
 * - Chain Link stacking (CL1, CL2, CL3, etc.)
 * - Spell Speed validation
 * - Reverse resolution order (CL3 → CL2 → CL1)
 * - Priority passing
 *
 * Note: This is a simplified MVP implementation.
 * Full implementation would require comprehensive effect resolution system.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { getUserFromToken } from "./lib/auth";

/**
 * Add effect to chain
 *
 * Validates spell speed compatibility and adds to current chain.
 * Records: chain_link_added
 */
export const addToChain = mutation({
  args: {
    token: v.string(),
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    spellSpeed: v.number(), // 1, 2, or 3
    effect: v.string(),
    targets: v.optional(v.array(v.id("cardDefinitions"))),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Invalid session token");
    }

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found");
    }

    // 3. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw new Error("Game state not found");
    }

    // 4. Get current chain (or initialize empty)
    const currentChain = gameState.currentChain || [];

    // 5. Validate spell speed
    if (currentChain.length > 0) {
      const lastChainLink = currentChain[currentChain.length - 1];
      if (args.spellSpeed < lastChainLink.spellSpeed) {
        throw new Error(
          `Cannot chain Spell Speed ${args.spellSpeed} to Spell Speed ${lastChainLink.spellSpeed}`
        );
      }
    }

    // 6. Create new chain link
    const newChainLink = {
      cardId: args.cardId,
      playerId: user.userId,
      spellSpeed: args.spellSpeed,
      effect: args.effect,
      targets: args.targets,
    };

    const updatedChain = [...currentChain, newChainLink];

    // 7. Update game state
    await ctx.db.patch(gameState._id, {
      currentChain: updatedChain,
    });

    // 8. Get card details
    const card = await ctx.db.get(args.cardId);

    // 9. Record chain_link_added event
    await ctx.runMutation(api.gameEvents.recordEvent, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId!,
      turnNumber: lobby.turnNumber!,
      eventType: "chain_link_added",
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username} added ${card?.name || "a card"} to the chain (Chain Link ${updatedChain.length})`,
      metadata: {
        cardId: args.cardId,
        cardName: card?.name,
        chainLinkNumber: updatedChain.length,
        spellSpeed: args.spellSpeed,
        effect: args.effect,
      },
    });

    // 10. Return chain state
    return {
      success: true,
      chainLinkNumber: updatedChain.length,
      currentChainLength: updatedChain.length,
    };
  },
});

/**
 * Resolve chain
 *
 * Resolves the current chain in reverse order (CL3 → CL2 → CL1).
 * Records: chain_resolving, chain_resolved, and effect results
 */
export const resolveChain = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // 1. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found");
    }

    // 2. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw new Error("Game state not found");
    }

    // 3. Get current chain
    const currentChain = gameState.currentChain || [];

    if (currentChain.length === 0) {
      throw new Error("No chain to resolve");
    }

    // 4. Record chain_resolving event
    await ctx.runMutation(api.gameEvents.recordEvent, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId!,
      turnNumber: lobby.turnNumber!,
      eventType: "chain_resolving",
      playerId: currentChain[0].playerId,
      playerUsername: "System",
      description: `Chain of ${currentChain.length} effect(s) is resolving`,
      metadata: {
        chainLength: currentChain.length,
        chainLinks: currentChain.map((link, idx) => ({
          chainLink: idx + 1,
          cardId: link.cardId,
          playerId: link.playerId,
        })),
      },
    });

    // 5. Resolve chain in reverse order (CL3 → CL2 → CL1)
    for (let i = currentChain.length - 1; i >= 0; i--) {
      const chainLink = currentChain[i];
      const card = await ctx.db.get(chainLink.cardId);

      // Execute effect (simplified for MVP)
      // Full implementation would parse card abilities and execute complex effects
      // For now, just record the resolution

      await ctx.runMutation(api.gameEvents.recordEvent, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId!,
        turnNumber: lobby.turnNumber!,
        eventType: "effect_activated",
        playerId: chainLink.playerId,
        playerUsername: "System",
        description: `Chain Link ${i + 1}: ${card?.name || "Unknown"} effect resolves`,
        metadata: {
          cardId: chainLink.cardId,
          cardName: card?.name,
          chainLink: i + 1,
          effect: chainLink.effect,
        },
      });
    }

    // 6. Clear chain
    await ctx.db.patch(gameState._id, {
      currentChain: [],
      currentPriorityPlayer: undefined,
    });

    // 7. Record chain_resolved event
    await ctx.runMutation(api.gameEvents.recordEvent, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId!,
      turnNumber: lobby.turnNumber!,
      eventType: "chain_resolved",
      playerId: currentChain[0].playerId,
      playerUsername: "System",
      description: `Chain fully resolved`,
      metadata: {
        chainLength: currentChain.length,
      },
    });

    // 8. Return success
    return {
      success: true,
      resolvedChainLinks: currentChain.length,
    };
  },
});

/**
 * Pass priority
 *
 * Player declines to respond to the current chain.
 * If both players pass, resolves the chain.
 */
export const passPriority = mutation({
  args: {
    token: v.string(),
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Invalid session token");
    }

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found");
    }

    // 3. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw new Error("Game state not found");
    }

    // 4. Check if there's a chain to respond to
    const currentChain = gameState.currentChain || [];

    if (currentChain.length === 0) {
      throw new Error("No chain to respond to");
    }

    // 5. Pass priority to opponent
    const opponentId = user.userId === gameState.hostId ? gameState.opponentId : gameState.hostId;

    // Simplified priority system:
    // If current priority player passes, give priority to opponent
    // If opponent also passes, resolve chain

    if (gameState.currentPriorityPlayer === user.userId) {
      // This player passed, give priority to opponent
      await ctx.db.patch(gameState._id, {
        currentPriorityPlayer: opponentId,
      });

      return {
        success: true,
        priorityPassedTo: "opponent",
      };
    } else {
      // Both players passed - resolve chain
      await ctx.runMutation(api.chainResolver.resolveChain, {
        lobbyId: args.lobbyId,
      });

      return {
        success: true,
        priorityPassedTo: "none",
        chainResolved: true,
      };
    }
  },
});

/**
 * Get current chain state
 *
 * Returns the current chain for display purposes.
 */
export const getCurrentChain = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return {
        chain: [],
        priorityPlayer: null,
      };
    }

    const currentChain = gameState.currentChain || [];

    // Enrich with card names
    const enrichedChain = await Promise.all(
      currentChain.map(async (link, idx) => {
        const card = await ctx.db.get(link.cardId);
        const player = await ctx.db.get(link.playerId);

        return {
          chainLink: idx + 1,
          cardId: link.cardId,
          cardName: card?.name || "Unknown",
          playerId: link.playerId,
          playerName: player?.username || "Unknown",
          spellSpeed: link.spellSpeed,
          effect: link.effect,
        };
      })
    );

    return {
      chain: enrichedChain,
      priorityPlayer: gameState.currentPriorityPlayer,
    };
  },
});
