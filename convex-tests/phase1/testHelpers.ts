/**
 * Test helper functions for Phase 1 tests
 * Provides schema-compliant test data generators
 */

import type { Id } from "../../_generated/dataModel";
import type { TestConvex } from "convex-test";
import { api } from "../../_generated/api";

export function createTestUser(overrides?: {
  username?: string;
  email?: string;
  privyId?: string;
}) {
  return {
    username: overrides?.username || "testuser",
    email: overrides?.email || "test@example.com",
    privyId: overrides?.privyId || "privy_testuser",
    createdAt: Date.now(),
  };
}

export function createTestCurrency(userId: Id<"users">, overrides?: {
  gold?: number;
  gems?: number;
}) {
  const gold = overrides?.gold ?? 1000;
  const gems = overrides?.gems ?? 0;

  return {
    userId,
    gold,
    gems,
    lifetimeGoldEarned: gold,
    lifetimeGoldSpent: 0,
    lifetimeGemsEarned: gems,
    lifetimeGemsSpent: 0,
    lastUpdatedAt: Date.now(),
  };
}

export function createTestCard(overrides?: {
  name?: string;
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";
  attack?: number;
  defense?: number;
  cost?: number;
}) {
  return {
    name: overrides?.name || "Test Card",
    rarity: overrides?.rarity || "common",
    archetype: "neutral" as const,
    cardType: "stereotype" as const,
    attack: overrides?.attack ?? 100,
    defense: overrides?.defense ?? 100,
    cost: overrides?.cost ?? 3,
    flavorText: "Test card for testing",
    imageUrl: "test.png",
    isActive: true,
    createdAt: Date.now(),
  };
}

export function createTestTournament(organizerId: Id<"users">, overrides?: {
  name?: string;
  maxPlayers?: number;
  registeredCount?: number;
}) {
  return {
    name: overrides?.name || "Test Tournament",
    description: "Test tournament",
    format: "single_elimination" as const,
    mode: "standard" as const,
    maxPlayers: overrides?.maxPlayers ?? 16,
    registeredCount: overrides?.registeredCount ?? 0,
    entryFee: 0,
    prizePool: 0,
    status: "registration" as const,
    startTime: Date.now() + 60 * 60 * 1000, // 1 hour from now
    registrationDeadline: Date.now() + 30 * 60 * 1000, // 30 min from now
    organizerId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createTestMarketplaceListing(
  sellerId: Id<"users">,
  cardDefinitionId: Id<"cardDefinitions">,
  overrides?: {
    listingType?: "fixed" | "auction";
    price?: number;
    currentBid?: number;
    startingBid?: number;
  }
) {
  const isAuction = overrides?.listingType === "auction";
  const price = overrides?.price ?? 100;

  return {
    sellerId,
    sellerUsername: "seller",
    listingType: overrides?.listingType || "fixed",
    cardDefinitionId,
    quantity: 1,
    price,
    bidCount: isAuction ? 1 : 0,
    ...(isAuction ? {
      currentBid: overrides?.currentBid ?? 100,
      endsAt: Date.now() + 24 * 60 * 60 * 1000,
    } : {}),
    status: "active" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Create a minimal valid deck (30 cards) for ownership testing
 * Creates filler cards to reach MIN_DECK_SIZE + allows custom test cards
 *
 * @param t - Test instance with components registered
 * @param userId - Owner of the deck
 * @param privyId - Privy ID for authentication
 * @param options - Customization options
 * @returns Deck ID and card arrays
 */
export async function createMinimalValidDeck(
  t: TestConvex<any>,
  userId: Id<"users">,
  privyId: string,
  options?: {
    deckName?: string;
    testCards?: Array<{ cardDefinitionId: Id<"cardDefinitions">; quantity: number }>;
  }
) {
  const fillerCards: Array<{ cardDefinitionId: Id<"cardDefinitions">; quantity: number }> = [];

  // Calculate filler count to reach exactly 30 cards total
  const testCardCount = (options?.testCards || []).reduce((sum, card) => sum + card.quantity, 0);
  const fillerCount = Math.max(0, 30 - testCardCount);

  for (let i = 0; i < fillerCount; i++) {
    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: `Filler Card ${i}`,
        rarity: "common",
        archetype: "neutral",
        cardType: "stereotype",
        cost: 2,
        attack: 50,
        defense: 50,
        flavorText: "Test filler card",
        imageUrl: "filler.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    // Give user 3 copies of each filler card
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: cardId,
        quantity: 3,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    });

    fillerCards.push({ cardDefinitionId: cardId, quantity: 1 });
  }

  // Create deck
  const { deckId } = await t
    .withIdentity({ subject: privyId })
    .mutation(api.core.decks.createDeck, {
      name: options?.deckName || "Test Deck",
    });

  // Save with 30+ cards (filler + test-specific)
  const allCards = [...fillerCards, ...(options?.testCards || [])];

  await t
    .withIdentity({ subject: privyId })
    .mutation(api.core.decks.saveDeck, {
      deckId,
      cards: allCards,
    });

  return { deckId, fillerCards, testCards: options?.testCards || [] };
}
