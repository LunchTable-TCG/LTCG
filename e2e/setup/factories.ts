import { ConvexHttpClient } from "convex/browser";
import { internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Test data factory for E2E tests
 *
 * Creates test data via Convex internal mutations and tracks resources for cleanup.
 * Uses ConvexHttpClient for server-side mutation calls.
 */
export class TestDataFactory {
  private client: ConvexHttpClient;
  private createdUsers: Id<"users">[] = [];

  constructor(convexUrl: string) {
    this.client = new ConvexHttpClient(convexUrl);
  }

  /**
   * Create a test user with optional overrides
   *
   * @param opts - User creation options
   * @param opts.displayName - User display name (auto-generated if not provided)
   * @param opts.gold - Initial gold amount (defaults to 1000)
   * @param opts.gems - Initial gems amount (optional)
   * @returns User data including userId, privyDid, and displayName
   */
  async createUser(
    opts: {
      displayName?: string;
      gold?: number;
      gems?: number;
    } = {}
  ) {
    const privyDid = `did:privy:test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const displayName = opts.displayName ?? `TestPlayer_${Date.now()}`;

    // Type assertion for internal function - safe in test context
    type SeedTestUserFn = (args: {
      privyDid: string;
      displayName: string;
      gold?: number;
      gems?: number;
    }) => Promise<Id<"users">>;

    const userId = await this.client.mutation(
      internal.testing.seedTestUser.seedTestUser as SeedTestUserFn,
      {
        privyDid,
        displayName,
        gold: opts.gold,
        gems: opts.gems,
      }
    );

    this.createdUsers.push(userId);
    return { userId, privyDid, displayName };
  }

  /**
   * Create a deck for a user
   *
   * @param userId - The user who owns the deck
   * @param cardIds - Array of card definition IDs to add to the deck
   * @returns The created deck ID
   */
  async createDeckForUser(userId: Id<"users">, cardIds: Id<"cardDefinitions">[]) {
    // Type assertion for internal function - safe in test context
    type SeedTestDeckFn = (args: {
      userId: Id<"users">;
      name: string;
      cardIds: Id<"cardDefinitions">[];
    }) => Promise<Id<"userDecks">>;

    return await this.client.mutation(internal.testing.seedTestDeck.seedTestDeck as SeedTestDeckFn, {
      userId,
      name: `Test Deck ${Date.now()}`,
      cardIds,
    });
  }

  /**
   * Cleanup all test data created by this factory
   *
   * Removes all created users and their associated data (decks, matches, etc.)
   * Handles cleanup errors gracefully to allow partial cleanup.
   */
  async cleanup() {
    // Type assertion for internal function - safe in test context
    type CleanupTestUserFn = (args: { userId: Id<"users"> }) => Promise<void>;

    for (const userId of this.createdUsers) {
      try {
        await this.client.mutation(
          internal.testing.cleanup.cleanupTestUser as CleanupTestUserFn,
          { userId }
        );
      } catch (e) {
        console.warn(`Failed to cleanup user ${userId}:`, e);
      }
    }
    this.createdUsers = [];
  }
}
