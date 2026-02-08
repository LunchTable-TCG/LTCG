/**
 * Test Story Battle - Debug mutation to test the entire story battle flow
 *
 * Run this from the Convex dashboard or CLI to verify story mode works end-to-end
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { initializeGameStateHelper } from "../gameplay/games/lifecycle";

/**
 * Check if a user is ready for story battle
 * Use this to debug why a specific user might be failing
 */
export const checkUserReadyForStory = query({
  args: {
    userId: v.optional(v.id("users")),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user: Awaited<ReturnType<typeof ctx.db.get<"users">>> | null = null;

    if (args.userId) {
      user = await ctx.db.get(args.userId);
    } else if (args.username) {
      user = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", args.username))
        .first();
    } else {
      // Get all non-AI users
      const users = await ctx.db.query("users").take(10);
      const nonAiUsers = users.filter(
        (u) => u.username !== "StoryModeAI" && !u.username?.startsWith("AI -")
      );
      return {
        availableUsers: nonAiUsers.map((u) => ({
          id: u._id,
          username: u.username,
          hasActiveDeck: !!u.activeDeckId,
        })),
      };
    }

    if (!user) {
      return { error: "User not found" };
    }

    const result: {
      userId: Id<"users">;
      username: string | undefined;
      hasActiveDeck: boolean;
      activeDeckId: Id<"userDecks"> | undefined;
      deckDetails?: {
        name: string;
        cardCount: number;
        uniqueCards: number;
      };
      issues: string[];
      ready: boolean;
    } = {
      userId: user._id,
      username: user.username,
      hasActiveDeck: !!user.activeDeckId,
      activeDeckId: user.activeDeckId,
      issues: [],
      ready: true,
    };

    if (!user.activeDeckId) {
      result.issues.push("No active deck set");
      result.ready = false;

      // Check if they have any decks
      const userDecks = await ctx.db
        .query("userDecks")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      if (userDecks.length === 0) {
        result.issues.push("User has no decks at all");
      } else {
        result.issues.push(`User has ${userDecks.length} deck(s) but none selected as active`);
      }
    } else {
      // Check deck details
      const deck = await ctx.db.get(user.activeDeckId);
      if (!deck) {
        result.issues.push("Active deck not found in database");
        result.ready = false;
      } else {
        const { activeDeckId } = user;
        const deckCards = await ctx.db
          .query("deckCards")
          .withIndex("by_deck", (q) => q.eq("deckId", activeDeckId))
          .collect();

        const totalCards = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);

        result.deckDetails = {
          name: deck.name,
          cardCount: totalCards,
          uniqueCards: deckCards.length,
        };

        if (totalCards < 5) {
          result.issues.push(`Deck has only ${totalCards} cards (need at least 5)`);
          result.ready = false;
        }
      }
    }

    return result;
  },
});

/**
 * Test story battle initialization with detailed step-by-step reporting
 *
 * This mutation tests the entire flow and returns exactly where it fails
 */
