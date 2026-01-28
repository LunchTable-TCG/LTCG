/**
 * Shared Validators for Convex Functions
 *
 * Common validators used across multiple Convex functions
 */

import { v } from "convex/values";

/**
 * Rarity validator - matches schema definition
 */
export const rarityValidator = v.union(
  v.literal("common"),
  v.literal("uncommon"),
  v.literal("rare"),
  v.literal("epic"),
  v.literal("legendary")
);

/**
 * Moderation action validator
 */
export const moderationActionValidator = v.union(
  v.literal("warn"),
  v.literal("mute"),
  v.literal("ban"),
  v.literal("unban"),
  v.literal("unmute")
);

/**
 * Player type validator
 */
export const playerTypeValidator = v.union(v.literal("human"), v.literal("ai"));

/**
 * Player moderation log validator
 * Represents a single moderation action entry
 */
export const playerModerationLogValidator = v.object({
  _id: v.id("playerModerationLog"),
  _creationTime: v.number(),
  playerId: v.id("players"),
  moderatorId: v.id("users"),
  action: moderationActionValidator,
  reason: v.string(),
  duration: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
  notes: v.optional(v.string()),
});

/**
 * Admin role type validator
 */
export const adminRoleTypeValidator = v.union(
  v.literal("admin"),
  v.literal("moderator"),
  v.literal("support")
);

/**
 * Admin role validator
 */
export const adminRoleValidator = v.object({
  _id: v.id("adminRoles"),
  _creationTime: v.number(),
  userId: v.id("users"),
  roleType: adminRoleTypeValidator,
  permissions: v.array(v.string()),
  grantedBy: v.id("users"),
  grantedAt: v.number(),
});

/**
 * Audit target type validator
 */
export const auditTargetTypeValidator = v.union(
  v.literal("user"),
  v.literal("player"),
  v.literal("card"),
  v.literal("game"),
  v.literal("system")
);

/**
 * Admin audit log validator
 */
export const adminAuditLogValidator = v.object({
  _id: v.id("adminAuditLog"),
  _creationTime: v.number(),
  adminId: v.id("users"),
  action: v.string(),
  targetType: auditTargetTypeValidator,
  targetId: v.optional(v.string()),
  /**
   * v.any() USAGE: Audit log details
   *
   * REASON: Different audit actions have different detail structures
   * EXPECTED TYPES:
   * - user_login: { provider: string, isNewUser: boolean }
   * - admin_action: { action: string, affectedUserId: Id<"users"> }
   * - config_change: { field: string, oldValue: any, newValue: any }
   *
   * SECURITY: Admin-only field for forensic analysis
   * ALTERNATIVE: Define AuditDetails union type
   */
  details: v.optional(v.any()),
  ipAddress: v.optional(v.string()),
});
