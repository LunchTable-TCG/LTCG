import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a short random hex string for card instance IDs. */
function randomHex(length: number) {
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** Fisher-Yates in-place shuffle. */
function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Validators (reusable pieces)
// ---------------------------------------------------------------------------

const playerInput = v.object({
  id: v.string(),
  deckId: v.string(),
});

const configInput = v.object({
  startingLP: v.number(),
  maxHandSize: v.number(),
  phases: v.array(v.string()),
  drawPerTurn: v.number(),
  maxFieldSlots: v.optional(v.number()),
  maxBackrowSlots: v.optional(v.number()),
  turnTimeLimit: v.optional(v.number()),
  metadata: v.optional(v.any()),
});

// ---------------------------------------------------------------------------
// Game Lifecycle
// ---------------------------------------------------------------------------

/** Create a new game from player deck selections and a configuration object. */
export const create = mutation({
  args: {
    players: v.array(playerInput),
    config: configInput,
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.players.length < 2) {
      throw new Error("A game requires at least 2 players");
    }

    const playerStates = [];

    for (const player of args.players) {
      // Load the deck document
      const deckDoc = await ctx.db
        .query("decks")
        .filter((q) => q.eq(q.field("ownerId"), player.id))
        .filter((q) => q.eq(q.field("_id"), player.deckId as any))
        .first();

      if (!deckDoc) {
        // Fallback: try direct get in case deckId is a valid document ID
        const deckById = await ctx.db.get(player.deckId as any);
        if (!deckById || !('cards' in deckById)) {
          throw new Error(
            `Deck not found for player ${player.id}: ${player.deckId}`
          );
        }
        // Use deckById - TypeScript now knows it has 'cards' property
        const cardInstances = deckById.cards.map((cardId: string) => ({
          instanceId: `${cardId}_${randomHex(8)}`,
          cardId,
          isFaceDown: false,
        }));
        shuffle(cardInstances);

        playerStates.push({
          id: player.id,
          deckId: player.deckId,
          lifePoints: args.config.startingLP,
          hand: [] as any[],
          field: [] as any[],
          backrow: [] as any[],
          graveyard: [] as any[],
          deck: cardInstances as any[],
          normalSummonUsed: false,
        });
        continue;
      }

      // Create card instances from the deck's card list
      const cardInstances = deckDoc.cards.map((cardId: string) => ({
        instanceId: `${cardId}_${randomHex(8)}`,
        cardId,
        isFaceDown: false,
      }));
      shuffle(cardInstances);

      playerStates.push({
        id: player.id,
        deckId: player.deckId,
        lifePoints: args.config.startingLP,
        hand: [] as any[],
        field: [] as any[],
        backrow: [] as any[],
        graveyard: [] as any[],
        deck: cardInstances as any[],
        normalSummonUsed: false,
      });
    }

    const gameId = await ctx.db.insert("gameStates", {
      players: playerStates,
      currentPhase: args.config.phases[0]!,
      currentPlayerIndex: 0,
      turnNumber: 1,
      status: "active",
      config: args.config,
      metadata: args.metadata,
    });

    // Log creation event
    await ctx.db.insert("gameEvents", {
      gameId,
      type: "game_created",
      data: {
        playerIds: args.players.map((p) => p.id),
        config: args.config,
      },
      timestamp: Date.now(),
    });

    return gameId as string;
  },
});

/** Get the full game state by ID. */
export const getState = query({
  args: { gameId: v.id("gameStates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error(`Game not found: ${args.gameId}`);
    }
    return game;
  },
});

/** Get game state with opponent information hidden for a specific player. */
export const getStateForPlayer = query({
  args: {
    gameId: v.id("gameStates"),
    playerId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error(`Game not found: ${args.gameId}`);
    }

    const playerIndex = game.players.findIndex(
      (p: any) => p.id === args.playerId
    );
    if (playerIndex === -1) {
      throw new Error(`Player ${args.playerId} not found in game`);
    }

    // Build a view where opponent hands are hidden and opponent decks show only count
    const maskedPlayers = game.players.map((p: any, idx: number) => {
      if (idx === playerIndex) {
        // This is the requesting player — show full state
        return p;
      }
      // Opponent — hide hand contents and deck contents
      return {
        ...p,
        hand: (p.hand as any[]).map(() => ({ hidden: true })),
        deck: { count: (p.deck as any[]).length },
      };
    });

    return {
      ...game,
      players: maskedPlayers,
    };
  },
});

// ---------------------------------------------------------------------------
// Phase Management
// ---------------------------------------------------------------------------

