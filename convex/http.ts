import { registerRoutes } from "@convex-dev/stripe";

import { components } from "./_generated/api";
import router from "./router";

// Webhooks
import * as heliusWebhook from "./webhooks/helius";

// Privy handles auth externally - no auth routes needed here
const http = router;

// ============================================================================
// Stripe Webhook (via @convex-dev/stripe component)
// ============================================================================

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
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

export default http;
