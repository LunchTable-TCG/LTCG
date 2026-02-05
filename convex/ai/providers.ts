/**
 * AI Model Provider Configuration
 *
 * Centralized configuration for AI providers using:
 * - OpenRouter: Primary provider with 400+ models and automatic fallbacks
 * - Vercel AI Gateway: Fallback provider with unified access to major providers
 *
 * API Key Sources (checked in order):
 * 1. Database (systemConfig table) - set via admin panel
 * 2. Environment variables - OPENROUTER_API_KEY, AI_GATEWAY_API_KEY
 *
 * Usage:
 * - Use `getLanguageModel()` to get the configured language model
 * - Use `getEmbeddingModel()` to get the configured embedding model
 * - Models can be overridden by passing specific model IDs
 */

import { createGateway } from "@ai-sdk/gateway";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// =============================================================================
// API Key Cache (populated from database on first use)
// =============================================================================

// Cache for database API keys (set by setDatabaseApiKeys)
let cachedOpenRouterKey: string | undefined;
let cachedGatewayKey: string | undefined;

/**
 * Set API keys from database (called by admin agent before use)
 */
export function setDatabaseApiKeys(keys: { openrouter?: string; gateway?: string }) {
  if (keys.openrouter) cachedOpenRouterKey = keys.openrouter;
  if (keys.gateway) cachedGatewayKey = keys.gateway;
}

/**
 * Get the effective OpenRouter API key (database first, then env var)
 */
function getOpenRouterApiKey(): string | undefined {
  return cachedOpenRouterKey || process.env["OPENROUTER_API_KEY"];
}

/**
 * Get the effective Gateway API key (database first, then env var)
 */
function getGatewayApiKey(): string | undefined {
  return cachedGatewayKey || process.env["AI_GATEWAY_API_KEY"];
}

// =============================================================================
// Provider Factories (create fresh instances with current keys)
// =============================================================================

/**
 * Create OpenRouter provider instance with current API key
 */
export function createOpenRouterProvider() {
  const apiKey = getOpenRouterApiKey();
  return createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": process.env["APP_URL"] || "https://ltcg.app",
      "X-Title": "LTCG Admin",
    },
  });
}

/**
 * Create Vercel AI Gateway provider instance with current API key
 */
export function createGatewayProvider() {
  const apiKey = getGatewayApiKey();
  return createGateway({ apiKey });
}

// Legacy exports for backwards compatibility (uses env vars only)
export const openrouter = createOpenRouterProvider();
export const gateway = createGatewayProvider();

// =============================================================================
// Model Configurations
// =============================================================================

/**
 * Available language models by use case
 *
 * Each model is available through OpenRouter and Vercel AI Gateway
 */
export const LANGUAGE_MODELS = {
  // Fast, cost-effective models for simple tasks
  fast: {
    openrouter: "openai/gpt-4o-mini",
    gateway: "openai/gpt-4o-mini",
  },
  // Balanced models for general use
  balanced: {
    openrouter: "anthropic/claude-3.5-sonnet",
    gateway: "anthropic/claude-sonnet-4",
  },
  // Most capable models for complex tasks
  powerful: {
    openrouter: "anthropic/claude-3.5-sonnet",
    gateway: "anthropic/claude-sonnet-4",
  },
  // Reasoning-focused models
  reasoning: {
    openrouter: "openai/o1-mini",
    gateway: "openai/o1-mini",
  },
  // Long context models (128k+ tokens)
  longContext: {
    openrouter: "anthropic/claude-3.5-sonnet",
    gateway: "anthropic/claude-sonnet-4",
  },
} as const;

/**
 * Available embedding models
 */
export const EMBEDDING_MODELS = {
  // Small embedding model (1536 dimensions)
  small: {
    openrouter: "openai/text-embedding-3-small",
    gateway: "openai/text-embedding-3-small",
  },
  // Large embedding model (3072 dimensions)
  large: {
    openrouter: "openai/text-embedding-3-large",
    gateway: "openai/text-embedding-3-large",
  },
} as const;

// =============================================================================
// Provider Selection
// =============================================================================

type Provider = "openrouter" | "gateway";
type ModelTier = keyof typeof LANGUAGE_MODELS;
type EmbeddingTier = keyof typeof EMBEDDING_MODELS;

/**
 * Get the preferred provider based on available API keys
 * Checks database keys first, then environment variables
 */
export function getPreferredProvider(): Provider {
  // Check OpenRouter first (most models, best fallback support)
  if (getOpenRouterApiKey()) {
    return "openrouter";
  }
  // Fall back to Vercel AI Gateway
  if (getGatewayApiKey()) {
    return "gateway";
  }
  // Default to openrouter (will fail gracefully if no key)
  return "openrouter";
}

