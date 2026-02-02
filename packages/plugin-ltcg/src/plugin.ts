import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type ActionResult,
  type Content,
  type GenerateTextParams,
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
} from '@elizaos/core';

// Re-export core types for plugin consumers
export type {
  Action,
  ActionResult,
  Content,
  GenerateTextParams,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
};
export { ModelType, Service };
import { z } from 'zod';

// Import LTCG actions, providers, and evaluators
import { ltcgActions } from './actions';
import { ltcgProviders } from './providers';
import { ltcgEvaluators } from './evaluators';
import { webhookRoutes } from './webhooks';
import { panelRoutes } from './api/routes';
import { LTCGPollingService } from './services/LTCGPollingService';
import { TurnOrchestrator } from './services/TurnOrchestrator';
import { StateAggregator } from './services/StateAggregator';
import { panels } from './frontend';

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
    .min(1, 'LTCG_API_KEY is required for authentication')
    .optional()
    .transform((val) => {
      if (!val) {
        console.warn('Warning: LTCG_API_KEY is not provided - agent will not be able to play games');
      }
      return val;
    }),
  LTCG_API_URL: z
    .string()
    .url('LTCG_API_URL must be a valid URL')
    .optional(),
  LTCG_CALLBACK_URL: z
    .string()
    .url('LTCG_CALLBACK_URL must be a valid URL for receiving webhooks')
    .optional()
    .transform((val) => {
      if (!val) {
        console.warn('Warning: LTCG_CALLBACK_URL not provided - using polling fallback for game updates');
      }
      return val;
    }),
  LTCG_WEBHOOK_SECRET: z
    .string()
    .min(16, 'LTCG_WEBHOOK_SECRET should be at least 16 characters')
    .optional(),
  LTCG_AUTO_MATCHMAKING: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  LTCG_DEBUG_MODE: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

const plugin: Plugin & { panels?: any } = {
  name: 'ltcg',
  description: 'LTCG card game plugin - enables AI agents to play the Legendary Trading Card Game with full gameplay capabilities, real-time updates, and customizable personalities',
  // Set lowest priority so real models take precedence
  priority: -1000,
  config: {
    LTCG_API_KEY: process.env.LTCG_API_KEY,
    LTCG_API_URL: process.env.LTCG_API_URL,
    LTCG_CALLBACK_URL: process.env.LTCG_CALLBACK_URL,
    LTCG_WEBHOOK_SECRET: process.env.LTCG_WEBHOOK_SECRET,
    LTCG_AUTO_MATCHMAKING: process.env.LTCG_AUTO_MATCHMAKING,
    LTCG_DEBUG_MODE: process.env.LTCG_DEBUG_MODE,
  },
  async init(config: Record<string, string>) {
    logger.info('*** Initializing LTCG plugin ***');
    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value !== undefined) process.env[key] = String(value);
      }

      // Log configuration status (without sensitive data)
      const usePolling = !validatedConfig.LTCG_CALLBACK_URL;
      logger.info({
        hasApiKey: !!validatedConfig.LTCG_API_KEY,
        hasCallbackUrl: !!validatedConfig.LTCG_CALLBACK_URL,
        autoMatchmaking: validatedConfig.LTCG_AUTO_MATCHMAKING,
        realtimeMode: usePolling ? 'polling' : 'webhooks',
      }, 'LTCG plugin configured');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages =
          error.issues?.map((e) => e.message)?.join(', ') || 'Unknown validation error';
        throw new Error(`Invalid LTCG plugin configuration: ${errorMessages}`);
      }
      throw new Error(
        `Invalid LTCG plugin configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  models: {
    [ModelType.TEXT_SMALL]: async (_runtime: IAgentRuntime, { prompt }: GenerateTextParams) => {
      return 'Test response for small model';
    },
    [ModelType.TEXT_LARGE]: async (_runtime: IAgentRuntime, { prompt }: GenerateTextParams) => {
      return 'Test response for large model';
    },
  },
  routes: [
    // Health check endpoint
    {
      name: 'ltcg-health',
      path: '/ltcg/health',
      type: 'GET',
      handler: async (_req: RouteRequest, res: RouteResponse) => {
        res.json({
          status: 'ok',
          plugin: 'ltcg',
          version: '1.0.0',
          timestamp: Date.now(),
        });
      },
    },
    // Webhook routes for real-time game events
    ...webhookRoutes,
    // Panel API routes for UI dashboards
    ...panelRoutes,
  ],
  events: {
    MESSAGE_RECEIVED: [
      async (params: Record<string, unknown>) => {
        logger.info('MESSAGE_RECEIVED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'MESSAGE_RECEIVED param keys');
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params: Record<string, unknown>) => {
        logger.info('VOICE_MESSAGE_RECEIVED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'VOICE_MESSAGE_RECEIVED param keys');
      },
    ],
    WORLD_CONNECTED: [
      async (params: Record<string, unknown>) => {
        logger.info('WORLD_CONNECTED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'WORLD_CONNECTED param keys');
      },
    ],
    WORLD_JOINED: [
      async (params: Record<string, unknown>) => {
        logger.info('WORLD_JOINED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'WORLD_JOINED param keys');
      },
    ],
  },
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
