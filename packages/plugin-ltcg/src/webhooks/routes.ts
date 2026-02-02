/**
 * Webhook Route Definitions
 *
 * ElizaOS-compatible route handlers for receiving game webhooks.
 * Implements proper security: HMAC verification, timestamp validation, replay protection.
 */

import type { RouteRequest, RouteResponse } from "@elizaos/core";
import { logger } from "@elizaos/core";
import {
  type GameWebhookPayload,
  checkWebhookIdempotency,
  validateWebhookTimestamp,
  verifyWebhookSignature,
} from "./gameEventHandler";

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

        // 1. Validate required fields
        if (!payload.eventType || !payload.gameId || !payload.agentId || !payload.timestamp) {
          res.status(400).json({
            error: "Missing required fields: eventType, gameId, agentId, timestamp",
          });
          return;
        }

        // 2. Validate timestamp (reject old webhooks - replay attack prevention)
        if (!validateWebhookTimestamp(payload.timestamp)) {
          logger.warn(
            { gameId: payload.gameId, timestamp: payload.timestamp },
            "Webhook timestamp expired"
          );
          res.status(400).json({ error: "Webhook expired" });
          return;
        }

        // 3. Check idempotency (reject duplicate webhooks)
        if (!checkWebhookIdempotency(payload.gameId, payload.timestamp, payload.eventType)) {
          logger.debug({ gameId: payload.gameId }, "Duplicate webhook ignored");
          res.status(200).json({ received: true, duplicate: true });
          return;
        }

        // 4. Verify HMAC signature (if secret configured)
        const webhookSecret = process.env.LTCG_WEBHOOK_SECRET;
        if (webhookSecret) {
          if (!payload.signature) {
            logger.warn({ gameId: payload.gameId }, "Missing webhook signature");
            res.status(401).json({ error: "Missing signature" });
            return;
          }

          const rawBody = JSON.stringify(req.body);
          const isValid = await verifyWebhookSignature(rawBody, payload.signature, webhookSecret);
          if (!isValid) {
            logger.warn({ gameId: payload.gameId }, "Invalid webhook signature");
            res.status(401).json({ error: "Invalid signature" });
            return;
          }
        }

        logger.info(
          { eventType: payload.eventType, gameId: payload.gameId },
          "Received valid game webhook"
        );

        // Acknowledge receipt - actual processing happens via TurnOrchestrator
        res.status(200).json({
          received: true,
          eventType: payload.eventType,
          gameId: payload.gameId,
          processedAt: Date.now(),
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
