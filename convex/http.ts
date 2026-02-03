import router from "./router";

// Webhooks
import * as heliusWebhook from "./webhooks/helius";

// Privy handles auth externally - no auth routes needed here
const http = router;

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
