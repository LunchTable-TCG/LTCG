/**
 * AI Model Provider Configuration
 *
 * Centralized configuration for AI providers using:
 * - Vercel AI Gateway: Primary provider with access to OpenAI, Anthropic, Google, etc.
 * - OpenRouter: 400+ models with automatic fallbacks and model routing
 *
 * Environment Variables:
 * - AI_GATEWAY_API_KEY: Vercel AI Gateway key (or falls back to OPENAI_API_KEY)
 * - OPENROUTER_API_KEY: OpenRouter API key
 *
 * Usage:
 * - Use `getLanguageModel()` to get the configured language model
 * - Use `getEmbeddingModel()` to get the configured embedding model
 * - Models can be overridden by passing specific model IDs
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGateway } from "@ai-sdk/gateway";
import { openai } from "@ai-sdk/openai";

// =============================================================================
// Provider Instances
// =============================================================================

/**
 * OpenRouter provider instance
 * Access 400+ models through a single API with automatic fallbacks
 *
 * Model format: "provider/model-name"
 * Examples:
 * - "anthropic/claude-3.5-sonnet"
 * - "openai/gpt-4o"
 * - "google/gemini-2.0-flash"
 * - "meta-llama/llama-3.3-70b-instruct"
 */
export const openrouter = createOpenRouter({
  apiKey: process.env["OPENROUTER_API_KEY"],
  headers: {
    "HTTP-Referer": process.env["APP_URL"] || "https://ltcg.app",
    "X-Title": "LTCG Admin",
  },
});

/**
 * Vercel AI Gateway provider instance
 * Unified access to major providers with Vercel's infrastructure
 *
 * Model format: "provider/model-name"
 * Examples:
 * - "openai/gpt-4o"
 * - "anthropic/claude-sonnet-4"
 * - "google/gemini-2.0-flash"
 */
export const gateway = createGateway({
  apiKey: process.env["AI_GATEWAY_API_KEY"] || process.env["OPENAI_API_KEY"],
});

// =============================================================================
// Model Configurations
// =============================================================================

/**
 * Available language models by use case
 *
 * Each model is available through multiple providers for redundancy
 */
export const LANGUAGE_MODELS = {
  // Fast, cost-effective models for simple tasks
  fast: {
    openrouter: "openai/gpt-4o-mini",
    gateway: "openai/gpt-4o-mini",
    openai: "gpt-4o-mini",
  },
  // Balanced models for general use
  balanced: {
    openrouter: "anthropic/claude-3.5-sonnet",
    gateway: "anthropic/claude-sonnet-4",
    openai: "gpt-4o",
  },
  // Most capable models for complex tasks
  powerful: {
    openrouter: "anthropic/claude-3.5-sonnet",
    gateway: "anthropic/claude-sonnet-4",
    openai: "gpt-4o",
  },
  // Reasoning-focused models
  reasoning: {
    openrouter: "openai/o1-mini",
    gateway: "openai/o1-mini",
    openai: "o1-mini",
  },
  // Long context models (128k+ tokens)
  longContext: {
    openrouter: "anthropic/claude-3.5-sonnet",
    gateway: "anthropic/claude-sonnet-4",
    openai: "gpt-4o",
  },
} as const;

/**
 * Available embedding models
 */
export const EMBEDDING_MODELS = {
  // OpenAI's latest small embedding model (1536 dimensions)
  small: {
    openai: "text-embedding-3-small",
    openrouter: "openai/text-embedding-3-small",
  },
  // OpenAI's large embedding model (3072 dimensions)
  large: {
    openai: "text-embedding-3-large",
    openrouter: "openai/text-embedding-3-large",
  },
} as const;

// =============================================================================
// Provider Selection
// =============================================================================

type Provider = "openrouter" | "gateway" | "openai";
type ModelTier = keyof typeof LANGUAGE_MODELS;
type EmbeddingTier = keyof typeof EMBEDDING_MODELS;

/**
 * Get the preferred provider based on environment configuration
 * Falls back through providers if API keys are missing
 */
export function getPreferredProvider(): Provider {
  // Check OpenRouter first (most models, best fallback support)
  if (process.env["OPENROUTER_API_KEY"]) {
    return "openrouter";
  }
  // Then Vercel AI Gateway
  if (process.env["AI_GATEWAY_API_KEY"]) {
    return "gateway";
  }
  // Finally direct OpenAI
  if (process.env["OPENAI_API_KEY"]) {
    return "openai";
  }
  // Default to openrouter (will fail gracefully if no key)
  return "openrouter";
}

/**
 * Get a language model instance based on tier and provider preference
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
export function getLanguageModel(
  tier: ModelTier = "balanced",
  provider?: Provider
) {
  const selectedProvider = provider || getPreferredProvider();
  const modelConfig = LANGUAGE_MODELS[tier];

  switch (selectedProvider) {
    case "openrouter":
      return openrouter.chat(modelConfig.openrouter);
    case "gateway":
      return gateway.languageModel(modelConfig.gateway);
    case "openai":
    default:
      return openai.chat(modelConfig.openai);
  }
}

/**
 * Get an embedding model instance
 *
 * @param tier - Embedding size tier (small, large)
 * @param provider - Optional provider override (openai or openrouter)
 * @returns Embedding model instance
 *
 * @example
 * const embedder = getEmbeddingModel("small");
 */
export function getEmbeddingModel(
  tier: EmbeddingTier = "small",
  provider?: "openai" | "openrouter"
) {
  const modelConfig = EMBEDDING_MODELS[tier];

  // Prefer OpenAI for embeddings (most reliable)
  if (provider === "openrouter" && process.env["OPENROUTER_API_KEY"]) {
    return openrouter.embedding(modelConfig.openrouter);
  }

  // Default to OpenAI embeddings
  return openai.embedding(modelConfig.openai);
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
export function getOpenRouterWithFallbacks(
  primary: string,
  _fallbacks: string[] = []
) {
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
    openai: !!process.env["OPENAI_API_KEY"],
    preferred: getPreferredProvider(),
  };
}
