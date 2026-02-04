/**
 * Auto-Generated CRUD Operations for Admin/Config Tables
 *
 * This file contains CRUD utilities generated using convex-helpers `crud` function
 * for simple admin/config tables that don't require complex business logic.
 *
 * SELECTED TABLES (Based on Analysis):
 * =====================================
 *
 * ✅ newsArticles - Admin content management
 *    - Simple create/read/update/delete operations
 *    - Admin-only writes, public reads
 *    - No complex business logic
 *
 * ✅ systemConfig - System configuration values
 *    - Admin-only access for both read and write
 *    - Simple key-value store with metadata
 *    - No complex validation beyond schema
 *
 * ✅ featureFlags - Feature flag management
 *    - Admin-only writes, read for feature checks
 *    - Simple toggle/update operations
 *    - No complex rollout logic (handled elsewhere)
 *
 * NOT SUITABLE (Require Custom Logic):
 * ====================================
 *
 * ❌ users - Complex auth, stats, economy, moderation logic
 * ❌ games - Game lifecycle, state management, matchmaking
 * ❌ userDecks - Deck validation, card ownership checks
 * ❌ treasury/wallets - Financial operations, blockchain integration
 * ❌ tournaments - Complex state machines, bracket generation
 * ❌ quests/achievements - Progress tracking, reward distribution
 * ❌ shop items - Inventory, purchase validation, stock management
 * ❌ leaderboards - Ranking calculations, decay, segments
 *
 * USAGE:
 * ======
 *
 * // In your admin dashboard or API endpoints:
 * import { newsArticlesCRUD, systemConfigCRUD, featureFlagsCRUD } from "@/convex/admin/crudGenerated";
 *
 * // Create
 * const articleId = await ctx.runMutation(newsArticlesCRUD.create, {
 *   title: "New Update",
 *   slug: "new-update",
 *   content: "...",
 *   // ... other fields
 * });
 *
 * // Read
 * const article = await ctx.runQuery(newsArticlesCRUD.read, { id: articleId });
 *
 * // Update
 * await ctx.runMutation(newsArticlesCRUD.update, {
 *   id: articleId,
 *   patch: { isPublished: true }
 * });
 *
 * // Delete
 * await ctx.runMutation(newsArticlesCRUD.destroy, { id: articleId });
 *
 * // Paginate
 * const { page, hasMore } = await ctx.runQuery(newsArticlesCRUD.paginate, {
 *   numItems: 10,
 *   cursor: null
 * });
 */

import { crud } from "convex-helpers/server/crud";
import schema from "../schema";
import { publicQuery } from "../lib/crudBuilders";
import { adminQuery, adminMutation } from "../lib/crudBuilders";

// ============================================================================
// NEWS ARTICLES CRUD
// ============================================================================
//
// Access Control:
// - Read: Public (for displaying news on frontend)
// - Create/Update/Delete: Admin only
//
// Generated Methods:
// - create(args: { ...fields }): Promise<Id<"newsArticles">>
// - read(args: { id: Id<"newsArticles"> }): Promise<Doc<"newsArticles"> | null>
// - update(args: { id: Id<"newsArticles">, patch: Partial<...> }): Promise<void>
// - destroy(args: { id: Id<"newsArticles"> }): Promise<void>
// - paginate(args: { numItems: number, cursor: string | null }): Promise<{ page: Doc[], cursor: string | null, hasMore: boolean }>

export const newsArticlesCRUD = crud(
  schema,
  "newsArticles",
  publicQuery, // Anyone can read news articles
  adminMutation // Only admins can create/update/delete
);

// ============================================================================
// SYSTEM CONFIG CRUD
// ============================================================================
//
// Access Control:
// - Read: Admin only (config values may contain sensitive data)
// - Create/Update/Delete: Admin only
//
// Generated Methods: Same as newsArticles

export const systemConfigCRUD = crud(
  schema,
  "systemConfig",
  adminQuery, // Only admins can read system config
  adminMutation // Only admins can modify system config
);

// ============================================================================
// FEATURE FLAGS CRUD
// ============================================================================
//
// Access Control:
// - Read: Public (for checking feature availability)
// - Create/Update/Delete: Admin only
//
// Generated Methods: Same as newsArticles

export const featureFlagsCRUD = crud(
  schema,
  "featureFlags",
  publicQuery, // Anyone can read feature flags (for feature checks)
  adminMutation // Only admins can create/update/delete flags
);

// ============================================================================
// EXPORT ALL CRUD OPERATIONS
// ============================================================================

/**
 * Convenience object for importing all CRUD operations at once
 */
export const adminCRUD = {
  newsArticles: newsArticlesCRUD,
  systemConfig: systemConfigCRUD,
  featureFlags: featureFlagsCRUD,
} as const;

/**
 * Type helper to get the shape of CRUD operations
 * Useful for type-safe admin dashboard development
 */
export type CRUDOperations = typeof newsArticlesCRUD;

// ============================================================================
// NOTES FOR FUTURE EXPANSION
// ============================================================================
//
// POTENTIAL CANDIDATES (If simplified in the future):
// - seasons: If we remove complex reward logic, could use CRUD
// - aiChatSessions: Simple session tracking, could use CRUD
// - adminRoles: If we simplify role management, could use CRUD
//
// HOW TO ADD NEW CRUD:
// 1. Analyze table schema - ensure it's truly simple
// 2. Determine access control (public/auth/admin/superadmin)
// 3. Add CRUD export using appropriate query/mutation builders
// 4. Document in this file
// 5. Update CRUD_GUIDE.md with examples
//
// REMEMBER:
// - Only use CRUD for tables without complex business logic
// - Custom validation should be handled in schema, not CRUD
// - For complex operations, write dedicated mutations/queries
// - CRUD is for admin tools, not core gameplay logic
