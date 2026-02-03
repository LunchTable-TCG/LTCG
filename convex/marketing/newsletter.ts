/**
 * Newsletter Module
 *
 * Handles newsletter signups for marketing campaigns.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Subscribe to newsletter
 * Validates email and prevents duplicate signups
 */
export const subscribe = mutation({
  args: {
    email: v.string(),
    source: v.string(), // e.g., "landing_page", "footer", "popup"
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const { email, source } = args;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: "Please enter a valid email address.",
      };
    }

    // Normalize email to lowercase for duplicate checking
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing signup
    const existingSignup = await ctx.db
      .query("newsletterSignups")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existingSignup) {
      return {
        success: false,
        message: "This email is already subscribed to our newsletter!",
      };
    }

    // Create new signup
    await ctx.db.insert("newsletterSignups", {
      email: normalizedEmail,
      signupDate: Date.now(),
      source,
    });

    return {
      success: true,
      message: "Successfully subscribed! Check your inbox for exclusive rewards.",
    };
  },
});
