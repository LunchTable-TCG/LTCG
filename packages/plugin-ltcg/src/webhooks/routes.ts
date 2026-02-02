/**
 * Webhook Route Definitions
 *
 * ElizaOS-compatible route handlers for receiving game webhooks.
 */

import type { RouteRequest, RouteResponse } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { type GameWebhookPayload, verifyWebhookSignature } from "./gameEventHandler";

/**
 * Webhook routes for the LTCG plugin
 */
export const webhookRoutes = [
  {
    name: "ltcg-game-webhook",
    path: "/ltcg/webhook/game",
    type: "POST",
    handler: async (req: RouteRequest, res: RouteResponse) => {
      try {
        const payload = req.body as GameWebhookPayload;

        // Validate required fields
        if (!payload.eventType || !payload.gameId || !payload.agentId) {
          res.status(400).json({
            error: "Missing required fields: eventType, gameId, agentId",
          });
          return;
        }

        // Verify signature (in production)
        const webhookSecret = process.env.LTCG_WEBHOOK_SECRET;
        if (webhookSecret && payload.signature) {
          const rawBody = JSON.stringify(req.body);
          if (!verifyWebhookSignature(rawBody, payload.signature, webhookSecret)) {
            logger.warn({ gameId: payload.gameId }, "Invalid webhook signature");
            res.status(401).json({ error: "Invalid signature" });
            return;
          }
        }

        logger.info(
          { eventType: payload.eventType, gameId: payload.gameId },
          "Received game webhook"
        );

        // Note: In a real implementation, we'd need access to the runtime
        // This would be injected via middleware or context
        // For now, acknowledge receipt and let the event system handle it

        res.status(200).json({
          received: true,
          eventType: payload.eventType,
          gameId: payload.gameId,
          timestamp: Date.now(),
        });
      } catch (error) {
        logger.error({ error }, "Error processing game webhook");
        res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },
  {
    name: "ltcg-webhook-health",
    path: "/ltcg/webhook/health",
    type: "GET",
    handler: async (_req: RouteRequest, res: RouteResponse) => {
      res.status(200).json({
        status: "ok",
        service: "ltcg-webhook",
        timestamp: Date.now(),
      });
    },
  },
];
