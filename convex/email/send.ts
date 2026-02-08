import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internal = (generatedApi as any).internal;
import { internalAction, internalMutation, mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";
import { emailRecipientTypeValidator } from "../schema";

/**
 * Email Sending System
 * Handles bulk email sending via Resend API with tracking
 */

const EMAIL_FROM = process.env["AUTH_EMAIL"] ?? "Lunchtable <onboarding@resend.dev>";
const BATCH_SIZE = 100; // Resend batch limit

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

// Send a campaign email
export const sendCampaign = mutation({
  args: {
    scheduledContentId: v.optional(v.id("scheduledContent")),
    templateId: v.optional(v.id("emailTemplates")),
    subject: v.string(),
    body: v.string(),
    recipientType: emailRecipientTypeValidator,
    listId: v.optional(v.id("emailLists")),
    customEmails: v.optional(v.array(v.string())),
    variables: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Create email history record
    const historyId = await ctx.db.insert("emailHistory", {
      scheduledContentId: args.scheduledContentId,
      templateId: args.templateId,
      subject: args.subject,
      recipientCount: 0, // Will be updated
      sentCount: 0,
      failedCount: 0,
      status: "sending",
      sentBy: userId,
      sentAt: Date.now(),
    });

    // Schedule the actual send action
    await ctx.scheduler.runAfter(0, internal.email.send.processCampaign, {
      historyId,
      subject: args.subject,
      body: args.body,
      recipientType: args.recipientType,
      listId: args.listId,
      customEmails: args.customEmails,
      variables: args.variables,
    });

    return { historyId, status: "queued" };
  },
});

// ============================================================================
// INTERNAL ACTIONS
// ============================================================================

// Process and send campaign emails
export const processCampaign = internalAction({
  args: {
    historyId: v.id("emailHistory"),
    subject: v.string(),
    body: v.string(),
    recipientType: emailRecipientTypeValidator,
    listId: v.optional(v.id("emailLists")),
    customEmails: v.optional(v.array(v.string())),
    variables: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    // Gather recipients based on type
    const recipients: { email: string; name: string }[] = [];

    if (args.recipientType === "players" || args.recipientType === "both") {
      // Get player emails
      const players = await ctx.runQuery(internal.email.send.getPlayersWithEmail, {});
      recipients.push(...players);
    }

    if (args.recipientType === "subscribers" || args.recipientType === "both") {
      if (args.listId) {
        const subscribers = await ctx.runQuery(internal.email.send.getSubscribersByList, {
          listId: args.listId,
        });
        recipients.push(...subscribers);
      }
    }

    if (args.recipientType === "custom" && args.customEmails) {
      recipients.push(...args.customEmails.map((email) => ({ email, name: "Subscriber" })));
    }

    // Remove duplicates by email
    const uniqueRecipients = Array.from(new Map(recipients.map((r) => [r.email, r])).values());

    // Update recipient count
    await ctx.runMutation(internal.email.send.updateHistoryCount, {
      historyId: args.historyId,
      recipientCount: uniqueRecipients.length,
    });

    if (uniqueRecipients.length === 0) {
      await ctx.runMutation(internal.email.send.updateHistoryStatus, {
        historyId: args.historyId,
        status: "completed",
        error: "No recipients found",
      });
      return;
    }

    // Send in batches
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < uniqueRecipients.length; i += BATCH_SIZE) {
      const batch = uniqueRecipients.slice(i, i + BATCH_SIZE);

      for (const recipient of batch) {
        try {
          // Replace variables in body
          let personalizedBody = args.body;
          personalizedBody = personalizedBody.replace(/\{\{name\}\}/g, recipient.name);
          personalizedBody = personalizedBody.replace(/\{\{email\}\}/g, recipient.email);

          if (args.variables) {
            for (const [key, value] of Object.entries(args.variables)) {
              personalizedBody = personalizedBody.replace(
                new RegExp(`\\{\\{${key}\\}\\}`, "g"),
                value
              );
            }
          }

          await sendSingleEmail({
            to: recipient.email,
            subject: args.subject,
            html: wrapEmailHtml(personalizedBody),
          });
          sentCount++;
        } catch (error) {
          console.error(`Failed to send to ${recipient.email}:`, error);
          failedCount++;
        }
      }

      // Update progress
      await ctx.runMutation(internal.email.send.updateHistoryProgress, {
        historyId: args.historyId,
        sentCount,
        failedCount,
      });
    }

    // Finalize
    await ctx.runMutation(internal.email.send.updateHistoryStatus, {
      historyId: args.historyId,
      status:
        failedCount === 0
          ? "completed"
          : failedCount === uniqueRecipients.length
            ? "failed"
            : "partial",
    });
  },
});

// Send a single email via Resend
async function sendSingleEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env["RESEND_API_KEY"];

  if (!apiKey) {
    console.log("=".repeat(60));
    console.log("EMAIL (Development Mode)");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("⚠️  Set RESEND_API_KEY to send real emails");
    console.log("=".repeat(60));
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
}

// Wrap email body in styled HTML template
function wrapEmailHtml(body: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        ${body}
      </div>
      <div style="text-align: center; margin-top: 24px; color: #666; font-size: 12px;">
        <p>Lunchtable - The Trading Card Game</p>
        <p><a href="{{unsubscribe_url}}" style="color: #666;">Unsubscribe</a></p>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// INTERNAL QUERIES & MUTATIONS
// ============================================================================

export const getPlayersWithEmail = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.email.send._getPlayersQuery, {});
    return users;
  },
});

export const _getPlayersQuery = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("email"), undefined))
      .take(10000);

    return users.flatMap((u) => {
      if (!u.email) return [];
      return [
        {
          email: u.email,
          name: u.username ?? u.name ?? "Player",
        },
      ];
    });
  },
});

export const getSubscribersByList = internalAction({
  args: { listId: v.id("emailLists") },
  handler: async (ctx, args) => {
    const subscribers = await ctx.runQuery(internal.email.send._getSubscribersQuery, {
      listId: args.listId,
    });
    return subscribers;
  },
});

export const _getSubscribersQuery = internalMutation({
  args: { listId: v.id("emailLists") },
  handler: async (ctx, args) => {
    const subscribers = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_list", (q) => q.eq("listId", args.listId).eq("isActive", true))
      .collect();

    return subscribers.map((s) => ({
      email: s.email,
      name: s.name ?? "Subscriber",
    }));
  },
});

export const updateHistoryCount = internalMutation({
  args: {
    historyId: v.id("emailHistory"),
    recipientCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.historyId, {
      recipientCount: args.recipientCount,
    });
  },
});

export const updateHistoryProgress = internalMutation({
  args: {
    historyId: v.id("emailHistory"),
    sentCount: v.number(),
    failedCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.historyId, {
      sentCount: args.sentCount,
      failedCount: args.failedCount,
    });
  },
});

export const updateHistoryStatus = internalMutation({
  args: {
    historyId: v.id("emailHistory"),
    status: v.union(
      v.literal("sending"),
      v.literal("completed"),
      v.literal("partial"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.historyId, {
      status: args.status,
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

// ============================================================================
// QUERIES
// ============================================================================

// Get email history
export const getHistory = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("emailHistory")
      .withIndex("by_sent")
      .order("desc")
      .take(args.limit ?? 50);
  },
});
