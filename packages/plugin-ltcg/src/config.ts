/**
 * Plugin Configuration and Validation
 */

import { z } from "zod";
import { LTCG_PRODUCTION_CONFIG } from "./constants";
import type { LTCGPluginConfig, NormalizedLTCGConfig } from "./types/plugin";

/**
 * Zod schema for validating plugin configuration
 *
 * Note: LTCG_API_URL and LTCG_CONVEX_URL default to production values.
 * Users only need to provide LTCG_API_KEY. URLs can be overridden for dev/testing.
 */
export const configSchema = z.object({
  // Required - API key for authentication
  LTCG_API_KEY: z
    .string()
    .min(1, "LTCG_API_KEY is required")
    .startsWith("ltcg_", "LTCG_API_KEY must start with ltcg_"),

  // Optional - defaults to production
  LTCG_API_URL: z
    .string()
    .url("LTCG_API_URL must be a valid URL")
    .optional()
    .default(LTCG_PRODUCTION_CONFIG.API_URL),

  LTCG_CONVEX_URL: z
    .string()
    .url("LTCG_CONVEX_URL must be a valid URL")
    .refine(
      (url) => url.includes("convex"),
      "LTCG_CONVEX_URL must be a Convex deployment URL",
    )
    .optional()
    .default(LTCG_PRODUCTION_CONFIG.CONVEX_URL),

  LTCG_PLAY_STYLE: z
    .enum(["aggressive", "defensive", "control", "balanced"])
    .optional(),

  LTCG_RISK_TOLERANCE: z.enum(["low", "medium", "high"]).optional(),

  LTCG_AUTO_MATCHMAKING: z
    .union([z.boolean(), z.string().transform((val) => val === "true")])
    .optional(),

  LTCG_RANKED_MODE: z
    .union([z.boolean(), z.string().transform((val) => val === "true")])
    .optional(),

  LTCG_CHAT_ENABLED: z
    .union([z.boolean(), z.string().transform((val) => val !== "false")])
    .optional(),

  LTCG_TRASH_TALK_LEVEL: z.enum(["none", "mild", "aggressive"]).optional(),

  LTCG_RESPONSE_TIME: z
    .union([
      z.number(),
      z.string().transform((val) => Number.parseInt(val, 10)),
    ])
    .refine(
      (val) => val >= 0 && val <= 10000,
      "LTCG_RESPONSE_TIME must be between 0 and 10000ms",
    )
    .optional(),

  LTCG_MAX_CONCURRENT_GAMES: z
    .union([
      z.number(),
      z.string().transform((val) => Number.parseInt(val, 10)),
    ])
    .refine(
      (val) => val >= 1 && val <= 5,
      "LTCG_MAX_CONCURRENT_GAMES must be between 1 and 5",
    )
    .optional(),

  LTCG_PREFERRED_DECK_ID: z.string().optional(),

  LTCG_DEBUG_MODE: z
    .union([z.boolean(), z.string().transform((val) => val === "true")])
    .optional(),
});

/**
 * Default configuration values
 *
 * Note: LTCG_API_URL and LTCG_CONVEX_URL default to production URLs
 * from LTCG_PRODUCTION_CONFIG. Users only need to provide LTCG_API_KEY.
 */
export const DEFAULT_CONFIG: Omit<NormalizedLTCGConfig, "LTCG_API_KEY"> = {
  LTCG_API_URL: LTCG_PRODUCTION_CONFIG.API_URL,
  LTCG_CONVEX_URL: LTCG_PRODUCTION_CONFIG.CONVEX_URL,
  LTCG_PLAY_STYLE: "balanced",
  LTCG_RISK_TOLERANCE: "medium",
  LTCG_AUTO_MATCHMAKING: false,
  LTCG_RANKED_MODE: false,
  LTCG_CHAT_ENABLED: true,
  LTCG_TRASH_TALK_LEVEL: "mild",
  LTCG_RESPONSE_TIME: 1500,
  LTCG_MAX_CONCURRENT_GAMES: 1,
  LTCG_DEBUG_MODE: false,
};

/**
 * Validate and normalize plugin configuration
 *
 * URLs default to production values if not provided.
 * Users only need to configure LTCG_API_KEY.
 */
