/**
 * Game Webhooks System
 *
 * Manages webhook subscriptions for game events (turn_start, game_end, etc.).
 * Enables external systems and agents to receive real-time game event notifications.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, query } from "../_generated/server";
import { mutation } from "../functions";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get all webhooks for an agent
 *
 * Returns active and inactive webhooks registered for the specified agent.
 */
export const getWebhooksForAgent = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, { agentId }) => {
    const webhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .collect();

    return webhooks.map((webhook) => ({
      webhookId: webhook._id,
      agentId: webhook.agentId,
      events: webhook.events,
      url: webhook.url,
      isActive: webhook.isActive,
      lastTriggered: webhook.lastTriggered,
      failureCount: webhook.failureCount,
    }));
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Register a new webhook for an agent
 *
 * Creates a webhook subscription that will receive HTTP POST requests
 * when specified game events occur.
 */
export const registerWebhook = mutation({
  args: {
    agentId: v.id("agents"),
    events: v.array(v.string()),
    url: v.string(),
    secret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate agent exists
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${args.agentId} does not exist`);
    }

    // Validate URL format (must be https://)
    const urlPattern = /^https:\/\/.+/;
    if (!urlPattern.test(args.url)) {
      throw new Error("Webhook URL must use HTTPS protocol");
    }

    // Validate events array is not empty
    if (args.events.length === 0) {
      throw new Error("Must specify at least one event to subscribe to");
    }

    // Create webhook record
    const webhookId = await ctx.db.insert("webhooks", {
      agentId: args.agentId,
      events: args.events,
      url: args.url,
      secret: args.secret,
      isActive: true,
      failureCount: 0,
    });

    return { webhookId };
  },
});

/**
 * Delete a webhook
 *
 * Removes a webhook subscription. Validates the webhook belongs to the specified agent.
 */
export const deleteWebhook = mutation({
  args: {
    webhookId: v.id("webhooks"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { webhookId, agentId }) => {
    // Get webhook and validate it belongs to the agent
    const webhook = await ctx.db.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook with ID ${webhookId} does not exist`);
    }

    if (webhook.agentId !== agentId) {
      throw new Error("Webhook does not belong to the specified agent");
    }

    // Delete webhook
    await ctx.db.delete(webhookId);

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Trigger webhooks for a game event
 *
 * Finds all active webhooks subscribed to the event and sends HTTP POST requests.
 * Implements retry logic with exponential backoff and automatic deactivation on failures.
 */
export const triggerWebhooks = internalMutation({
  args: {
    event: v.string(),
    gameId: v.string(),
    lobbyId: v.id("gameLobbies"),
    turnNumber: v.number(),
    playerId: v.id("users"),
    additionalData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Find all active webhooks subscribed to this event
    const allWebhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const subscribedWebhooks = allWebhooks.filter((webhook) =>
      webhook.events.includes(args.event)
    );

    if (subscribedWebhooks.length === 0) {
      return {
        totalWebhooks: 0,
        successful: 0,
        failed: 0,
        deactivated: 0,
      };
    }

    // Track delivery results
    let successCount = 0;
    let failureCount = 0;
    let deactivatedCount = 0;

    // Process each webhook
    for (const webhook of subscribedWebhooks) {
      try {
        const delivered = await deliverWebhook(webhook, {
          event: args.event,
          gameId: args.gameId,
          lobbyId: args.lobbyId,
          turnNumber: args.turnNumber,
          playerId: args.playerId,
          timestamp,
          additionalData: args.additionalData,
        });

        if (delivered) {
          // Update lastTriggered and reset failure count on success
          await ctx.db.patch(webhook._id, {
            lastTriggered: timestamp,
            failureCount: 0,
          });
          successCount++;
        } else {
          // Increment failure count
          const newFailureCount = webhook.failureCount + 1;

          // Deactivate after 3 consecutive failures
          if (newFailureCount >= 3) {
            await ctx.db.patch(webhook._id, {
              failureCount: newFailureCount,
              isActive: false,
            });
            deactivatedCount++;
          } else {
            await ctx.db.patch(webhook._id, {
              failureCount: newFailureCount,
            });
          }
          failureCount++;
        }
      } catch (error) {
        console.error(`Error processing webhook ${webhook._id}:`, error);
        failureCount++;

        // Increment failure count even on exception
        const newFailureCount = webhook.failureCount + 1;
        if (newFailureCount >= 3) {
          await ctx.db.patch(webhook._id, {
            failureCount: newFailureCount,
            isActive: false,
          });
          deactivatedCount++;
        } else {
          await ctx.db.patch(webhook._id, {
            failureCount: newFailureCount,
          });
        }
      }
    }

    return {
      totalWebhooks: subscribedWebhooks.length,
      successful: successCount,
      failed: failureCount,
      deactivated: deactivatedCount,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface WebhookPayload {
  event: string;
  gameId: string;
  lobbyId: Id<"gameLobbies">;
  turnNumber: number;
  playerId: Id<"users">;
  timestamp: number;
  signature?: string;
  // biome-ignore lint/suspicious/noExplicitAny: Flexible metadata for game events
  additionalData?: any;
}

/**
 * Deliver webhook with retry logic
 *
 * Sends HTTP POST request to webhook URL with exponential backoff retries.
 * Returns true if delivery succeeded, false otherwise.
 */
async function deliverWebhook(
  webhook: {
    _id: Id<"webhooks">;
    url: string;
    secret?: string;
  },
  payload: Omit<WebhookPayload, "signature">
): Promise<boolean> {
  // Retry delays: 1s, 5s, 15s
  const retryDelays = [1000, 5000, 15000];

  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    try {
      // Add HMAC signature if secret provided
      const finalPayload: WebhookPayload = { ...payload };
      if (webhook.secret) {
        finalPayload.signature = await generateHmacSignature(
          JSON.stringify(payload),
          webhook.secret
        );
      }

      // Send HTTP POST request
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "LTCG-Webhook/1.0",
        },
        body: JSON.stringify(finalPayload),
      });

      // Consider 2xx status codes as success
      if (response.ok) {
        return true;
      }

      // Log non-2xx responses
      console.warn(
        `Webhook ${webhook._id} returned ${response.status} on attempt ${attempt + 1}`
      );

      // Don't retry on client errors (4xx), only on server errors (5xx)
      if (response.status >= 400 && response.status < 500) {
        return false;
      }

      // Wait before retry (except on last attempt)
      if (attempt < retryDelays.length - 1) {
        await sleep(retryDelays[attempt]);
      }
    } catch (error) {
      console.error(`Webhook ${webhook._id} delivery error on attempt ${attempt + 1}:`, error);

      // Wait before retry (except on last attempt)
      if (attempt < retryDelays.length - 1) {
        await sleep(retryDelays[attempt]);
      }
    }
  }

  // All retries failed
  return false;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 *
 * Uses Web Crypto API (available in Convex runtime) to create
 * a signature that recipients can verify.
 */
async function generateHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);

  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
