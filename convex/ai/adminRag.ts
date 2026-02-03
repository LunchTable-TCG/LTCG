/**
 * Admin RAG Configuration
 *
 * Configures the RAG (Retrieval-Augmented Generation) system for the Admin Assistant.
 * Used to store and retrieve admin knowledge base documents including:
 * - Game rules and policies
 * - Moderation guidelines
 * - FAQ and troubleshooting guides
 * - Historical incident reports
 *
 * Uses centralized provider configuration for embedding models.
 */

import { RAG } from "@convex-dev/rag";
import { components } from "../_generated/api";
import { getStandardEmbeddingModel } from "./providers";

// =============================================================================
// Filter Types
// =============================================================================

/**
 * Document categories for filtering RAG searches
 */
export type AdminDocCategory =
  | "moderation" // Moderation policies and guidelines
  | "game_rules" // Game mechanics and rules
  | "faq" // Frequently asked questions
  | "incidents" // Historical incident reports
  | "announcements" // System announcements and updates
  | "procedures"; // Admin procedures and workflows

/**
 * Document types for filtering RAG searches
 */
export type AdminDocType =
  | "policy" // Official policy documents
  | "guide" // How-to guides
  | "reference" // Reference material
  | "report" // Reports and summaries
  | "template"; // Response templates

// =============================================================================
// RAG Instance
// =============================================================================

/**
 * Admin knowledge base RAG instance
 *
 * Configured with filters for document category and type to enable
 * targeted searches within specific document sets.
 *
 * Uses OpenAI text-embedding-3-small (1536 dimensions) via centralized config.
 */
export const adminRag = new RAG(components.rag, {
  textEmbeddingModel: getStandardEmbeddingModel(),
  embeddingDimension: 1536,
  filterNames: ["category", "docType"],
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Search the admin knowledge base
 *
 * @param ctx - Convex action context
 * @param query - Search query text
 * @param options - Search options including filters
 * @returns Array of matching document chunks with context
 */
export async function searchAdminKnowledge(
  ctx: Parameters<typeof adminRag.search>[0],
  query: string,
  options?: {
    category?: AdminDocCategory;
    docType?: AdminDocType;
    limit?: number;
  }
) {
  const filters: Array<{ name: string; value: string }> = [];

  if (options?.category) {
    filters.push({ name: "category", value: options.category });
  }
  if (options?.docType) {
    filters.push({ name: "docType", value: options.docType });
  }

  return adminRag.search(ctx, {
    namespace: "admin",
    query,
    filters: filters.length > 0 ? filters : undefined,
    limit: options?.limit ?? 5,
    chunkContext: { before: 1, after: 1 },
  });
}

/**
 * Add a document to the admin knowledge base
 *
 * @param ctx - Convex mutation context
 * @param document - Document to add
 */
export async function addAdminDocument(
  ctx: Parameters<typeof adminRag.add>[0],
  document: {
    title: string;
    content: string;
    category: AdminDocCategory;
    docType: AdminDocType;
    key?: string;
  }
) {
  return adminRag.add(ctx, {
    namespace: "admin",
    text: document.content,
    title: document.title,
    key: document.key ?? `${document.category}/${document.title}`,
    filterValues: [
      { name: "category", value: document.category },
      { name: "docType", value: document.docType },
    ],
    metadata: {
      category: document.category,
      docType: document.docType,
      addedAt: Date.now(),
    },
  });
}

// =============================================================================
// Default Knowledge Base Content
// =============================================================================

/**
 * Default moderation guidelines to seed the knowledge base
 */
export const DEFAULT_MODERATION_GUIDELINES = `
# LTCG Moderation Guidelines

## Warning Thresholds
- First offense (minor): Verbal warning via in-game message
- Second offense: 24-hour chat restriction
- Third offense: 7-day suspension
- Fourth offense: Permanent ban consideration

## Offense Categories

### Minor Offenses
- Mild profanity
- Spam (non-malicious)
- Minor harassment
- Inappropriate username (first occurrence)

### Moderate Offenses
- Targeted harassment
- Hate speech (isolated incident)
- Scam attempts
- Exploiting bugs (without reporting)
- Intentional game throwing (ranked)

### Severe Offenses
- Repeated hate speech
- Doxxing or threats
- Coordinated harassment
- RMT (real money trading)
- Account sharing/selling
- Hacking/cheating

## Evidence Requirements
- Screenshots of chat logs
- Match history showing suspicious patterns
- Multiple reports from different users
- Timestamped evidence

## Appeal Process
1. User submits appeal through support ticket
2. Different moderator reviews original decision
3. Decision communicated within 48 hours
4. Final appeals reviewed by admin team
`;

/**
 * Default game rules summary for admin reference
 */
export const DEFAULT_GAME_RULES = `
# LTCG Game Rules Summary

## Deck Building
- Minimum 40 cards per deck
- Maximum 3 copies of any single card
- Archetypes provide synergy bonuses

## Match Format
- Best of 1 for casual matches
- Best of 3 for ranked matches
- 60 second turn timer (30 seconds overtime bank)

## Rating System
- ELO-based rating (starts at 1000)
- K-factor: 32 for new players, 16 for established
- Seasonal resets with rewards

## Win Conditions
- Reduce opponent's life points to 0
- Opponent cannot draw (deck out)
- Special card win conditions

## Prohibited Actions
- Intentional disconnection to avoid loss
- Win trading with other players
- Using automation or bots
- Exploiting known bugs
`;