export function validateConfig(
  config: Record<string, unknown>,
): NormalizedLTCGConfig {
  try {
    const validated = configSchema.parse(config);

    // Apply defaults (URLs already have defaults from schema)
    const normalized: NormalizedLTCGConfig = {
      LTCG_API_KEY: validated.LTCG_API_KEY,
      LTCG_API_URL: validated.LTCG_API_URL ?? DEFAULT_CONFIG.LTCG_API_URL,
      LTCG_CONVEX_URL:
        validated.LTCG_CONVEX_URL ?? DEFAULT_CONFIG.LTCG_CONVEX_URL,
      LTCG_PLAY_STYLE:
        validated.LTCG_PLAY_STYLE ?? DEFAULT_CONFIG.LTCG_PLAY_STYLE,
      LTCG_RISK_TOLERANCE:
        validated.LTCG_RISK_TOLERANCE ?? DEFAULT_CONFIG.LTCG_RISK_TOLERANCE,
      LTCG_AUTO_MATCHMAKING:
        validated.LTCG_AUTO_MATCHMAKING ?? DEFAULT_CONFIG.LTCG_AUTO_MATCHMAKING,
      LTCG_RANKED_MODE:
        validated.LTCG_RANKED_MODE ?? DEFAULT_CONFIG.LTCG_RANKED_MODE,
      LTCG_CHAT_ENABLED:
        validated.LTCG_CHAT_ENABLED ?? DEFAULT_CONFIG.LTCG_CHAT_ENABLED,
      LTCG_TRASH_TALK_LEVEL:
        validated.LTCG_TRASH_TALK_LEVEL ?? DEFAULT_CONFIG.LTCG_TRASH_TALK_LEVEL,
      LTCG_RESPONSE_TIME:
        validated.LTCG_RESPONSE_TIME ?? DEFAULT_CONFIG.LTCG_RESPONSE_TIME,
      LTCG_MAX_CONCURRENT_GAMES:
        validated.LTCG_MAX_CONCURRENT_GAMES ??
        DEFAULT_CONFIG.LTCG_MAX_CONCURRENT_GAMES,
      LTCG_PREFERRED_DECK_ID: validated.LTCG_PREFERRED_DECK_ID,
      LTCG_DEBUG_MODE:
        validated.LTCG_DEBUG_MODE ?? DEFAULT_CONFIG.LTCG_DEBUG_MODE,
    };

    return normalized;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      throw new Error(`Invalid LTCG plugin configuration: ${errorMessages}`);
    }
    throw new Error(
      `Invalid LTCG plugin configuration: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get configuration from environment variables
 */
export function getConfigFromEnv(): Partial<LTCGPluginConfig> {
  return {
    LTCG_API_KEY: process.env.LTCG_API_KEY,
    LTCG_CONVEX_URL: process.env.LTCG_CONVEX_URL,
    LTCG_API_URL: process.env.LTCG_API_URL,
    LTCG_PLAY_STYLE: process.env.LTCG_PLAY_STYLE as
      | "aggressive"
      | "defensive"
      | "control"
      | "balanced"
      | undefined,
    LTCG_RISK_TOLERANCE: process.env.LTCG_RISK_TOLERANCE as
      | "low"
      | "medium"
      | "high"
      | undefined,
    LTCG_AUTO_MATCHMAKING: process.env.LTCG_AUTO_MATCHMAKING === "true",
    LTCG_RANKED_MODE: process.env.LTCG_RANKED_MODE === "true",
    LTCG_CHAT_ENABLED: process.env.LTCG_CHAT_ENABLED !== "false",
    LTCG_TRASH_TALK_LEVEL: process.env.LTCG_TRASH_TALK_LEVEL as
      | "none"
      | "mild"
      | "aggressive"
      | undefined,
    LTCG_RESPONSE_TIME: process.env.LTCG_RESPONSE_TIME
      ? Number.parseInt(process.env.LTCG_RESPONSE_TIME, 10)
      : undefined,
    LTCG_MAX_CONCURRENT_GAMES: process.env.LTCG_MAX_CONCURRENT_GAMES
      ? Number.parseInt(process.env.LTCG_MAX_CONCURRENT_GAMES, 10)
      : undefined,
    LTCG_PREFERRED_DECK_ID: process.env.LTCG_PREFERRED_DECK_ID,
    LTCG_DEBUG_MODE: process.env.LTCG_DEBUG_MODE === "true",
  };
}
