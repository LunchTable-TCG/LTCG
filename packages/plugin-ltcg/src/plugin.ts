import type { Plugin } from "@elizaos/core";
import {
  type Action,
  type ActionResult,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type Provider,
  type ProviderResult,
  type RouteRequest,
  type RouteResponse,
  Service,
  type State,
  logger,
} from "@elizaos/core";
import type { AgentPanel } from "./frontend";

// Re-export core types for plugin consumers
export type {
  Action,
  ActionResult,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
};
export { ModelType, Service };

/**
 * Extended Plugin interface with LTCG-specific panels
 */
export interface LTCGPlugin extends Plugin {
  panels?: AgentPanel[];
}
import { z } from "zod";

// Import LTCG actions, providers, and evaluators
import { ltcgActions } from "./actions";
import { controlRoutes } from "./api/controlRoutes";
import { panelRoutes } from "./api/routes";
import { ltcgEvaluators } from "./evaluators";
import { ltcgEvents } from "./events";
import { panels } from "./frontend";
import { ltcgProviders } from "./providers";
import { LTCGPollingService } from "./services/LTCGPollingService";
import { StateAggregator } from "./services/StateAggregator";
import { TurnOrchestrator } from "./services/TurnOrchestrator";
import { webhookRoutes } from "./webhooks";

/**
 * Define the configuration schema for the LTCG plugin
 *
 * Required:
 * - LTCG_API_KEY: Authentication key for LTCG API
 *
 * Optional:
 * - LTCG_API_URL: Override API base URL (defaults to production)
 * - LTCG_CALLBACK_URL: Agent's public URL for receiving webhooks
 * - LTCG_WEBHOOK_SECRET: Secret for verifying webhook signatures
 * - LTCG_AUTO_MATCHMAKING: Automatically find and join games (true/false)
 * - LTCG_DEBUG_MODE: Enable debug logging (true/false)
 */
const configSchema = z.object({
  LTCG_API_KEY: z
    .string()
    .min(1, "LTCG_API_KEY is required for authentication")
    .optional()
    .transform((val) => {
      if (!val) {
        console.warn(
          "Warning: LTCG_API_KEY is not provided - agent will not be able to play games"
        );
      }
      return val;
    }),
  LTCG_API_URL: z.string().url("LTCG_API_URL must be a valid URL").optional(),
  LTCG_CALLBACK_URL: z
    .string()
    .url("LTCG_CALLBACK_URL must be a valid URL for receiving webhooks")
    .optional()
    .transform((val) => {
      if (!val) {
        console.warn(
          "Warning: LTCG_CALLBACK_URL not provided - using polling fallback for game updates"
        );
      }
      return val;
    }),
  LTCG_WEBHOOK_SECRET: z
    .string()
    .min(16, "LTCG_WEBHOOK_SECRET should be at least 16 characters")
    .optional(),
  LTCG_AUTO_MATCHMAKING: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  LTCG_DEBUG_MODE: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  LTCG_CONTROL_API_KEY: z
    .string()
    .min(16, "LTCG_CONTROL_API_KEY should be at least 16 characters")
    .optional()
    .transform((val) => {
      if (!val) {
        console.warn(
          "Warning: LTCG_CONTROL_API_KEY not provided - control routes will fall back to LTCG_API_KEY; set a dedicated control key for strict key separation"
        );
      }
      return val;
    }),
});

const plugin: LTCGPlugin = {
  name: "ltcg",
  description:
    "LTCG card game plugin - enables AI agents to play the Legendary Trading Card Game with full gameplay capabilities, real-time updates, and customizable personalities",
  config: {
    LTCG_API_KEY: process.env.LTCG_API_KEY,
    LTCG_API_URL: process.env.LTCG_API_URL,
    LTCG_CALLBACK_URL: process.env.LTCG_CALLBACK_URL,
    LTCG_WEBHOOK_SECRET: process.env.LTCG_WEBHOOK_SECRET,
    LTCG_AUTO_MATCHMAKING: process.env.LTCG_AUTO_MATCHMAKING,
    LTCG_DEBUG_MODE: process.env.LTCG_DEBUG_MODE,
    LTCG_CONTROL_API_KEY: process.env.LTCG_CONTROL_API_KEY,
  },
  async init(config: Record<string, string>) {
    logger.info("*** Initializing LTCG plugin ***");
    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value !== undefined) process.env[key] = String(value);
      }

      // Log configuration status (without sensitive data)
      const usePolling = !validatedConfig.LTCG_CALLBACK_URL;
      logger.info(
        {
          hasApiKey: !!validatedConfig.LTCG_API_KEY,
          hasCallbackUrl: !!validatedConfig.LTCG_CALLBACK_URL,
          autoMatchmaking: validatedConfig.LTCG_AUTO_MATCHMAKING,
          realtimeMode: usePolling ? "polling" : "webhooks",
        },
        "LTCG plugin configured"
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages =
          error.issues?.map((e) => e.message)?.join(", ") || "Unknown validation error";
        throw new Error(`Invalid LTCG plugin configuration: ${errorMessages}`);
      }
      throw new Error(
        `Invalid LTCG plugin configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  routes: [
    // Health check endpoint
    {
      name: "ltcg-health",
      path: "/health",
      type: "GET" as const,
      handler: async (_req: RouteRequest, res: RouteResponse) => {
        res.json({
          status: "ok",
          plugin: "ltcg",
          version: "1.0.0",
          timestamp: Date.now(),
        });
      },
    },
    // Webhook routes for real-time game events
    ...webhookRoutes,
    // Panel API routes for UI dashboards
    ...panelRoutes,
    // External control API routes
    ...controlRoutes,
  ],
  events: ltcgEvents,
  // Services for autonomous gameplay:
  // - TurnOrchestrator: Makes LLM-driven gameplay decisions
  // - LTCGPollingService: Polls for updates when no webhook URL is configured
  // - StateAggregator: Aggregates service state for panel APIs
  services: [TurnOrchestrator, LTCGPollingService, StateAggregator],
  actions: ltcgActions,
  providers: ltcgProviders,
  evaluators: ltcgEvaluators,
  // UI panels for agent monitoring and analytics
  panels,
};

export default plugin;
