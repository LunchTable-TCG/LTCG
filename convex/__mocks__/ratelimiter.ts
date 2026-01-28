import { v } from "convex/values";
// Mock rate limiter module for tests
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";

// Mock limit function that always allows requests
export const limit = mutation({
  args: {
    name: v.string(),
    key: v.optional(v.string()),
    config: v.optional(v.any()),
  },
  handler: async () => {
    return { ok: true, retryAfter: 0 };
  },
});

export const reset = mutation({
  args: {
    name: v.string(),
    key: v.optional(v.string()),
  },
  handler: async () => {
    // No-op in tests
  },
});

export const checkRateLimit = query({
  args: {
    name: v.string(),
    key: v.optional(v.string()),
  },
  handler: async () => {
    return { allowed: true, retryAfter: null };
  },
});
