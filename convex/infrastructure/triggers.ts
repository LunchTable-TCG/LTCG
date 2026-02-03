/**
 * Database Triggers for Audit Logging
 *
 * This module sets up automatic audit logging for critical tables using convex-helpers Triggers.
 * Triggers run atomically within the same transaction as the mutation.
 *
 * SETUP INSTRUCTIONS:
 * ===================
 * To enable triggers in your Convex app, you must wrap your mutations with customMutation:
 *
 * 1. The file convex/functions.ts has already been created with wrapped mutations.
 *
 * 2. Update all mutation files to import from convex/functions.ts instead of _generated/server.
 * Change: import { mutation } from "./_generated/server"
 * To: import { mutation } from "./functions"
 *
 * 3. Set up ESLint rule to enforce usage (optional but recommended):
 * Add to your ESLint config to prevent accidental use of unwrapped mutations.
 * See TRIGGERS_README.md for the ESLint configuration example.
 *
 * IMPORTANT NOTES:
 * ================
 * - Triggers only run when using the wrapped mutation functions
 * - Triggers do NOT run when editing data in Convex dashboard
 * - Triggers do NOT run when importing data via npx convex import
 * - Triggers run atomically with the mutation (same transaction)
 * - If a trigger throws an error, it will abort the entire mutation
 * - Recursive triggers are executed in breadth-first-search order
 */

import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "../_generated/dataModel";

export const triggers = new Triggers<DataModel>();

/**
 * Helper function to extract changed fields from a patch operation
 */
function getChangedFields(change: any): string[] | undefined {
  // Note: Convex triggers use "update" but we map it to "patch" for our schema
  if ((change.operation !== "update" && change.operation !== "patch") || !change.newDoc || !change.oldDoc) {
    return undefined;
  }

  const changedFields: string[] = [];
  const newKeys = Object.keys(change.newDoc);
  const oldKeys = Object.keys(change.oldDoc);
  const allKeysArray = Array.from(new Set([...newKeys, ...oldKeys]));

  for (const key of allKeysArray) {
    if (change.newDoc[key] !== change.oldDoc[key]) {
      changedFields.push(key);
    }
  }

  return changedFields.length > 0 ? changedFields : undefined;
}

/**
 * Helper to normalize operation name
 * Convex uses "update" but we use "patch" in our schema
 */
function normalizeOperation(operation: string): "insert" | "patch" | "delete" {
  if (operation === "update") return "patch";
  if (operation === "insert" || operation === "delete") return operation;
  return "patch"; // Default fallback
}

// ============================================================================
// USERS TABLE TRIGGERS
// ============================================================================

triggers.register("users", async (ctx, change) => {
  await ctx.db.insert("auditLog", {
    table: "users",
    operation: normalizeOperation(change.operation),
    documentId: change.id,
    userId: change.newDoc?.privyId ? change.id : undefined, // Self-reference for user changes
    timestamp: Date.now(),
    changedFields: getChangedFields(change),
    oldValue: change.oldDoc,
    newValue: change.newDoc,
  });
});

// ============================================================================
// TOKEN TRANSACTIONS TABLE TRIGGERS
// ============================================================================

triggers.register("tokenTransactions", async (ctx, change) => {
  // For token transactions, capture the userId from the transaction itself
  const userId = change.newDoc?.userId ?? change.oldDoc?.userId;

  await ctx.db.insert("auditLog", {
    table: "tokenTransactions",
    operation: normalizeOperation(change.operation),
    documentId: change.id,
    userId,
    timestamp: Date.now(),
    changedFields: getChangedFields(change),
    oldValue: change.oldDoc,
    newValue: change.newDoc,
  });
});

// ============================================================================
// MODERATION ACTIONS TABLE TRIGGERS
// ============================================================================

triggers.register("moderationActions", async (ctx, change) => {
  // For moderation actions, use the adminId as the user who made the change
  const userId = change.newDoc?.adminId ?? change.oldDoc?.adminId;

  await ctx.db.insert("auditLog", {
    table: "moderationActions",
    operation: normalizeOperation(change.operation),
    documentId: change.id,
    userId,
    timestamp: Date.now(),
    changedFields: getChangedFields(change),
    oldValue: change.oldDoc,
    newValue: change.newDoc,
  });
});

// ============================================================================
// ADDITIONAL TRIGGER EXAMPLES (commented out)
// ============================================================================

// Example: Prevent certain operations
// triggers.register("users", async (ctx, change) => {
//   if (change.newDoc?.username === "admin") {
//     throw new Error("Cannot create or modify user with username 'admin'");
//   }
// });

// Example: Cascading deletes
// triggers.register("users", async (ctx, change) => {
//   if (change.operation === "delete") {
//     // Delete all user's data
//     const userDecks = await ctx.db
//       .query("userDecks")
//       .withIndex("by_userId", (q) => q.eq("userId", change.id))
//       .collect();
//
//     for (const deck of userDecks) {
//       await ctx.db.delete(deck._id);
//     }
//   }
// });

// Example: Denormalized field updates
// triggers.register("users", async (ctx, change) => {
//   if (change.newDoc) {
//     const totalGames = (change.newDoc.totalWins ?? 0) + (change.newDoc.totalLosses ?? 0);
//     if (change.newDoc.totalGames !== totalGames) {
//       await ctx.db.patch(change.id, { totalGames });
//     }
//   }
// });
