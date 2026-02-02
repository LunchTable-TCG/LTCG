/**
 * Safe JSON Parsing Utility
 *
 * Wraps JSON.parse with error handling for LLM responses.
 */

import { logger } from "@elizaos/core";

/**
 * Safely parse JSON string with fallback value
 *
 * @param json - The JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @param context - Optional context for error logging
 * @returns Parsed value or fallback
 */
export function safeParseJson<T>(json: string, fallback: T, context?: string): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    logger.error(
      {
        error,
        json: json.substring(0, 200),
        context,
      },
      "Failed to parse JSON"
    );
    return fallback;
  }
}

/**
 * Attempt to extract JSON from a potentially malformed LLM response
 *
 * LLMs sometimes wrap JSON in markdown code blocks or add extra text.
 * This function attempts to extract valid JSON from such responses.
 *
 * @param response - The raw LLM response string
 * @param fallback - Value to return if extraction/parsing fails
 * @returns Parsed value or fallback
 */
export function extractJsonFromLlmResponse<T>(response: string, fallback: T): T {
  // Try direct parse first
  try {
    return JSON.parse(response);
  } catch {
    // Continue to extraction attempts
  }

  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to next attempt
    }
  }

  // Try to find JSON object/array in response
  const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Fall through to return fallback
    }
  }

  logger.warn(
    { response: response.substring(0, 200) },
    "Could not extract valid JSON from LLM response"
  );
  return fallback;
}
