import { internal } from "../_generated/api";
import { internalMutation } from "../functions";

// Email action references - extracted to module level for consistency
const emailActions = internal.infrastructure.emailActions;

// Helper to avoid TypeScript "Type instantiation is excessively deep" errors
// biome-ignore lint/suspicious/noExplicitAny: Convex scheduler type workaround for TS2589
const scheduleEmail = (ctx: any, emailFunction: any, args: any) =>
  ctx.scheduler.runAfter(0, emailFunction, args);

/**
 * Send welcome emails to new users
 *
 * This runs periodically to find users who:
 * - Were created in the last 24 hours
 * - Don't have the welcomeEmailSent field set
 * - Have an email address
 *
 * Sends them a welcome email and marks them as having received it.
 */
export const sendWelcomeEmailsToNewUsers = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Find users created in the last 24 hours who haven't received a welcome email
    const newUsers = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), oneDayAgo),
          q.or(
            q.eq(q.field("welcomeEmailSent"), undefined),
            q.eq(q.field("welcomeEmailSent"), false)
          ),
          q.neq(q.field("email"), undefined)
        )
      )
      .take(100); // Process up to 100 users at a time

    let emailsSent = 0;

    for (const user of newUsers) {
      if (!user.email) continue;

      try {
        // Schedule welcome email
        await scheduleEmail(ctx, emailActions.sendWelcomeEmail, {
          email: user.email,
          username: user.username || user.name || "Player",
        });

        // Mark as sent
        await ctx.db.patch(user._id, {
          welcomeEmailSent: true,
        });

        emailsSent++;
      } catch (error) {
        console.error(`Failed to send welcome email to ${user.email}:`, error);
        // Continue to next user even if this one fails
      }
    }

    console.log(`✅ Sent ${emailsSent} welcome emails to new users`);
    return { emailsSent, usersProcessed: newUsers.length };
  },
});
