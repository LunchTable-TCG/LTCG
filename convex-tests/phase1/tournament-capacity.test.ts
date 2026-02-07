/**
 * Phase 1 Test: Tournament Capacity Overflow
 *
 * Tests that tournaments enforce maxPlayers capacity through
 * atomic counter increment with rollback on overflow.
 */

import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 1: Tournament Capacity Overflow", () => {
  it("should prevent exceeding maxPlayers capacity", async () => {
    const t = await createTestWithComponents();

    // Setup: Create tournament organizer
    const organizerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "organizer",
        email: "organizer@test.com",
        privyId: "privy_organizer",
        createdAt: Date.now(),
      });
    });

    // Create 16-player tournament with 15 already registered
    const tournamentId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournaments", {
        name: "Capacity Test Tournament",
        description: "Testing capacity limits",
        format: "single_elimination",
        mode: "casual",
        maxPlayers: 16,
        registeredCount: 15,
        checkedInCount: 0, // 15/16 slots filled
        entryFee: 0,
        prizePool: { first: 0, second: 0, thirdFourth: 0 },
        status: "registration",
        createdBy: organizerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        currentRound: 0,
        registrationStartsAt: Date.now(),
        scheduledStartAt: Date.now() + 60 * 60 * 1000,
        registrationEndsAt: Date.now() + 30 * 60 * 1000,
        checkInStartsAt: Date.now() + 30 * 60 * 1000,
        checkInEndsAt: Date.now() + 60 * 60 * 1000,
      });
    });

    // Create 15 existing participants
    for (let i = 0; i < 15; i++) {
      const participantId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: `player${i}`,
          email: `player${i}@test.com`,
          privyId: `privy_player${i}`,
          createdAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("tournamentParticipants", {
          tournamentId,
          userId: participantId,
          username: `player${i}`,
          registeredAt: Date.now(),
          seedRating: 1000,
          status: "registered",
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("playerCurrency", {
        userId: participantId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
      });
    }

    // Create 5 users trying to join the last slot
    const latecomers = [];
    for (let i = 0; i < 5; i++) {
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: `latecomer${i}`,
          email: `latecomer${i}@test.com`,
          privyId: `privy_latecomer${i}`,
          createdAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
      });

      // Create a minimal deck so they can register
      const deckId = await t.run(async (ctx) => {
        return await ctx.db.insert("userDecks", {
          userId,
          name: `Test Deck ${i}`,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Set as active deck
      await t.run(async (ctx) => {
        await ctx.db.patch(userId, { activeDeckId: deckId });
      });

      latecomers.push({ userId, privyId: `privy_latecomer${i}` });
    }

    // Execute: All 5 try to join simultaneously
    const results = await Promise.allSettled(
      latecomers.map((latecomer) =>
        t
          .withIdentity({ subject: latecomer.privyId })
          .mutation(api.social.tournaments.registerForTournament, {
            tournamentId,
          })
      )
    );

    // Verify: Only 1 succeeded (filling to 16/16)
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(4);

    // Verify: Tournament shows exactly 16 registered
    const tournament = await t.run(async (ctx) => await ctx.db.get(tournamentId));
    expect(tournament?.registeredCount).toBe(16);

    // Verify: Exactly 16 participant records exist
    const participants = await t.run(async (ctx) => {
      return await ctx.db
        .query("tournamentParticipants")
        .filter((q) => q.eq(q.field("tournamentId"), tournamentId))
        .collect();
    });
    expect(participants.length).toBe(16);

    // Verify: Failed attempts have proper error messages
    const rejections = failed.map((r) => (r as PromiseRejectedResult).reason);
    for (const rejection of rejections) {
      expect(rejection.toString()).toMatch(/TOURNAMENT_FULL|filled up|full/i);
    }
  });

  it("should handle atomic increment with rollback correctly", async () => {
    const t = await createTestWithComponents();

    // Setup: Create 4-player tournament with 3 registered
    const organizerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "organizer",
        email: "organizer@test.com",
        privyId: "privy_organizer",
        createdAt: Date.now(),
      });
    });

    const tournamentId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournaments", {
        name: "Small Tournament",
        description: "4-player test",
        format: "single_elimination",
        mode: "casual",
        maxPlayers: 4,
        registeredCount: 3,
        checkedInCount: 0,
        entryFee: 0,
        prizePool: { first: 0, second: 0, thirdFourth: 0 },
        status: "registration",
        createdBy: organizerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        currentRound: 0,
        registrationStartsAt: Date.now(),
        scheduledStartAt: Date.now() + 60 * 60 * 1000,
        registrationEndsAt: Date.now() + 30 * 60 * 1000,
        checkInStartsAt: Date.now() + 30 * 60 * 1000,
        checkInEndsAt: Date.now() + 60 * 60 * 1000,
      });
    });

    // Create 3 existing participants
    for (let i = 0; i < 3; i++) {
      const participantId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: `player${i}`,
          email: `player${i}@test.com`,
          privyId: `privy_player${i}`,
          createdAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("tournamentParticipants", {
          tournamentId,
          userId: participantId,
          username: `player${i}`,
          registeredAt: Date.now(),
          seedRating: 1000,
          status: "registered",
        });
        await ctx.db.insert("playerCurrency", {
        userId: participantId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
      });
    }

    // Create 2 users trying to join
    const user1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "joiner1",
        email: "joiner1@test.com",
        privyId: "privy_joiner1",
        createdAt: Date.now(),
      });
    });

    const user2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "joiner2",
        email: "joiner2@test.com",
        privyId: "privy_joiner2",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId: user1Id,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
      await ctx.db.insert("playerCurrency", {
        userId: user2Id,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create decks for joiners
    const deck1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId: user1Id,
        name: "Test Deck 1",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const deck2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId: user2Id,
        name: "Test Deck 2",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(user1Id, { activeDeckId: deck1Id });
      await ctx.db.patch(user2Id, { activeDeckId: deck2Id });
    });

    // Execute: Both try to join the last slot
    const [result1, result2] = await Promise.allSettled([
      t
        .withIdentity({ subject: "privy_joiner1" })
        .mutation(api.social.tournaments.registerForTournament, {
          tournamentId,
        }),
      t
        .withIdentity({ subject: "privy_joiner2" })
        .mutation(api.social.tournaments.registerForTournament, {
          tournamentId,
        }),
    ]);

    // Verify: Exactly one succeeded
    const successes = [result1, result2].filter((r) => r.status === "fulfilled");
    expect(successes.length).toBe(1);

    // Verify: registeredCount is exactly 4 (not 5 due to rollback)
    const tournament = await t.run(async (ctx) => await ctx.db.get(tournamentId));
    expect(tournament?.registeredCount).toBe(4);

    // Verify: Participant records match registeredCount
    const participants = await t.run(async (ctx) => {
      return await ctx.db
        .query("tournamentParticipants")
        .filter((q) => q.eq(q.field("tournamentId"), tournamentId))
        .collect();
    });
    expect(participants.length).toBe(4);

    // Verify: No orphaned participant record from failed registration
    const user1Participant = participants.find((p) => p.userId === user1Id);
    const user2Participant = participants.find((p) => p.userId === user2Id);

    // Exactly one should have a participant record
    const participantCount = [user1Participant, user2Participant].filter(Boolean).length;
    expect(participantCount).toBe(1);
  });

  it("should prevent registration when already at capacity", async () => {
    const t = await createTestWithComponents();

    // Setup: Create tournament already at capacity
    const organizerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "organizer",
        email: "organizer@test.com",
        privyId: "privy_organizer",
        createdAt: Date.now(),
      });
    });

    const tournamentId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournaments", {
        name: "Full Tournament",
        description: "Already full",
        format: "single_elimination",
        mode: "casual",
        maxPlayers: 8,
        registeredCount: 8,
        checkedInCount: 0, // Already full
        entryFee: 0,
        prizePool: { first: 0, second: 0, thirdFourth: 0 },
        status: "registration",
        createdBy: organizerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        currentRound: 0,
        registrationStartsAt: Date.now(),
        scheduledStartAt: Date.now() + 60 * 60 * 1000,
        registrationEndsAt: Date.now() + 30 * 60 * 1000,
        checkInStartsAt: Date.now() + 30 * 60 * 1000,
        checkInEndsAt: Date.now() + 60 * 60 * 1000,
      });
    });

    // Create a user trying to join
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "latecomer",
        email: "latecomer@test.com",
        privyId: "privy_latecomer",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create deck for latecomer
    const deckId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Test Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(userId, { activeDeckId: deckId });
    });

    // Execute: Try to join full tournament
    await expect(
      t
        .withIdentity({ subject: "privy_latecomer" })
        .mutation(api.social.tournaments.registerForTournament, {
          tournamentId,
        })
    ).rejects.toThrow(/TOURNAMENT_FULL|full/i);

    // Verify: registeredCount unchanged
    const tournament = await t.run(async (ctx) => await ctx.db.get(tournamentId));
    expect(tournament?.registeredCount).toBe(8);
  });
});