export const testStoryBattleFlow = mutation({
  args: {
    userId: v.optional(v.id("users")), // Optional: test with specific user
  },
  handler: async (ctx, args) => {
    const steps: { step: string; status: "pass" | "fail" | "skip"; detail?: string }[] = [];

    try {
      // Step 1: Get user (use provided or get first available)
      let userId = args.userId;
      if (!userId) {
        const users = await ctx.db.query("users").take(5);
        const nonAiUser = users.find(
          (u) => u.username !== "StoryModeAI" && !u.username?.startsWith("AI -")
        );
        if (!nonAiUser) {
          steps.push({
            step: "1. Find test user",
            status: "fail",
            detail: "No non-AI users found",
          });
          return { success: false, steps };
        }
        userId = nonAiUser._id;
        steps.push({
          step: "1. Find test user",
          status: "pass",
          detail: `Using user: ${nonAiUser.username} (${userId})`,
        });
      } else {
        const user = await ctx.db.get(userId);
        steps.push({
          step: "1. Find test user",
          status: user ? "pass" : "fail",
          detail: user ? `User: ${user.username}` : "User not found",
        });
        if (!user) return { success: false, steps };
      }

      // Step 2: Check user has active deck
      const user = await ctx.db.get(userId);
      if (!user) {
        steps.push({ step: "2. Check active deck", status: "fail", detail: "User not found" });
        return { success: false, steps };
      }

      if (!user.activeDeckId) {
        steps.push({
          step: "2. Check active deck",
          status: "fail",
          detail: "User has no active deck. Need to select a deck first.",
        });

        // Try to find a deck for this user
        const userDecksList = await ctx.db
          .query("userDecks")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

        if (userDecksList.length === 0) {
          steps.push({
            step: "2a. Find user decks",
            status: "fail",
            detail: "User has no decks at all. Need to create a deck first.",
          });
          return { success: false, steps, suggestion: "User needs to create a deck" };
        }

        steps.push({
          step: "2a. Find user decks",
          status: "pass",
          detail: `Found ${userDecksList.length} decks. Setting first deck as active...`,
        });

        // Set the first deck as active
        const firstDeck = userDecksList[0];
        if (firstDeck) {
          await ctx.db.patch(userId, { activeDeckId: firstDeck._id });
          steps.push({
            step: "2b. Set active deck",
            status: "pass",
            detail: `Set deck "${firstDeck.name}" as active`,
          });
        }
      } else {
        const deck = await ctx.db.get(user.activeDeckId);
        steps.push({
          step: "2. Check active deck",
          status: "pass",
          detail: `Active deck: ${deck?.name || user.activeDeckId}`,
        });
      }

      // Step 3: Check deck has cards
      const updatedUser = await ctx.db.get(userId);
      if (!updatedUser?.activeDeckId) {
        steps.push({ step: "3. Check deck cards", status: "fail", detail: "No active deck" });
        return { success: false, steps };
      }
      const activeDeckId = updatedUser.activeDeckId;

      const deckCards = await ctx.db
        .query("deckCards")
        .withIndex("by_deck", (q) => q.eq("deckId", activeDeckId))
        .collect();

      const totalCards = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);
      if (totalCards === 0) {
        steps.push({
          step: "3. Check deck cards",
          status: "fail",
          detail: "Deck has no cards. Need to add cards to deck.",
        });
        return { success: false, steps, suggestion: "Add cards to the deck" };
      }

      steps.push({
        step: "3. Check deck cards",
        status: "pass",
        detail: `Deck has ${totalCards} cards (${deckCards.length} unique)`,
      });

      // Step 4: Check chapter exists
      const chapter = await ctx.db
        .query("storyChapters")
        .withIndex("by_act_chapter", (q) => q.eq("actNumber", 1).eq("chapterNumber", 1))
        .first();

      if (!chapter) {
        steps.push({
          step: "4. Check chapter 1-1",
          status: "fail",
          detail: "Chapter 1-1 not found. Run seedStoryChapters first.",
        });
        return { success: false, steps, suggestion: "Run seedStoryChapters mutation" };
      }

      steps.push({
        step: "4. Check chapter 1-1",
        status: "pass",
        detail: `Chapter: "${chapter.title}" (archetype: ${chapter.archetype})`,
      });

      // Step 5: Check stage exists
      const stage = await ctx.db
        .query("storyStages")
        .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id).eq("stageNumber", 1))
        .first();

      if (!stage) {
        steps.push({
          step: "5. Check stage 1",
          status: "fail",
          detail: "Stage 1 not found for chapter. Seeds may be incomplete.",
        });
        return { success: false, steps };
      }

      steps.push({
        step: "5. Check stage 1",
        status: "pass",
        detail: `Stage: "${stage.name}" (difficulty: ${stage.aiDifficulty ?? stage.difficulty})`,
      });

      // Step 6: Check archetype cards exist
      const archetype = chapter.archetype ?? "neutral";
      const archetypeCards = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_archetype", (q) =>
          q.eq(
            "archetype",
            archetype as
              | "fire"
              | "water"
              | "earth"
              | "wind"
              | "neutral"
              | "infernal_dragons"
              | "abyssal_horrors"
              | "nature_spirits"
              | "storm_elementals"
          )
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      if (archetypeCards.length === 0) {
        steps.push({
          step: "6. Check archetype cards",
          status: "fail",
          detail: `No active cards found for archetype "${archetype}"`,
        });
        return { success: false, steps, suggestion: "Seed card definitions for this archetype" };
      }

      const creatures = archetypeCards.filter((c) => c.cardType === "creature").length;
      const spells = archetypeCards.filter((c) => c.cardType === "spell").length;
      const traps = archetypeCards.filter((c) => c.cardType === "trap").length;

      steps.push({
        step: "6. Check archetype cards",
        status: "pass",
        detail: `${archetypeCards.length} cards (${creatures} creatures, ${spells} spells, ${traps} traps)`,
      });

      // Step 7: Get or create AI user
      let aiUser = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", "StoryModeAI"))
        .first();

      if (!aiUser) {
        const aiUserId = await ctx.db.insert("users", {
          username: "StoryModeAI",
          email: "ai@storymode.local",
          isAnonymous: false,
          createdAt: Date.now(),
        });
        aiUser = await ctx.db.get(aiUserId);
        steps.push({
          step: "7. Get/create AI user",
          status: "pass",
          detail: `Created AI user: ${aiUserId}`,
        });
      } else {
        steps.push({
          step: "7. Get/create AI user",
          status: "pass",
          detail: `AI user exists: ${aiUser._id}`,
        });
      }

      // Step 8: Build AI deck
      const aiDeck: Id<"cardDefinitions">[] = [];
      const deckSize = 45;

      // Fill deck with archetype cards
      for (let i = 0; i < deckSize; i++) {
        const card = archetypeCards[i % archetypeCards.length];
        if (card) {
          aiDeck.push(card._id);
        }
      }

      if (aiDeck.length < deckSize) {
        steps.push({
          step: "8. Build AI deck",
          status: "fail",
          detail: `Could only build ${aiDeck.length} cards (need ${deckSize})`,
        });
        return { success: false, steps };
      }

      steps.push({
        step: "8. Build AI deck",
        status: "pass",
        detail: `Built ${aiDeck.length} card AI deck`,
      });

      // Step 9: Create game lobby
      const gameId = `test_story_${userId}_${Date.now()}`;
      const now = Date.now();

      const lobbyId = await ctx.db.insert("gameLobbies", {
        gameId,
        hostId: userId,
        hostUsername: updatedUser.username || "TestPlayer",
        hostRank: "Unranked",
        hostRating: 1000,
        deckArchetype: "mixed",
        opponentId: aiUser?._id,
        opponentUsername: `AI - ${chapter.title}`,
        mode: "story",
        status: "active",
        isPrivate: true,
        joinCode: `test-${gameId}`,
        lastMoveAt: now,
        createdAt: now,
        startedAt: now,
        allowSpectators: false,
        spectatorCount: 0,
        maxSpectators: 0,
        stageId: stage._id,
      });

      steps.push({
        step: "9. Create game lobby",
        status: "pass",
        detail: `Lobby created: ${lobbyId}`,
      });

      // Step 10: Load player deck cards
      const activeDeckIdForPlayer = updatedUser.activeDeckId;
      if (!activeDeckIdForPlayer) {
        steps.push({
          step: "10. Load player deck",
          status: "fail",
          detail: "No active deck selected after lobby creation",
        });
        await ctx.db.delete(lobbyId);
        return { success: false, steps, suggestion: "Select an active deck and retry" };
      }
      const playerDeckCards = await ctx.db
        .query("deckCards")
        .withIndex("by_deck", (q) => q.eq("deckId", activeDeckIdForPlayer))
        .collect();

      const playerFullDeck: Id<"cardDefinitions">[] = [];
      for (const dc of playerDeckCards) {
        for (let i = 0; i < dc.quantity; i++) {
          playerFullDeck.push(dc.cardDefinitionId);
        }
      }

      if (playerFullDeck.length < 5) {
        steps.push({
          step: "10. Load player deck",
          status: "fail",
          detail: `Player deck only has ${playerFullDeck.length} cards (need at least 5 for initial hand)`,
        });

        // Clean up the lobby
        await ctx.db.delete(lobbyId);
        return { success: false, steps, suggestion: "Add more cards to player deck" };
      }

      steps.push({
        step: "10. Load player deck",
        status: "pass",
        detail: `Player deck has ${playerFullDeck.length} cards`,
      });

      // Step 11: Create game state
      // Simple shuffle for testing
      const shuffleArray = <T>(arr: T[]): T[] => {
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = result[i];
          const swapVal = result[j];
          if (temp !== undefined && swapVal !== undefined) {
            result[i] = swapVal;
            result[j] = temp;
          }
        }
        return result;
      };

      const shuffledPlayerDeck = shuffleArray(playerFullDeck);
      const shuffledAiDeck = shuffleArray(aiDeck);

      const hostHand = shuffledPlayerDeck.slice(0, 5);
      const opponentHand = shuffledAiDeck.slice(0, 5);
      const hostDeck = shuffledPlayerDeck.slice(5);
      const opponentDeck = shuffledAiDeck.slice(5);

      if (!aiUser) {
        steps.push({ step: "11. Create game state", status: "fail", detail: "AI user not found" });
        await ctx.db.delete(lobbyId);
        return { success: false, steps, suggestion: "AI user creation failed" };
      }

      try {
        await ctx.db.insert("gameStates", {
          lobbyId,
          gameId,
          hostId: userId,
          opponentId: aiUser._id,
          hostHand,
          opponentHand,
          hostBoard: [],
          opponentBoard: [],
          hostSpellTrapZone: [],
          opponentSpellTrapZone: [],
          hostFieldSpell: undefined,
          opponentFieldSpell: undefined,
          hostDeck,
          opponentDeck,
          hostGraveyard: [],
          opponentGraveyard: [],
          hostBanished: [],
          opponentBanished: [],
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostMana: 0,
          opponentMana: 0,
          currentTurnPlayerId: userId,
          turnNumber: 1,
          currentPhase: "main1",
          hostNormalSummonedThisTurn: false,
          opponentNormalSummonedThisTurn: false,
          currentChain: [],
          currentPriorityPlayer: userId,
          temporaryModifiers: [],
          optUsedThisTurn: [],
          gameMode: "story",
          isAIOpponent: true,
          aiDifficulty: (stage.aiDifficulty ?? stage.difficulty) as
            | "easy"
            | "medium"
            | "hard"
            | "boss"
            | undefined,
          lastMoveAt: now,
          createdAt: now,
        });

        steps.push({
          step: "11. Create game state",
          status: "pass",
          detail: "Game state created successfully!",
        });
      } catch (error) {
        steps.push({
          step: "11. Create game state",
          status: "fail",
          detail: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        });

        // Clean up
        await ctx.db.delete(lobbyId);
        return { success: false, steps };
      }

      // Success!
      return {
        success: true,
        steps,
        result: {
          gameId,
          lobbyId,
          chapterTitle: chapter.title,
          stageName: stage.name,
          playerDeckSize: playerFullDeck.length,
          aiDeckSize: aiDeck.length,
        },
      };
    } catch (error) {
      steps.push({
        step: "Unexpected error",
        status: "fail",
        detail: error instanceof Error ? error.message : String(error),
      });
      return { success: false, steps };
    }
  },
});

