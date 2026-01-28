/**
 * Test setup for @convex-dev/ratelimiter component
 *
 * NOTE: The @convex-dev/ratelimiter package does not export a /test helper,
 * and manually registering it requires complex module path resolution.
 *
 * For now, we skip tests that specifically test rate limiter enforcement.
 * Those tests would require either:
 * 1. A test helper from the package (not available)
 * 2. Manual component registration with proper module paths (complex)
 * 3. Mocking the component at runtime (possible future enhancement)
 */
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Rate limiter component schema (from @convex-dev/ratelimiter/src/component/schema.ts)
export const rateLimiterSchema = defineSchema({
  rateLimits: defineTable({
    name: v.string(),
    key: v.optional(v.string()),
    shard: v.number(),
    value: v.number(),
    ts: v.number(),
  }).index("name", ["name", "key", "shard"]),
});

// For now, we can't properly register the component in tests
// This is a known limitation when testing with Convex components that don't export test helpers
export const rateLimiterModules = {};