/** Advance to the next phase (or the next player's turn if at end of phases). */
export const advancePhase = mutation({
  args: {
    gameId: v.id("gameStates"),
    playerId: v.string(),
  },
  returns: v.object({
    newPhase: v.string(),
    turnEnded: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error(`Game not found: ${args.gameId}`);
    if (game.status !== "active") throw new Error("Game is not active");

    // Verify it's this player's turn
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== args.playerId) {
      throw new Error("It is not your turn");
    }

    const phases = game.config.phases;
    const currentPhaseIdx = phases.indexOf(game.currentPhase);
    if (currentPhaseIdx === -1) {
      throw new Error(`Current phase "${game.currentPhase}" not found in config`);
    }

    let newPhase: string;
    let turnEnded = false;
    let newPlayerIndex = game.currentPlayerIndex;
    let newTurnNumber = game.turnNumber;

    if (currentPhaseIdx < phases.length - 1) {
      // Move to next phase in the same turn
      newPhase = phases[currentPhaseIdx + 1]!;
    } else {
      // Last phase — wrap to next player's turn
      turnEnded = true;
      newPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      newTurnNumber = game.turnNumber + 1;
      newPhase = phases[0]!;

      // Reset normalSummonUsed for the new active player
      const updatedPlayers = game.players.map((p: any, idx: number) => {
        if (idx === newPlayerIndex) {
          return { ...p, normalSummonUsed: false };
        }
        return p;
      });

      await ctx.db.patch(args.gameId, {
        currentPhase: newPhase,
        currentPlayerIndex: newPlayerIndex,
        turnNumber: newTurnNumber,
        players: updatedPlayers,
      });

      await ctx.db.insert("gameEvents", {
        gameId: args.gameId,
        type: "turn_ended",
        playerId: args.playerId,
        data: {
          previousPhase: game.currentPhase,
          newPhase,
          newTurnNumber,
          newPlayerIndex,
        },
        timestamp: Date.now(),
      });

      return { newPhase, turnEnded };
    }

    // Normal phase advance within the same turn
    await ctx.db.patch(args.gameId, {
      currentPhase: newPhase,
    });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "phase_changed",
      playerId: args.playerId,
      data: {
        previousPhase: game.currentPhase,
        newPhase,
      },
      timestamp: Date.now(),
    });

    return { newPhase, turnEnded };
  },
});

// ---------------------------------------------------------------------------
// Card Operations
// ---------------------------------------------------------------------------

/** Draw N cards from the top of a player's deck into their hand. */
export const drawCards = mutation({
  args: {
    gameId: v.id("gameStates"),
    playerId: v.string(),
    count: v.number(),
  },
  returns: v.object({
    drawn: v.number(),
    deckEmpty: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error(`Game not found: ${args.gameId}`);
    if (game.status !== "active") throw new Error("Game is not active");

    const playerIndex = game.players.findIndex(
      (p: any) => p.id === args.playerId
    );
    if (playerIndex === -1) {
      throw new Error(`Player ${args.playerId} not found in game`);
    }

    const player = game.players[playerIndex]!;
    const deck = [...(player.deck as any[])];
    const hand = [...(player.hand as any[])];

    const toDraw = Math.min(args.count, deck.length);
    const drawnCards = deck.splice(0, toDraw);
    hand.push(...drawnCards);

    // Update the player in the players array
    const updatedPlayers = game.players.map((p: any, idx: number) => {
      if (idx === playerIndex) {
        return { ...p, hand, deck };
      }
      return p;
    });

    await ctx.db.patch(args.gameId, { players: updatedPlayers });

    // Log individual draw events
    for (const card of drawnCards) {
      await ctx.db.insert("gameEvents", {
        gameId: args.gameId,
        type: "card_drawn",
        playerId: args.playerId,
        data: { instanceId: card.instanceId, cardId: card.cardId },
        timestamp: Date.now(),
      });
    }

    return { drawn: toDraw, deckEmpty: deck.length === 0 };
  },
});

/** Modify a player's life points (negative delta for damage). */
export const modifyLP = mutation({
  args: {
    gameId: v.id("gameStates"),
    playerId: v.string(),
    delta: v.number(),
  },
  returns: v.object({
    newLP: v.number(),
    defeated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error(`Game not found: ${args.gameId}`);
    if (game.status !== "active") throw new Error("Game is not active");

    const playerIndex = game.players.findIndex(
      (p: any) => p.id === args.playerId
    );
    if (playerIndex === -1) {
      throw new Error(`Player ${args.playerId} not found in game`);
    }

    const player = game.players[playerIndex]!;
    const newLP = Math.max(0, player.lifePoints + args.delta);
    const defeated = newLP === 0;

    const updatedPlayers = game.players.map((p: any, idx: number) => {
      if (idx === playerIndex) {
        return { ...p, lifePoints: newLP };
      }
      return p;
    });

    const patch: Record<string, any> = { players: updatedPlayers };

    // If defeated, find the winner (the other player)
    if (defeated) {
      const winnerId = game.players.find(
        (p: any) => p.id !== args.playerId
      )?.id;
      patch.status = "finished";
      if (winnerId) patch.winner = winnerId;
    }

    await ctx.db.patch(args.gameId, patch);

    // Log the event
    const eventType = args.delta < 0 ? "damage_dealt" : "lp_gained";
    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: eventType,
      playerId: args.playerId,
      data: {
        delta: args.delta,
        previousLP: player.lifePoints,
        newLP,
        defeated,
      },
      timestamp: Date.now(),
    });

    return { newLP, defeated };
  },
});

