/**
 * LTCG Webhook Routes
 *
 * HTTP endpoints for receiving real-time game events from the LTCG server.
 * These routes are registered with ElizaOS and receive push notifications.
 */

export * from "./gameEventHandler";
export { webhookRoutes } from "./routes";
