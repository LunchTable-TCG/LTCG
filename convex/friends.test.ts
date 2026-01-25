import { expect, test, describe } from "vitest";
import { createTestInstance } from "./test.setup";
import type { TestMutationCtx } from "./test.setup";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Comprehensive Friends System Tests
 *
 * Tests cover:
 * - Friend request lifecycle (send, accept, decline, cancel)
 * - Bidirectional relationship management
 * - Auto-accept when both users send requests
 * - Blocking and unblocking
 * - Edge cases and validation
 * - Online status tracking
 * - User search functionality
 */

// Helper: Create a test user with session token
async function createTestUser(t: any, username: string) {
  return await t.run(async (ctx: any) => {
    const userId = await ctx.db.insert("users", {
      username,
      email: `${username}@example.com`,
      createdAt: Date.now(),
    });

    const token = `${username}-token-${Date.now()}`;
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: Date.now() + 100000,
    });

    return { userId, token };
  });
}

// Helper: Create user presence for online status testing
async function createPresence(t: any, userId: Id<"users">, username: string, lastActiveAt: number) {
  return await t.run(async (ctx: any) => {
    return await ctx.db.insert("userPresence", {
      userId,
      username,
      lastActiveAt,
      status: "online",
    });
  });
}

describe("Friends System", () => {
  describe("sendFriendRequest", () => {
    test("should successfully send friend request", async () => {
      const t = createTestInstance();
      const { token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      const result = await t.mutation(api.friends.sendFriendRequest, {
        token: token1,
        friendUsername: "bob",
      });

      expect(result.success).toBe(true);
      expect(result.autoAccepted).toBe(false);

      // Verify bidirectional entries created
      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      expect(friendships.length).toBe(2);
      expect(friendships.every((f: any) => f.status === "pending")).toBe(true);
    });

    test("should throw error when user not found", async () => {
      const t = createTestInstance();
      const { token } = await createTestUser(t, "alice");

      await expect(
        t.mutation(api.friends.sendFriendRequest, {
          token,
          friendUsername: "nonexistent",
        })
      ).rejects.toThrow("User not found");
    });

    test("should throw error when trying to friend yourself", async () => {
      const t = createTestInstance();
      const { token } = await createTestUser(t, "alice");

      await expect(
        t.mutation(api.friends.sendFriendRequest, {
          token,
          friendUsername: "alice",
        })
      ).rejects.toThrow("You cannot send a friend request to yourself");
    });

    test("should throw error when already friends", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      // Create existing friendship
      await t.run(async (ctx: any) => {
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "accepted",
          requestedBy: userId1,
          createdAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.friends.sendFriendRequest, {
          token: token1,
          friendUsername: "bob",
        })
      ).rejects.toThrow("You are already friends with this user");
    });

    test("should throw error when request already sent", async () => {
      const t = createTestInstance();
      const { token: token1 } = await createTestUser(t, "alice");
      await createTestUser(t, "bob");

      // Send first request
      await t.mutation(api.friends.sendFriendRequest, {
        token: token1,
        friendUsername: "bob",
      });

      // Try to send duplicate
      await expect(
        t.mutation(api.friends.sendFriendRequest, {
          token: token1,
          friendUsername: "bob",
        })
      ).rejects.toThrow("Friend request already sent");
    });

    test("should throw error when user is blocked", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      // Alice blocks Bob
      await t.run(async (ctx: any) => {
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "blocked",
          requestedBy: userId1,
          createdAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.friends.sendFriendRequest, {
          token: token1,
          friendUsername: "bob",
        })
      ).rejects.toThrow("Cannot send friend request to this user");
    });

    test("should throw error when blocked by user", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      // Bob blocks Alice
      await t.run(async (ctx: any) => {
        await ctx.db.insert("friendships", {
          userId: userId2,
          friendId: userId1,
          status: "blocked",
          requestedBy: userId2,
          createdAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.friends.sendFriendRequest, {
          token: token1,
          friendUsername: "bob",
        })
      ).rejects.toThrow("Cannot send friend request to this user");
    });

    test("CRITICAL: should auto-accept when both users send requests", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2, token: token2 } = await createTestUser(t, "bob");

      // Alice sends request to Bob
      const result1 = await t.mutation(api.friends.sendFriendRequest, {
        token: token1,
        friendUsername: "bob",
      });
      expect(result1.autoAccepted).toBe(false);

      // Bob sends request to Alice (should auto-accept)
      const result2 = await t.mutation(api.friends.sendFriendRequest, {
        token: token2,
        friendUsername: "alice",
      });
      expect(result2.autoAccepted).toBe(true);

      // Verify both friendships are now accepted
      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      expect(friendships.length).toBe(2);
      expect(friendships.every((f: any) => f.status === "accepted")).toBe(true);
    });
  });

  describe("acceptFriendRequest", () => {
    test("should accept incoming friend request", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2, token: token2 } = await createTestUser(t, "bob");

      // Alice sends request to Bob
      await t.mutation(api.friends.sendFriendRequest, {
        token: token1,
        friendUsername: "bob",
      });

      // Bob accepts
      await t.mutation(api.friends.acceptFriendRequest, {
        token: token2,
        friendId: userId1,
      });

      // Verify both friendships are accepted
      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      expect(friendships.length).toBe(2);
      expect(friendships.every((f: any) => f.status === "accepted")).toBe(true);
      expect(friendships.every((f: any) => f.respondedAt)).toBeTruthy();
    });

    test("should throw error when request not found", async () => {
      const t = createTestInstance();
      const { token } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      await expect(
        t.mutation(api.friends.acceptFriendRequest, {
          token,
          friendId: userId2,
        })
      ).rejects.toThrow("Friend request not found");
    });

    test("should throw error when request is not pending", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      // Create already accepted friendship
      await t.run(async (ctx: any) => {
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "accepted",
          requestedBy: userId2,
          createdAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.friends.acceptFriendRequest, {
          token: token1,
          friendId: userId2,
        })
      ).rejects.toThrow("This friend request is not pending");
    });

    test("should throw error when trying to accept own request", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      // Alice sends request to Bob
      await t.mutation(api.friends.sendFriendRequest, {
        token: token1,
        friendUsername: "bob",
      });

      // Alice tries to accept her own request
      await expect(
        t.mutation(api.friends.acceptFriendRequest, {
          token: token1,
          friendId: userId2,
        })
      ).rejects.toThrow("You cannot accept your own friend request");
    });
  });

  describe("declineFriendRequest", () => {
    test("should decline incoming request and remove both entries", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2, token: token2 } = await createTestUser(t, "bob");

      // Alice sends request
      await t.mutation(api.friends.sendFriendRequest, {
        token: token1,
        friendUsername: "bob",
      });

      // Bob declines
      await t.mutation(api.friends.declineFriendRequest, {
        token: token2,
        friendId: userId1,
      });

      // Verify both entries removed
      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      expect(friendships.length).toBe(0);
    });
  });

  describe("cancelFriendRequest", () => {
    test("should cancel outgoing request and remove both entries", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      // Alice sends request
      await t.mutation(api.friends.sendFriendRequest, {
        token: token1,
        friendUsername: "bob",
      });

      // Alice cancels
      await t.mutation(api.friends.cancelFriendRequest, {
        token: token1,
        friendId: userId2,
      });

      // Verify both entries removed
      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      expect(friendships.length).toBe(0);
    });

    test("should throw error when trying to cancel request you didn't send", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2, token: token2 } = await createTestUser(t, "bob");

      // Alice sends request
      await t.mutation(api.friends.sendFriendRequest, {
        token: token1,
        friendUsername: "bob",
      });

      // Bob tries to cancel (should fail - he didn't send it)
      await expect(
        t.mutation(api.friends.cancelFriendRequest, {
          token: token2,
          friendId: userId1,
        })
      ).rejects.toThrow("You did not send this friend request");
    });
  });

  describe("removeFriend", () => {
    test("should unfriend and remove both entries", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      // Create accepted friendship
      await t.run(async (ctx: any) => {
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "accepted",
          requestedBy: userId1,
          createdAt: Date.now(),
          respondedAt: Date.now(),
        });
        await ctx.db.insert("friendships", {
          userId: userId2,
          friendId: userId1,
          status: "accepted",
          requestedBy: userId1,
          createdAt: Date.now(),
          respondedAt: Date.now(),
        });
      });

      // Alice removes Bob
      await t.mutation(api.friends.removeFriend, {
        token: token1,
        friendId: userId2,
      });

      // Verify both entries removed
      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      expect(friendships.length).toBe(0);
    });

    test("should throw error when not friends", async () => {
      const t = createTestInstance();
      const { token } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      await expect(
        t.mutation(api.friends.removeFriend, {
          token,
          friendId: userId2,
        })
      ).rejects.toThrow("You are not friends with this user");
    });
  });

  describe("blockUser", () => {
    test("should block user and remove reciprocal friendship", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      // Create accepted friendship
      await t.run(async (ctx: any) => {
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "accepted",
          requestedBy: userId1,
          createdAt: Date.now(),
        });
        await ctx.db.insert("friendships", {
          userId: userId2,
          friendId: userId1,
          status: "accepted",
          requestedBy: userId1,
          createdAt: Date.now(),
        });
      });

      // Alice blocks Bob
      await t.mutation(api.friends.blockUser, {
        token: token1,
        friendId: userId2,
      });

      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      // Only Alice's block entry should exist
      expect(friendships.length).toBe(1);
      expect(friendships[0]!.status).toBe("blocked");
      expect(friendships[0]!.userId).toBe(userId1);
    });

    test("should throw error when trying to block yourself", async () => {
      const t = createTestInstance();
      const { userId, token } = await createTestUser(t, "alice");

      await expect(
        t.mutation(api.friends.blockUser, {
          token,
          friendId: userId,
        })
      ).rejects.toThrow("You cannot block yourself");
    });

    test("should create block entry when no friendship exists", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      await t.mutation(api.friends.blockUser, {
        token: token1,
        friendId: userId2,
      });

      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      expect(friendships.length).toBe(1);
      expect(friendships[0]!.status).toBe("blocked");
    });
  });

  describe("unblockUser", () => {
    test("should unblock user and remove entry", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      // Create block
      await t.run(async (ctx: any) => {
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "blocked",
          requestedBy: userId1,
          createdAt: Date.now(),
        });
      });

      // Unblock
      await t.mutation(api.friends.unblockUser, {
        token: token1,
        friendId: userId2,
      });

      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      expect(friendships.length).toBe(0);
    });

    test("should throw error when user is not blocked", async () => {
      const t = createTestInstance();
      const { token } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      await expect(
        t.mutation(api.friends.unblockUser, {
          token,
          friendId: userId2,
        })
      ).rejects.toThrow("This user is not blocked");
    });
  });

  describe("getFriends", () => {
    test("should return empty array when no friends", async () => {
      const t = createTestInstance();
      const { token } = await createTestUser(t, "alice");

      const friends = await t.query(api.friends.getFriends, { token });

      expect(friends).toEqual([]);
    });

    test("should return friends with correct online status", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");
      const { userId: userId3 } = await createTestUser(t, "charlie");

      // Create friendships
      await t.run(async (ctx: any) => {
        // Alice <-> Bob (Bob online)
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "accepted",
          requestedBy: userId1,
          createdAt: Date.now() - 1000,
        });
        await ctx.db.insert("friendships", {
          userId: userId2,
          friendId: userId1,
          status: "accepted",
          requestedBy: userId1,
          createdAt: Date.now() - 1000,
        });

        // Alice <-> Charlie (Charlie offline)
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId3,
          status: "accepted",
          requestedBy: userId1,
          createdAt: Date.now() - 2000,
        });
        await ctx.db.insert("friendships", {
          userId: userId3,
          friendId: userId1,
          status: "accepted",
          requestedBy: userId1,
          createdAt: Date.now() - 2000,
        });
      });

      // Bob is online (active 1 minute ago)
      await createPresence(t, userId2, "bob", Date.now() - 60000);

      // Charlie is offline (active 5 minutes ago)
      await createPresence(t, userId3, "charlie", Date.now() - 300000);

      const friends = await t.query(api.friends.getFriends, { token: token1 });

      expect(friends.length).toBe(2);

      const bob = friends.find((f: any) => f.username === "bob");
      const charlie = friends.find((f: any) => f.username === "charlie");

      expect(bob?.isOnline).toBe(true);
      expect(charlie?.isOnline).toBe(false);
    });

    test("should not return pending or blocked friendships", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");
      const { userId: userId3 } = await createTestUser(t, "charlie");

      await t.run(async (ctx: any) => {
        // Pending request to Bob
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "pending",
          requestedBy: userId1,
          createdAt: Date.now(),
        });

        // Blocked Charlie
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId3,
          status: "blocked",
          requestedBy: userId1,
          createdAt: Date.now(),
        });
      });

      const friends = await t.query(api.friends.getFriends, { token: token1 });

      expect(friends.length).toBe(0);
    });
  });

  describe("getIncomingRequests", () => {
    test("should return only incoming requests", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");
      const { userId: userId3 } = await createTestUser(t, "charlie");

      await t.run(async (ctx: any) => {
        // Incoming from Bob
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "pending",
          requestedBy: userId2, // Bob requested
          createdAt: Date.now(),
        });

        // Outgoing to Charlie
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId3,
          status: "pending",
          requestedBy: userId1, // Alice requested
          createdAt: Date.now(),
        });
      });

      const requests = await t.query(api.friends.getIncomingRequests, { token: token1 });

      expect(requests.length).toBe(1);
      expect(requests[0]!.username).toBe("bob");
    });
  });

  describe("getOutgoingRequests", () => {
    test("should return only outgoing requests", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");
      const { userId: userId3 } = await createTestUser(t, "charlie");

      await t.run(async (ctx: any) => {
        // Incoming from Bob
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "pending",
          requestedBy: userId2,
          createdAt: Date.now(),
        });

        // Outgoing to Charlie
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId3,
          status: "pending",
          requestedBy: userId1,
          createdAt: Date.now(),
        });
      });

      const requests = await t.query(api.friends.getOutgoingRequests, { token: token1 });

      expect(requests.length).toBe(1);
      expect(requests[0]!.username).toBe("charlie");
    });
  });

  describe("getBlockedUsers", () => {
    test("should return blocked users", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      await t.run(async (ctx: any) => {
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "blocked",
          requestedBy: userId1,
          createdAt: Date.now(),
          respondedAt: Date.now(),
        });
      });

      const blocked = await t.query(api.friends.getBlockedUsers, { token: token1 });

      expect(blocked.length).toBe(1);
      expect(blocked[0]!.username).toBe("bob");
    });
  });

  describe("searchUsers", () => {
    test("should find users by username prefix (case-insensitive)", async () => {
      const t = createTestInstance();
      const { token } = await createTestUser(t, "alice");
      await createTestUser(t, "bob");
      await createTestUser(t, "bobby");
      await createTestUser(t, "charlie");

      const results = await t.query(api.friends.searchUsers, {
        token,
        query: "bob",
      });

      expect(results.length).toBe(2);
      expect(results.every((r: any) => r.username.toLowerCase().startsWith("bob"))).toBe(true);
    });

    test("should exclude current user from results", async () => {
      const t = createTestInstance();
      const { token } = await createTestUser(t, "alice");
      await createTestUser(t, "alicia");

      const results = await t.query(api.friends.searchUsers, {
        token,
        query: "ali",
      });

      expect(results.length).toBe(1);
      expect(results[0]!.username).toBe("alicia");
    });

    test("should respect limit parameter", async () => {
      const t = createTestInstance();
      const { token } = await createTestUser(t, "alice");

      // Create 10 users starting with "test"
      for (let i = 0; i < 10; i++) {
        await createTestUser(t, `test${i}`);
      }

      const results = await t.query(api.friends.searchUsers, {
        token,
        query: "test",
        limit: 5,
      });

      expect(results.length).toBe(5);
    });

    test("should show correct friendship status", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2 } = await createTestUser(t, "bob");

      // Alice sends request to Bob
      await t.run(async (ctx: any) => {
        await ctx.db.insert("friendships", {
          userId: userId1,
          friendId: userId2,
          status: "pending",
          requestedBy: userId1,
          createdAt: Date.now(),
        });
      });

      const results = await t.query(api.friends.searchUsers, {
        token: token1,
        query: "bob",
      });

      expect(results[0]!.friendshipStatus).toBe("pending");
      expect(results[0]!.isSentRequest).toBe(true);
    });
  });

  describe("Edge Cases and Data Integrity", () => {
    test("CRITICAL: bidirectional sync - both entries updated on accept", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2, token: token2 } = await createTestUser(t, "bob");

      // Alice sends request
      await t.mutation(api.friends.sendFriendRequest, {
        token: token1,
        friendUsername: "bob",
      });

      // Bob accepts
      await t.mutation(api.friends.acceptFriendRequest, {
        token: token2,
        friendId: userId1,
      });

      // Verify both entries have same status and timestamps
      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      expect(friendships.every((f: any) => f.status === "accepted")).toBe(true);
      expect(friendships.every((f: any) => f.respondedAt)).toBeTruthy();

      // Both users should see each other as friends
      const aliceFriends = await t.query(api.friends.getFriends, { token: token1 });
      const bobFriends = await t.query(api.friends.getFriends, { token: token2 });

      expect(aliceFriends.length).toBe(1);
      expect(bobFriends.length).toBe(1);
      expect(aliceFriends[0]!.username).toBe("bob");
      expect(bobFriends[0]!.username).toBe("alice");
    });

    test("CRITICAL: orphaned entries - decline removes both sides", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2, token: token2 } = await createTestUser(t, "bob");

      // Alice sends request
      await t.mutation(api.friends.sendFriendRequest, {
        token: token1,
        friendUsername: "bob",
      });

      // Bob declines
      await t.mutation(api.friends.declineFriendRequest, {
        token: token2,
        friendId: userId1,
      });

      // No orphaned entries should exist
      const friendships = await t.run(async (ctx: any) => {
        return await ctx.db.query("friendships").collect();
      });

      expect(friendships.length).toBe(0);

      // Both users should have no requests
      const aliceOutgoing = await t.query(api.friends.getOutgoingRequests, { token: token1 });
      const bobIncoming = await t.query(api.friends.getIncomingRequests, { token: token2 });

      expect(aliceOutgoing.length).toBe(0);
      expect(bobIncoming.length).toBe(0);
    });

    test("CRITICAL: block prevents new friend requests", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2, token: token2 } = await createTestUser(t, "bob");

      // Alice blocks Bob
      await t.mutation(api.friends.blockUser, {
        token: token1,
        friendId: userId2,
      });

      // Bob tries to send request to Alice
      await expect(
        t.mutation(api.friends.sendFriendRequest, {
          token: token2,
          friendUsername: "alice",
        })
      ).rejects.toThrow("Cannot send friend request to this user");

      // Alice also can't send to blocked user
      await expect(
        t.mutation(api.friends.sendFriendRequest, {
          token: token1,
          friendUsername: "bob",
        })
      ).rejects.toThrow("Cannot send friend request to this user");
    });

    test("after unblock, friend requests work again", async () => {
      const t = createTestInstance();
      const { userId: userId1, token: token1 } = await createTestUser(t, "alice");
      const { userId: userId2, token: token2 } = await createTestUser(t, "bob");

      // Alice blocks Bob
      await t.mutation(api.friends.blockUser, {
        token: token1,
        friendId: userId2,
      });

      // Alice unblocks Bob
      await t.mutation(api.friends.unblockUser, {
        token: token1,
        friendId: userId2,
      });

      // Now Bob can send request
      const result = await t.mutation(api.friends.sendFriendRequest, {
        token: token2,
        friendUsername: "alice",
      });

      expect(result.success).toBe(true);
    });
  });
});
