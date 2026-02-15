/**
 * Config Provider
 *
 * Provides current game configuration settings including:
 * - Economy settings (wager percentages, fees)
 * - Progression settings (XP rewards, level thresholds)
 * - Competitive settings (ELO parameters)
 * - Social settings (chat, friends)
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";

export const configProvider: Provider = {
  name: "LTCG_CONFIG",
  description:
    "Provides current game configuration settings for economy, progression, competitive, and social features",

  async get(runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> {
    try {
      // Get API credentials from runtime settings
      const apiKey = runtime.getSetting("LTCG_API_KEY");
      const apiUrl = runtime.getSetting("LTCG_API_URL");

      if (!apiKey || !apiUrl) {
        return {
          text: "LTCG API credentials not configured. Please set LTCG_API_KEY and LTCG_API_URL.",
          values: { error: "MISSING_CONFIG" },
          data: undefined,
        };
      }

      // Create API client
      const client = new LTCGApiClient({
        apiKey: apiKey as string,
        baseUrl: apiUrl as string,
      });

      // Fetch game configuration
      const config = await client.getGameConfig();

      // Format as human-readable text
      const text = formatConfigText(config);

      // Structured values for template substitution
      const values = {
        configFetched: true,
        configKeys: Object.keys(config),
        timestamp: Date.now(),
      };

      // Structured data for programmatic access
      const data = {
        config,
        raw: config,
      };

      return { text, values, data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error fetching game config";

      return {
        text: `Error fetching game config: ${errorMessage}`,
        values: { error: "FETCH_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};

/**
 * Format configuration as human-readable text
 */
function formatConfigText(config: Record<string, unknown>): string {
  const sections: string[] = ["Game Configuration:"];

  // Format each top-level section
  for (const [key, value] of Object.entries(config)) {
    sections.push(`\n**${capitalizeSection(key)}:**`);

    if (typeof value === "object" && value !== null) {
      sections.push(formatObjectRecursive(value as Record<string, unknown>, 1));
    } else {
      sections.push(`  ${formatValue(value)}`);
    }
  }

  return sections.join("\n");
}

/**
 * Recursively format nested configuration objects
 */
function formatObjectRecursive(obj: Record<string, unknown>, indent: number): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      lines.push(`${prefix}${capitalizeKey(key)}:`);
      lines.push(formatObjectRecursive(value as Record<string, unknown>, indent + 1));
    } else {
      lines.push(`${prefix}${capitalizeKey(key)}: ${formatValue(value)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  return JSON.stringify(value);
}

/**
 * Capitalize section names (e.g., "economy" -> "Economy")
 */
function capitalizeSection(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Capitalize keys with special handling for abbreviations
 */
function capitalizeKey(key: string): string {
  // Special cases
  const specialCases: Record<string, string> = {
    xp: "XP",
    elo: "ELO",
    lp: "LP",
    api: "API",
    url: "URL",
  };

  const lower = key.toLowerCase();
  if (specialCases[lower]) return specialCases[lower];

  // Convert camelCase or snake_case to Title Case
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
