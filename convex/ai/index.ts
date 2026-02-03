/**
 * AI Module Index
 *
 * Exports all AI-related functionality including the Admin Agent,
 * RAG configuration, and API endpoints.
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

// API endpoints are exported directly from their files
// (Convex requires direct exports for query/mutation/action functions)

// Audit types
export type {
  ToolCallMetadata,
  ResponseMetadata,
  ActionMetadata,
  SessionEventMetadata,
} from "./adminAgentAudit";