/**
 * Get a language model instance based on tier and provider preference
 * Creates a fresh provider instance to pick up any database-stored API keys
 *
 * @param tier - Model capability tier (fast, balanced, powerful, reasoning, longContext)
 * @param provider - Optional provider override
 * @returns Language model instance
 *
 * @example
 * // Get the default balanced model
 * const model = getLanguageModel("balanced");
 *
 * // Force OpenRouter provider
 * const model = getLanguageModel("fast", "openrouter");
 */
export function getLanguageModel(tier: ModelTier = "balanced", provider?: Provider) {
  const selectedProvider = provider || getPreferredProvider();
  const modelConfig = LANGUAGE_MODELS[tier];

  if (selectedProvider === "gateway") {
    return createGatewayProvider().languageModel(modelConfig.gateway);
  }
  return createOpenRouterProvider().chat(modelConfig.openrouter);
}

/**
 * Get an embedding model instance
 * Creates a fresh provider instance to pick up any database-stored API keys
 *
 * @param tier - Embedding size tier (small, large)
 * @param provider - Optional provider override
 * @returns Embedding model instance
 *
 * @example
 * const embedder = getEmbeddingModel("small");
 */
export function getEmbeddingModel(tier: EmbeddingTier = "small", provider?: Provider) {
  const selectedProvider = provider || getPreferredProvider();
  const modelConfig = EMBEDDING_MODELS[tier];

  if (selectedProvider === "gateway") {
    return createGatewayProvider().textEmbeddingModel(modelConfig.gateway);
  }
  return createOpenRouterProvider().embedding(modelConfig.openrouter);
}

// =============================================================================
// Specialized Model Getters
// =============================================================================

/**
 * Get a model for the Admin Agent (balanced capability)
 */
export function getAdminAgentModel() {
  return getLanguageModel("balanced");
}

/**
 * Get a fast model for simple completions
 */
export function getFastModel() {
  return getLanguageModel("fast");
}

/**
 * Get the most powerful available model
 */
export function getPowerfulModel() {
  return getLanguageModel("powerful");
}

/**
 * Get a reasoning-focused model for complex analysis
 */
export function getReasoningModel() {
  return getLanguageModel("reasoning");
}

/**
 * Get the standard embedding model (1536 dimensions)
 */
export function getStandardEmbeddingModel() {
  return getEmbeddingModel("small");
}

// =============================================================================
// OpenRouter-Specific Features
// =============================================================================

/**
 * OpenRouter model IDs for specific use cases
 * These can be used directly with openrouter.chat()
 */
export const OPENROUTER_MODELS = {
  // Anthropic
  claude35Sonnet: "anthropic/claude-3.5-sonnet",
  claude3Opus: "anthropic/claude-3-opus",
  claude3Haiku: "anthropic/claude-3-haiku",

  // OpenAI
  gpt4o: "openai/gpt-4o",
  gpt4oMini: "openai/gpt-4o-mini",
  o1Mini: "openai/o1-mini",
  o1: "openai/o1",

  // Google
  gemini2Flash: "google/gemini-2.0-flash",
  geminiPro: "google/gemini-pro",

  // Meta
  llama370b: "meta-llama/llama-3.3-70b-instruct",
  llama38b: "meta-llama/llama-3.1-8b-instruct",

  // Mistral
  mistralLarge: "mistralai/mistral-large",
  mixtral8x7b: "mistralai/mixtral-8x7b-instruct",

  // DeepSeek (cost-effective)
  deepseekChat: "deepseek/deepseek-chat",
  deepseekCoder: "deepseek/deepseek-coder",

  // Free tier models (rate limited)
  free: {
    llama: "meta-llama/llama-3.1-8b-instruct:free",
    gemma: "google/gemma-2-9b-it:free",
  },
} as const;

/**
 * Get an OpenRouter model with fallbacks
 *
 * OpenRouter supports automatic fallbacks via the `route` parameter.
 * When the primary model is unavailable, it will try fallbacks in order.
 *
 * @param primary - Primary model to use
 * @param _fallbacks - Fallback models (reserved for future OpenRouter routing)
 * @returns OpenRouter model instance
 *
 * @example
 * const model = getOpenRouterWithFallbacks(
 *   "anthropic/claude-3.5-sonnet",
 *   ["openai/gpt-4o", "google/gemini-2.0-flash"]
 * );
 */
export function getOpenRouterWithFallbacks(primary: string, _fallbacks: string[] = []) {
  // OpenRouter handles fallbacks via the models array in provider options
  // This returns the primary model - fallbacks are handled at request time
  // TODO: Implement fallback routing when OpenRouter SDK supports it
  return openrouter.chat(primary);
}

// =============================================================================
// Provider Status
// =============================================================================

/**
 * Check which providers are configured with API keys
 */
export function getProviderStatus() {
  return {
    openrouter: !!process.env["OPENROUTER_API_KEY"],
    gateway: !!process.env["AI_GATEWAY_API_KEY"],
    preferred: getPreferredProvider(),
  };
}