/** Move a card between zones for a player. */
export const moveCard = mutation({
  args: {
    gameId: v.id("gameStates"),
    playerId: v.string(),
    instanceId: v.string(),
    from: v.string(),
    to: v.string(),
    position: v.optional(v.number()),
    isFaceDown: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error(`Game not found: ${args.gameId}`);
    if (game.status !== "active") throw new Error("Game is not active");

    const playerIndex = game.players.findIndex(
      (p: any) => p.id === args.playerId
    );
    if (playerIndex === -1) {
      throw new Error(`Player ${args.playerId} not found in game`);
    }

    const player = { ...game.players[playerIndex]! } as Record<string, any>;

    // Validate zone names
    const validZones = ["hand", "field", "backrow", "graveyard", "deck"];
    if (!validZones.includes(args.from)) {
      throw new Error(`Invalid source zone: ${args.from}`);
    }
    if (!validZones.includes(args.to)) {
      throw new Error(`Invalid destination zone: ${args.to}`);
    }

    const fromZone = [...(player[args.from] as any[])];
    const toZone = [...(player[args.to] as any[])];

    // Find the card in the source zone
    const cardIndex = fromZone.findIndex(
      (c: any) => c.instanceId === args.instanceId
    );
    if (cardIndex === -1) {
      throw new Error(
        `Card ${args.instanceId} not found in ${args.from} zone`
      );
    }

    // Remove from source
    const [card] = fromZone.splice(cardIndex, 1);
    const movedCard = { ...card };

    // Apply optional updates
    if (args.isFaceDown !== undefined) {
      movedCard.isFaceDown = args.isFaceDown;
    }
    if (args.position !== undefined) {
      movedCard.position = args.position;
    }

    // Add to destination
    toZone.push(movedCard);

    // Rebuild player state
    player[args.from] = fromZone;
    player[args.to] = toZone;

    const updatedPlayers = game.players.map((p: any, idx: number) => {
      if (idx === playerIndex) {
        return player;
      }
      return p;
    });

    await ctx.db.patch(args.gameId, { players: updatedPlayers });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "card_moved",
      playerId: args.playerId,
      data: {
        instanceId: args.instanceId,
        from: args.from,
        to: args.to,
        position: args.position,
        isFaceDown: args.isFaceDown,
      },
      timestamp: Date.now(),
    });

    return null;
  },
});

/** Manually end the game with an optional winner and reason. */
export const endGame = mutation({
  args: {
    gameId: v.id("gameStates"),
    winnerId: v.optional(v.string()),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error(`Game not found: ${args.gameId}`);

    const patch: Record<string, any> = {
      status: "finished",
    };
    if (args.winnerId !== undefined) {
      patch.winner = args.winnerId;
    }

    await ctx.db.patch(args.gameId, patch);

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "game_ended",
      data: {
        winnerId: args.winnerId,
        reason: args.reason,
      },
      timestamp: Date.now(),
    });

    return null;
  },
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Insert a custom game event. */
export const logEvent = mutation({
  args: {
    gameId: v.id("gameStates"),
    type: v.string(),
    playerId: v.optional(v.string()),
    data: v.any(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: args.type,
      playerId: args.playerId,
      data: args.data,
      timestamp: Date.now(),
    });
    return id as string;
  },
});

/** Get all events for a game, ordered by timestamp via the by_game index. */
export const getEvents = query({
  args: { gameId: v.id("gameStates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("gameEvents")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    return events;
  },
});