/**
 * Test using the ACTUAL initializeGameStateHelper to identify if that's failing
 */
export const testWithActualHelper = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const steps: { step: string; status: "pass" | "fail"; detail?: string }[] = [];

    try {
      // Get user
      const user = await ctx.db.get(args.userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }
      steps.push({ step: "1. Get user", status: "pass", detail: user.username ?? "Unknown" });

      // Check active deck
      if (!user.activeDeckId) {
        return { success: false, error: "No active deck", steps };
      }
      steps.push({
        step: "2. Check active deck",
        status: "pass",
        detail: String(user.activeDeckId),
      });

      // Get chapter
      const chapter = await ctx.db
        .query("storyChapters")
        .withIndex("by_act_chapter", (q) => q.eq("actNumber", 1).eq("chapterNumber", 1))
        .first();

      if (!chapter) {
        return { success: false, error: "Chapter not found", steps };
      }
      steps.push({ step: "3. Get chapter", status: "pass", detail: chapter.title });

      // Get stage
      const stage = await ctx.db
        .query("storyStages")
        .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id).eq("stageNumber", 1))
        .first();

      if (!stage) {
        return { success: false, error: "Stage not found", steps };
      }
      steps.push({ step: "4. Get stage", status: "pass", detail: stage.name ?? "Stage 1" });

      // Build AI deck
      const archetype = (chapter.archetype ?? "neutral") as
        | "fire"
        | "water"
        | "earth"
        | "wind"
        | "neutral"
        | "infernal_dragons"
        | "abyssal_horrors"
        | "nature_spirits"
        | "storm_elementals";

      const archetypeCards = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_archetype", (q) => q.eq("archetype", archetype))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      if (archetypeCards.length === 0) {
        return { success: false, error: `No cards for archetype ${archetype}`, steps };
      }

      const aiDeck: Id<"cardDefinitions">[] = [];
      for (let i = 0; i < 45; i++) {
        const card = archetypeCards[i % archetypeCards.length];
        if (card) aiDeck.push(card._id);
      }
      steps.push({ step: "5. Build AI deck", status: "pass", detail: `${aiDeck.length} cards` });

      // Get or create AI user
      let aiUser = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", "StoryModeAI"))
        .first();

      if (!aiUser) {
        const aiUserId = await ctx.db.insert("users", {
          username: "StoryModeAI",
          email: "ai@storymode.local",
          isAnonymous: false,
          createdAt: Date.now(),
        });
        aiUser = await ctx.db.get(aiUserId);
      }

      if (!aiUser) {
        return { success: false, error: "Could not create AI user", steps };
      }
      steps.push({ step: "6. Get AI user", status: "pass", detail: String(aiUser._id) });

      // Create lobby
      const gameId = `test_helper_${args.userId}_${Date.now()}`;
      const now = Date.now();

      const lobbyId = await ctx.db.insert("gameLobbies", {
        gameId,
        hostId: args.userId,
        hostUsername: user.username ?? "TestPlayer",
        hostRank: "Unranked",
        hostRating: 1000,
        deckArchetype: "mixed",
        opponentId: aiUser._id,
        opponentUsername: `AI - ${chapter.title}`,
        mode: "story",
        status: "active",
        isPrivate: true,
        joinCode: `test-${gameId}`,
        lastMoveAt: now,
        createdAt: now,
        startedAt: now,
        allowSpectators: false,
        spectatorCount: 0,
        maxSpectators: 0,
        stageId: stage._id,
      });
      steps.push({ step: "7. Create lobby", status: "pass", detail: String(lobbyId) });

      // Call the ACTUAL initializeGameStateHelper
      console.log("[TestHelper] Calling initializeGameStateHelper...");
      try {
        await initializeGameStateHelper(ctx, {
          lobbyId,
          gameId,
          hostId: args.userId,
          opponentId: aiUser._id,
          currentTurnPlayerId: args.userId,
          gameMode: "story",
          isAIOpponent: true,
          aiDifficulty: (stage.aiDifficulty ?? stage.difficulty) as
            | "easy"
            | "normal"
            | "medium"
            | "hard"
            | "boss"
            | undefined,
          aiDeck,
        });
        console.log("[TestHelper] initializeGameStateHelper succeeded!");
        steps.push({
          step: "8. initializeGameStateHelper",
          status: "pass",
          detail: "Success!",
        });
      } catch (helperError) {
        console.error("[TestHelper] initializeGameStateHelper FAILED:", helperError);
        steps.push({
          step: "8. initializeGameStateHelper",
          status: "fail",
          detail: helperError instanceof Error ? helperError.message : String(helperError),
        });
        // Clean up
        await ctx.db.delete(lobbyId);
        return {
          success: false,
          steps,
          error: helperError instanceof Error ? helperError.message : "Helper failed",
        };
      }

      return {
        success: true,
        steps,
        result: { gameId, lobbyId },
      };
    } catch (error) {
      console.error("[TestHelper] Unexpected error:", error);
      return {
        success: false,
        steps,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Clean up test game lobbies and states
 */
export const cleanupTestGames = mutation({
  args: {},
  handler: async (ctx) => {
    // Find all test game lobbies
    const testLobbies = await ctx.db
      .query("gameLobbies")
      .filter((q) => q.eq(q.field("mode"), "story"))
      .collect();

    let deletedLobbies = 0;
    let deletedStates = 0;

    for (const lobby of testLobbies) {
      // Delete associated game state
      const gameState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
        .first();

      if (gameState) {
        await ctx.db.delete(gameState._id);
        deletedStates++;
      }

      await ctx.db.delete(lobby._id);
      deletedLobbies++;
    }

    return {
      success: true,
      deletedLobbies,
      deletedStates,
    };
  },
});

/**
 * Debug query to check game state by lobby ID
 * Use this to verify a game was created correctly
 */
export const checkGameState = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // Get the lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      return { error: "Lobby not found" };
    }

    // Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return {
        lobby: {
          id: lobby._id,
          gameId: lobby.gameId,
          status: lobby.status,
          mode: lobby.mode,
        },
        error: "Game state not found",
      };
    }

    // Get host and opponent names
    const host = await ctx.db.get(gameState.hostId);
    const opponent = await ctx.db.get(gameState.opponentId);

    return {
      lobby: {
        id: lobby._id,
        gameId: lobby.gameId,
        status: lobby.status,
        mode: lobby.mode,
      },
      gameState: {
        id: gameState._id,
        turnNumber: gameState.turnNumber,
        currentPhase: gameState.currentPhase,
        hostName: host?.username ?? "Unknown",
        opponentName: opponent?.username ?? "Unknown",
        hostLifePoints: gameState.hostLifePoints,
        opponentLifePoints: gameState.opponentLifePoints,
        hostHandSize: gameState.hostHand.length,
        opponentHandSize: gameState.opponentHand.length,
        hostDeckSize: gameState.hostDeck.length,
        opponentDeckSize: gameState.opponentDeck.length,
        hostBoardCount: gameState.hostBoard.length,
        opponentBoardCount: gameState.opponentBoard.length,
        isAIOpponent: gameState.isAIOpponent,
        aiDifficulty: gameState.aiDifficulty,
        gameMode: gameState.gameMode,
      },
      ready: true,
    };
  },
});
