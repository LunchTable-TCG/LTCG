// @ts-nocheck - ActionRetrier circular type issues - TODO: Add explicit return types
/**
 * Agent Webhook Notifications
 *
 * Handles pushing real-time game events to registered agents via HTTP webhooks.
 * This enables agents to receive instant notifications about turns, game events, etc.
 */

import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { internalAny } from "../lib/internalHelpers";
import { actionRetrier, RetryConfig } from "../infrastructure/actionRetrier";

/**
 * Webhook event types
 */
export type WebhookEventType =
  | "turn_started"
  | "game_started"
  | "game_ended"
  | "opponent_action"
  | "chain_waiting"
  | "phase_changed";

/**
 * Webhook payload structure
 */
interface WebhookPayload {
  eventType: WebhookEventType;
  gameId: string;
  agentId: string;
  timestamp: number;
  signature: string;
  data: Record<string, unknown>;
}

/**
 * Update agent's callback URL
 */
export const updateCallbackUrl = mutation({
  args: {
    agentId: v.id("agents"),
    callbackUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Validate URL if provided
    if (args.callbackUrl) {
      try {
        new URL(args.callbackUrl);
      } catch {
        throw new Error("Invalid callback URL");
      }
    }

    await ctx.db.patch(args.agentId, {
      callbackUrl: args.callbackUrl,
      webhookSecret: args.webhookSecret,
      webhookEnabled: !!args.callbackUrl,
      webhookFailCount: 0,
    });

    return { success: true };
  },
});

/**
 * Internal query to get agent webhook config
 */
export const getAgentWebhookConfig = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return null;
    return {
      callbackUrl: agent.callbackUrl,
      webhookEnabled: agent.webhookEnabled,
      webhookFailCount: agent.webhookFailCount,
      webhookSecret: agent.webhookSecret,
    };
  },
});

/**
 * Record successful webhook delivery
 */
export const recordWebhookSuccess = internalMutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      lastWebhookAt: Date.now(),
      webhookFailCount: 0,
    });
  },
});

/**
 * Record webhook delivery failure
 */
export const recordWebhookFailure = internalMutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return;

    const failCount = (agent.webhookFailCount ?? 0) + 1;

    await ctx.db.patch(args.agentId, {
      webhookFailCount: failCount,
      // Auto-disable after 5 consecutive failures
      webhookEnabled: failCount < 5 ? agent.webhookEnabled : false,
    });
  },
});

/**
 * Webhook result type
 */
interface WebhookResult {
  sent: boolean;
  reason?: string;
  status?: number;
  error?: string;
}

/**
 * Webhook config from database
 */
interface WebhookConfig {
  callbackUrl?: string;
  webhookEnabled?: boolean;
  webhookFailCount?: number;
  webhookSecret?: string;
}

/**
 * Send webhook to an agent (with retry logic)
 * This is the main entry point called by game events
 */
export const sendWebhook = action({
  args: {
    agentId: v.id("agents"),
    eventType: v.string(),
    gameId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args): Promise<{ sent: boolean; reason?: string } | { runId: string }> => {
    // Get agent webhook config (pre-flight check)
    const config: WebhookConfig | null = await ctx.runQuery(
      internalAny.agents.webhooks.getAgentWebhookConfig,
      { agentId: args.agentId }
    );

    if (!config || !config.callbackUrl || !config.webhookEnabled) {
      console.log(`[Webhook] Agent ${args.agentId} has no webhook configured`);
      return { sent: false, reason: "no_webhook_configured" };
    }

    // Check if too many failures
    if ((config.webhookFailCount ?? 0) >= 5) {
      console.log(`[Webhook] Agent ${args.agentId} webhook disabled due to failures`);
      return { sent: false, reason: "disabled_due_to_failures" };
    }

    // Use action retrier for the HTTP call
    const runId = await actionRetrier.run(
      ctx,
      internal.agents.webhooks._sendWebhookInternal,
      args,
      RetryConfig.webhook
    );

    // Return runId for tracking
    return { runId };
  },
});

/**
 * Internal webhook sender with HTTP logic
 */
export const _sendWebhookInternal = internalAction({
  args: {
    agentId: v.id("agents"),
    eventType: v.string(),
    gameId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args): Promise<WebhookResult> => {
    // Re-fetch config in internal action (components accessible here)
    const config: WebhookConfig | null = await ctx.runQuery(
      internalAny.agents.webhooks.getAgentWebhookConfig,
      { agentId: args.agentId }
    );

    if (!config || !config.callbackUrl) {
      return { sent: false, reason: "no_webhook_configured" };
    }

    // Build payload
    const payload: WebhookPayload = {
      eventType: args.eventType as WebhookEventType,
      gameId: args.gameId,
      agentId: args.agentId,
      timestamp: Date.now(),
      signature: generateSignature(args.agentId, args.eventType, config.webhookSecret),
      data: args.data,
    };

    try {
      // Send webhook with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response: Response = await fetch(config.callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LTCG-Webhook-Event": args.eventType,
          "X-LTCG-Webhook-Signature": payload.signature,
          "X-LTCG-Agent-Id": args.agentId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Record success
        await ctx.runMutation(internalAny.agents.webhooks.recordWebhookSuccess, {
          agentId: args.agentId,
        });
        console.log(`[Webhook] Sent ${args.eventType} to agent ${args.agentId}`);
        return { sent: true, status: response.status };
      }
      // Record failure
      await ctx.runMutation(internalAny.agents.webhooks.recordWebhookFailure, {
        agentId: args.agentId,
      });
      console.log(`[Webhook] Failed to send to agent ${args.agentId}: ${response.status}`);
      return { sent: false, reason: "http_error", status: response.status };
    } catch (error) {
      // Record failure
      await ctx.runMutation(internalAny.agents.webhooks.recordWebhookFailure, {
        agentId: args.agentId,
      });
      console.error(`[Webhook] Error sending to agent ${args.agentId}:`, error);

      // Throw error to trigger retry
      throw error;
    }
  },
});

/**
 * Generate webhook signature for verification
 */
function generateSignature(agentId: string, eventType: string, _secret?: string): string {
  // Simple signature format - in production use HMAC
  const data = `${agentId}:${eventType}:${Date.now()}`;
  const base = Buffer.from(data).toString("base64").substring(0, 32);
  return `ltcg_sig_${base}`;
}
