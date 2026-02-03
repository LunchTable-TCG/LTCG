/**
 * AI Module Index
 *
 * Exports all AI-related functionality including the Admin Agent,
 * RAG configuration, model providers, and API endpoints.
 */

// Agent definition
export { adminAgent } from "./adminAgent";

// RAG configuration
export {
  adminRag,
  searchAdminKnowledge,
  addAdminDocument,
  DEFAULT_MODERATION_GUIDELINES,
  DEFAULT_GAME_RULES,
  type AdminDocCategory,
  type AdminDocType,
} from "./adminRag";

// Model providers (OpenRouter, Vercel AI Gateway, OpenAI)
export {
  // Provider instances
  openrouter,
  gateway,
  // Model getters
  getLanguageModel,
  getEmbeddingModel,
  getAdminAgentModel,
  getFastModel,
  getPowerfulModel,
  getReasoningModel,
  getStandardEmbeddingModel,
  // OpenRouter-specific
  getOpenRouterWithFallbacks,
  OPENROUTER_MODELS,
  // Configuration
  LANGUAGE_MODELS,
  EMBEDDING_MODELS,
  getProviderStatus,
  getPreferredProvider,
} from "./providers";

// API endpoints are exported directly from their files
// (Convex requires direct exports for query/mutation/action functions)

// Audit types
export type {
  ToolCallMetadata,
  ResponseMetadata,
  ActionMetadata,
  SessionEventMetadata,
} from "./adminAgentAudit";
