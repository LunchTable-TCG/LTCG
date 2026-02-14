import { registerRoutes } from "@convex-dev/stripe";

import { components } from "./_generated/api";
import router from "./router";

import * as livekitWebhook from "./livekit/http/webhook";

// Privy handles auth externally - no auth routes needed here
const http = router;

// ============================================================================
// Stripe Webhook (via @convex-dev/stripe component)
// ============================================================================

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    // TODO: Re-wire stripe subscription events to use component clients
    // after game engine migration is complete
  },
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

export default http;
