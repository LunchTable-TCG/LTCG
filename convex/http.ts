import { registerRoutes } from "@convex-dev/stripe";
import type Stripe from "stripe";

import { components, internal } from "./_generated/api";
import router from "./router";

// Webhooks
import * as heliusWebhook from "./webhooks/helius";
import * as livekitWebhook from "./livekit/http/webhook";
import * as streamingHttp from "./streaming/http";

// Privy handles auth externally - no auth routes needed here
const http = router;

// ============================================================================
// Stripe Webhook (via @convex-dev/stripe component)
// ============================================================================

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    // Grant premium when subscription becomes active
    "customer.subscription.created": async (ctx, event) => {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.status === "active" || subscription.status === "trialing") {
        const userId = subscription.metadata?.["userId"];
        if (userId) {
          await ctx.runMutation(internal.stripe.battlePassSync.grantPremiumAccess, {
            privyId: userId,
          });
        }
      }
    },
    "customer.subscription.updated": async (ctx, event) => {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.["userId"];
      if (!userId) return;

      if (subscription.status === "active" || subscription.status === "trialing") {
        await ctx.runMutation(internal.stripe.battlePassSync.grantPremiumAccess, {
          privyId: userId,
        });
      } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
        await ctx.runMutation(internal.stripe.battlePassSync.revokePremiumAccess, {
          privyId: userId,
        });
      }
    },
    "customer.subscription.deleted": async (ctx, event) => {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.["userId"];
      if (userId) {
        await ctx.runMutation(internal.stripe.battlePassSync.revokePremiumAccess, {
          privyId: userId,
        });
      }
    },
  },
});

// ============================================================================
// Webhook Endpoints
// ============================================================================

// POST /webhooks/helius - Receive Helius transaction data
http.route({
  path: "/webhooks/helius",
  method: "POST",
  handler: heliusWebhook.handleWebhook,
});

// GET /webhooks/helius/health - Health check for Helius webhook
http.route({
  path: "/webhooks/helius/health",
  method: "GET",
  handler: heliusWebhook.healthCheck,
});

// ============================================================================
// LiveKit Webhook
// ============================================================================

// POST /livekit/webhook - Receive LiveKit room/participant/track events
http.route({
  path: "/livekit/webhook",
  method: "POST",
  handler: livekitWebhook.livekitWebhook,
});

// ============================================================================
// Streaming API
// ============================================================================

// POST /api/streaming/start - Start streaming session
http.route({
  path: "/api/streaming/start",
  method: "POST",
  handler: streamingHttp.startStreaming,
});

export default http;
