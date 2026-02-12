/**
 * Agent Webhook Notifications
 *
 * Handles pushing real-time game events to registered agents via HTTP webhooks.
 * This enables agents to receive instant notifications about turns, game events, etc.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internal = (generatedApi as any).internal;
import {
  action,
  type ActionCtx,
  internalAction,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import { internalMutation, mutation } from "../functions";
import { RetryConfig, actionRetrier } from "../infrastructure/actionRetrier";
import { internalAny } from "../lib/internalHelpers";
import { requireAuthMutation } from "../lib/convexAuth";

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
  signature?: string;
  data: Record<string, unknown>;
}

type WebhookAccess = { kind: "internal" } | { kind: "user"; userId: Id<"users"> };

function hasValidInternalAuth(internalAuth?: string): boolean {
  const expectedSecret = process.env["INTERNAL_API_SECRET"]?.trim();
  const providedSecret = internalAuth?.trim();
  if (!expectedSecret || !providedSecret) {
    return false;
  }
  return expectedSecret === providedSecret;
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();

  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "host.docker.internal" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return true;
  }

  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map((part) => Number.parseInt(part, 10));
    if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
      return true;
    }
    const [a, b] = octets;
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (host.includes(":")) {
    return host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd");
  }

  return false;
}

function parseAndValidateCallbackUrl(callbackUrl: string): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(callbackUrl);
  } catch {
    throw new Error("Invalid callback URL");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Callback URL must use http or https");
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("Callback URL must not include credentials");
  }

  if (isPrivateOrLocalHost(parsedUrl.hostname)) {
    throw new Error("Callback URL host is not allowed");
  }

  return parsedUrl;
}

function normalizeWebhookSecret(secret?: string): string | undefined {
  const trimmed = secret?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

async function resolveMutationAccess(
  ctx: MutationCtx,
  internalAuth?: string
): Promise<WebhookAccess> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.issuer === "convex" || hasValidInternalAuth(internalAuth)) {
    return { kind: "internal" };
  }
  const auth = await requireAuthMutation(ctx);
  return { kind: "user", userId: auth.userId };
}

async function resolveActionAccess(ctx: ActionCtx, internalAuth?: string): Promise<WebhookAccess> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.issuer === "convex" || hasValidInternalAuth(internalAuth)) {
    return { kind: "internal" };
  }

  const user = await ctx.runQuery(apiAny.auth.auth.loggedInUser, {});
  if (!user?._id) {
    throw new Error("Unauthorized");
  }
  return { kind: "user", userId: user._id as Id<"users"> };
}

/**
 * Update agent's callback URL
 */
export const updateCallbackUrl = mutation({
  args: {
    agentId: v.id("agents"),
    callbackUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveMutationAccess(ctx, args.internalAuth);
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    if (access.kind === "user" && agent.userId !== access.userId) {
      throw new Error("Unauthorized");
    }

    const validatedCallbackUrl = args.callbackUrl
      ? parseAndValidateCallbackUrl(args.callbackUrl).toString()
      : undefined;
    const webhookSecret = normalizeWebhookSecret(args.webhookSecret);

    await ctx.db.patch(args.agentId, {
      callbackUrl: validatedCallbackUrl,
      webhookSecret,
      webhookEnabled: !!validatedCallbackUrl,
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
      userId: agent.userId,
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
  userId?: Id<"users">;
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
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ sent: boolean; reason?: string } | { runId: string }> => {
    const access = await resolveActionAccess(ctx, args.internalAuth);

    // Get agent webhook config (pre-flight check)
    const config: WebhookConfig | null = await ctx.runQuery(
      internalAny.agents.webhooks.getAgentWebhookConfig,
      { agentId: args.agentId }
    );

    if (access.kind === "user" && config?.userId !== access.userId) {
      throw new Error("Unauthorized");
    }

    if (!config || !config.callbackUrl || !config.webhookEnabled) {
      console.log(`[Webhook] Agent ${args.agentId} has no webhook configured`);
      return { sent: false, reason: "no_webhook_configured" };
    }

    try {
      parseAndValidateCallbackUrl(config.callbackUrl);
    } catch {
      return { sent: false, reason: "invalid_callback_url" };
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
      {
        agentId: args.agentId,
        eventType: args.eventType,
        gameId: args.gameId,
        data: args.data,
      },
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

    let callbackUrl: string;
    try {
      callbackUrl = parseAndValidateCallbackUrl(config.callbackUrl).toString();
    } catch {
      await ctx.runMutation(internalAny.agents.webhooks.recordWebhookFailure, {
        agentId: args.agentId,
      });
      return { sent: false, reason: "invalid_callback_url" };
    }

    // Build payload
    const unsignedPayload = {
      eventType: args.eventType as WebhookEventType,
      gameId: args.gameId,
      agentId: args.agentId,
      timestamp: Date.now(),
      data: args.data as Record<string, unknown>,
    };
    const signature = await generateSignature(JSON.stringify(unsignedPayload), config.webhookSecret);

    const payload: WebhookPayload = {
      ...unsignedPayload,
      ...(signature ? { signature } : {}),
    };

    try {
      // Send webhook with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-LTCG-Webhook-Event": args.eventType,
        "X-LTCG-Agent-Id": args.agentId,
      };
      if (signature) {
        headers["X-LTCG-Webhook-Signature"] = signature;
      }

      const response: Response = await fetch(callbackUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: "error",
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
async function generateSignature(payload: string, secret?: string): Promise<string | undefined> {
  const signingSecret = normalizeWebhookSecret(secret);
  if (!signingSecret) {
    return undefined;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `sha256=${signature}`;
}
