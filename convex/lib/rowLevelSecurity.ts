/**
 * Row-Level Security (RLS) Rules for Sensitive Tables
 *
 * This module defines read and write access policies for sensitive database tables.
 * RLS provides automatic, database-layer enforcement of access control, ensuring
 * that users can only access data they're authorized to see or modify.
 *
 * FEATURES:
 * =========
 * - Automatic filtering of query results based on user permissions
 * - Write protection preventing unauthorized modifications
 * - Admin bypass for privileged operations
 * - Composable with existing authentication and triggers
 * - Type-safe access control rules
 *
 * ARCHITECTURE:
 * =============
 * RLS integrates with the existing customFunctions architecture:
 *
 * 1. Custom auth context (customFunctions.ts) provides user identity
 * 2. RLS rules use that context to filter database operations
 * 3. Triggers (triggers.ts) continue to work transparently
 * 4. All enforcement happens at the database layer
 *
 * SECURITY MODEL:
 * ===============
 * - Users can only read/modify their own data by default
 * - Admins can bypass restrictions for moderation/support
 * - Superadmins have unrestricted access
 * - Read rules filter query results automatically
 * - Write rules prevent unauthorized insert/update/delete
 *
 * USAGE:
 * ======
 * See customFunctions.ts for integration with authedQuery/authedMutation.
 * RLS is automatically applied when using the rlsQuery/rlsMutation builders.
 *
 * EXTENDING:
 * ==========
 * To add RLS to a new table:
 * 1. Add the table to RLSRules below with read/modify/insert rules
 * 2. Use rlsQuery or rlsMutation for that table's endpoints
 * 3. Test both authorized and unauthorized access scenarios
 *
 * See MIGRATION_GUIDE.md for step-by-step instructions.
 */

import type { Rules } from "convex-helpers/server/rowLevelSecurity";
import type { DataModel } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Context with authenticated user information
 * This matches the AuthContext from customFunctions.ts
 */
interface RLSAuthContext {
  userId: Id<"users">;
  user: Doc<"users">;
  privyId: string;
  username: string;
}

/**
 * Context with admin role information
 * This matches the AdminAuthContext from customFunctions.ts
 */
export interface RLSAdminContext extends RLSAuthContext {
  adminRole: Doc<"adminRoles">;
  role: "admin" | "superadmin";
}

// =============================================================================
// ADMIN PERMISSION HELPERS
// =============================================================================

/**
 * Check if user has admin permissions
 * Returns true for active, non-expired admin or superadmin roles
 */
