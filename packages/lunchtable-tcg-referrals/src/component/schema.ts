import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  userReferralLinks: defineTable({
    userId: v.string(), // external ref → v.string()
    code: v.string(),
    uses: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_user", ["userId", "isActive"]),

  referrals: defineTable({
    referrerId: v.string(), // external ref → v.string()
    referredUserId: v.string(), // external ref → v.string()
    referralCode: v.string(),
    createdAt: v.number(),
  })
    .index("by_referrer", ["referrerId", "createdAt"])
    .index("by_referred", ["referredUserId"])
    .index("by_code", ["referralCode"]),
});