async function isAdmin(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<boolean> {
  const adminRole = await ctx.db
    .query("adminRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (!adminRole) return false;

  // Check expiration
  if (adminRole.expiresAt && adminRole.expiresAt < Date.now()) {
    return false;
  }

  // Must be admin or superadmin (not just moderator)
  return adminRole.role === "admin" || adminRole.role === "superadmin";
}

/**
 * Check if user is a superadmin
 * Superadmins have unrestricted access to all tables
 */
async function isSuperadmin(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<boolean> {
  const adminRole = await ctx.db
    .query("adminRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (!adminRole) return false;

  // Check expiration
  if (adminRole.expiresAt && adminRole.expiresAt < Date.now()) {
    return false;
  }

  return adminRole.role === "superadmin";
}

// =============================================================================
// RLS RULES DEFINITION
// =============================================================================

/**
 * Row-Level Security rules for all sensitive tables
 *
 * Each table can define three types of rules:
 * - read: Filter which documents a user can query (returns boolean)
 * - modify: Check if user can update/delete a document (returns boolean)
 * - insert: Check if user can insert a new document (returns boolean)
 *
 * Rules receive:
 * - ctx: The query/mutation context with db access
 * - doc: The document being accessed (for read/modify) or to be inserted (for insert)
 *
 * Rules should return:
 * - true: Allow access
 * - false: Deny access (document will be filtered from results or operation will fail)
 */
export async function createRLSRules(
  ctx: QueryCtx | MutationCtx,
  authUserId: Id<"users">
): Promise<Rules<QueryCtx | MutationCtx, DataModel>> {
  // Cache admin check to avoid repeated DB queries
  const userIsAdmin = await isAdmin(ctx, authUserId);
  const userIsSuperadmin = await isSuperadmin(ctx, authUserId);

  return {
    // =========================================================================
    // ADMIN ROLES TABLE
    // =========================================================================
    // Only superadmins can grant/revoke admin roles
    // Admins can view roles but not modify them
    adminRoles: {
      read: async (_, adminRole) => {
        // Superadmins can see all roles
        if (userIsSuperadmin) return true;

        // Regular admins can only see their own role
        if (userIsAdmin) {
          return adminRole.userId === authUserId;
        }

        // Non-admins cannot see any admin roles
        return false;
      },

      modify: async (_, _adminRole) => {
        // Only superadmins can modify admin roles
        return userIsSuperadmin;
      },

      insert: async (_, _adminRole) => {
        // Only superadmins can create new admin roles
        return userIsSuperadmin;
      },
    },

    // =========================================================================
    // API KEYS TABLE
    // =========================================================================
    // Users can only see and manage their own API keys
    // Admins can view all keys for support purposes but cannot modify them
    apiKeys: {
      read: async (_, apiKey) => {
        // Superadmins can see all API keys
        if (userIsSuperadmin) return true;

        // Regular admins can see all keys (for support/debugging)
        if (userIsAdmin) return true;

        // Users can only see their own keys
        return apiKey.userId === authUserId;
      },

      modify: async (_, apiKey) => {
        // Superadmins can modify any key
        if (userIsSuperadmin) return true;

        // Users can only modify their own keys
        // Admins CANNOT modify other users' keys (security)
        return apiKey.userId === authUserId;
      },

      insert: async (_, apiKey) => {
        // Superadmins can create keys for anyone
        if (userIsSuperadmin) return true;

        // Users can only create keys for themselves
        return apiKey.userId === authUserId;
      },
    },

    // =========================================================================
    // PLAYER CARDS TABLE
    // =========================================================================
    // Users can only access their own card collections
    // Admins can view but not modify (to prevent cheating/abuse)
    playerCards: {
      read: async (_, playerCard) => {
        // Superadmins can see all card collections
        if (userIsSuperadmin) return true;

        // Admins can see all collections (for support)
        if (userIsAdmin) return true;

        // Users can only see their own cards
        return playerCard.userId === authUserId;
      },

      modify: async (_, playerCard) => {
        // Superadmins can modify any card collection
        if (userIsSuperadmin) return true;

        // Users can only modify their own cards
        // Regular admins CANNOT modify card collections (prevent abuse)
        return playerCard.userId === authUserId;
      },

      insert: async (_, playerCard) => {
        // Superadmins can grant cards to anyone
        if (userIsSuperadmin) return true;

        // Users can only add cards to their own collection
        // This is typically done through game mechanics, not direct inserts
        return playerCard.userId === authUserId;
      },
    },

    // =========================================================================
    // DECK CARDS TABLE
    // =========================================================================
    // Users can only access cards in their own decks
    // More complex: needs to check deck ownership through userDecks table
    deckCards: {
      read: async (ctx, deckCard) => {
        // Superadmins can see all deck configurations
        if (userIsSuperadmin) return true;

        // Need to check if the deck belongs to the user
        const deck = await ctx.db.get(deckCard.deckId);
        if (!deck) return false; // Orphaned deck card

        // Admins can see all decks (for support/moderation)
        if (userIsAdmin) return true;

        // Users can only see cards in their own decks
        return deck.userId === authUserId;
      },

      modify: async (ctx, deckCard) => {
        // Superadmins can modify any deck configuration
        if (userIsSuperadmin) return true;

        // Need to check if the deck belongs to the user
        const deck = await ctx.db.get(deckCard.deckId);
        if (!deck) return false; // Orphaned deck card

        // Users can only modify cards in their own decks
        // Regular admins CANNOT modify user decks (prevent abuse)
        return deck.userId === authUserId;
      },

      insert: async (ctx, deckCard) => {
        // Superadmins can add cards to any deck
        if (userIsSuperadmin) return true;

        // Need to check if the deck belongs to the user
        const deck = await ctx.db.get(deckCard.deckId);
        if (!deck) return false; // Cannot add to non-existent deck

        // Users can only add cards to their own decks
        return deck.userId === authUserId;
      },
    },

    // =========================================================================
    // USER DECKS TABLE
    // =========================================================================
    // Users can only access their own decks
    // Admins can view for support but cannot modify
    userDecks: {
      read: async (_, deck) => {
        // Superadmins can see all decks
        if (userIsSuperadmin) return true;

        // Admins can see all decks (for support)
        if (userIsAdmin) return true;

        // Users can only see their own decks
        return deck.userId === authUserId;
      },

      modify: async (_, deck) => {
        // Superadmins can modify any deck
        if (userIsSuperadmin) return true;

        // Users can only modify their own decks
        // Regular admins CANNOT modify user decks
        return deck.userId === authUserId;
      },

      insert: async (_, deck) => {
        // Superadmins can create decks for anyone
        if (userIsSuperadmin) return true;

        // Users can only create their own decks
        return deck.userId === authUserId;
      },
    },
  } satisfies Partial<Rules<QueryCtx | MutationCtx, DataModel>>;
}

// =============================================================================
// EXAMPLE: CUSTOM RULE PATTERNS
// =============================================================================

/**
 * Example: Time-based access control
 *
 * Allow access only during specific time windows:
 *
 * ```typescript
 * read: async (_, doc) => {
 *   const now = Date.now();
 *   return now >= doc.availableFrom && now <= doc.availableUntil;
 * }
 * ```
 */

/**
 * Example: Relationship-based access
 *
 * Allow access based on relationships with other tables:
 *
 * ```typescript
 * read: async (ctx, gameSession) => {
 *   // Allow if user is a participant in the game
 *   const participant = await ctx.db
 *     .query("gameParticipants")
 *     .withIndex("by_game_user", q =>
 *       q.eq("gameId", gameSession._id).eq("userId", authUserId)
 *     )
 *     .first();
 *   return participant !== null;
 * }
 * ```
 */

/**
 * Example: Field-level access control
 *
 * Allow access based on document field values:
 *
 * ```typescript
 * read: async (_, doc) => {
 *   // Public documents are visible to all
 *   if (doc.visibility === "public") return true;
 *
 *   // Private documents only to owner
 *   if (doc.visibility === "private") {
 *     return doc.userId === authUserId;
 *   }
 *
 *   // Unlisted documents to users with the link
 *   return doc.visibility === "unlisted";
 * }
 * ```
 */

/**
 * Example: Prevent deletion of critical records
 *
 * ```typescript
 * modify: async (_, doc) => {
 *   // Prevent deletion of system-critical records
 *   if (doc.isSystemRecord) return false;
 *
 *   // Normal ownership check
 *   return doc.userId === authUserId || userIsSuperadmin;
 * }
 * ```
 */
