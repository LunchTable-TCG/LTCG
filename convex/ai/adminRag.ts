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
  | "procedures" // Admin procedures and workflows
  | "player_behavior" // Player behavior patterns and analytics
  | "common_issues" // Common technical and gameplay issues
  | "policy_changes" // Historical policy changes and updates
  | "best_practices" // Admin best practices and recommendations
  | "troubleshooting"; // Technical troubleshooting guides

/**
 * Document types for filtering RAG searches
 */
export type AdminDocType =
  | "policy" // Official policy documents
  | "guide" // How-to guides
  | "reference" // Reference material
  | "report" // Reports and summaries
  | "template" // Response templates
  | "analysis" // Data analysis and insights
  | "changelog" // Change logs and version history
  | "runbook"; // Operational runbooks

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

/**
 * Player behavior patterns documentation
 */
export const DEFAULT_PLAYER_BEHAVIOR_PATTERNS = `
# Player Behavior Patterns

## Common Abuse Patterns

### Win Trading
- **Indicators**: Repeated matches between same players with alternating wins
- **Detection**: >5 matches between same 2 players in 24h with 50/50 win rate
- **Action**: Investigate match history, ban if confirmed

### Rating Manipulation
- **Indicators**: Sudden rating spikes, unusual win streaks against low-rated players
- **Detection**: >100 rating gain in <1 hour, >15 win streak
- **Action**: Review matches, temporary rating freeze pending investigation

### Marketplace Manipulation
- **Indicators**: Rapid buy/sell of same cards, price manipulation
- **Detection**: >10 listings/delistings of same card in 1 hour
- **Action**: Marketplace cooldown, investigation for coordinated manipulation

### Account Farming
- **Indicators**: Multiple accounts from same IP, similar behavior patterns
- **Detection**: >3 accounts same IP, similar play times, resource transfers
- **Action**: Link accounts, ban if confirmed farming

## Healthy Player Patterns

### Active Engagement
- Daily logins with varied activities (PvP, story, marketplace)
- Gradual rating improvement over time
- Social interactions (friends, guilds, chat)

### Casual Players
- Irregular login patterns (weekends/evenings)
- Focus on story mode and casual matches
- Lower marketplace activity

### Competitive Players
- High ranked match frequency
- Tournament participation
- Active marketplace trading
- Deck optimization (frequent deck edits)
`;

/**
 * Common issues documentation
 */
export const DEFAULT_COMMON_ISSUES = `
# Common Technical and Gameplay Issues

## Technical Issues

### Connection Problems
- **Symptom**: Players disconnecting mid-match
- **Causes**: Network instability, server issues, client timeouts
- **Resolution**: Check server status, advise player to check connection, offer rematch if unfair loss

### Card Display Bugs
- **Symptom**: Cards showing incorrect stats or images
- **Causes**: Cache issues, database sync lag
- **Resolution**: Advise hard refresh (Ctrl+F5), clear browser cache, report to dev team

### Transaction Failures
- **Symptom**: Gold/gems deducted but items not received
- **Causes**: Race conditions, payment gateway issues
- **Resolution**: Check transaction logs, manual refund if confirmed, escalate to dev team

## Gameplay Issues

### Matchmaking Imbalance
- **Symptom**: Players matched against much higher/lower rated opponents
- **Causes**: Small player pool at rating extremes, time of day
- **Resolution**: Explain matchmaking algorithm, adjust if queue time >5 minutes

### Card Interactions
- **Symptom**: Players confused about card effect priority
- **Causes**: Complex chain resolution, unclear card text
- **Resolution**: Explain game rules (FIFO for triggers), refer to game rules doc

### Tournament No-Shows
- **Symptom**: Players not checking in for tournaments
- **Causes**: Time zone confusion, notification issues
- **Resolution**: Check notification settings, clarify tournament times, manual check-in if within grace period
`;

/**
 * Policy changes documentation
 */
export const DEFAULT_POLICY_CHANGES = `
# Policy Change History

## Recent Changes (Last 90 Days)

### 2026-01 - Marketplace Fee Adjustment
- **Old Policy**: 5% platform fee on all sales
- **New Policy**: 10% platform fee, with 5% going to treasury
- **Reason**: Game economy sustainability, fund tournaments and events
- **Impact**: Slight price increases on marketplace listings

### 2026-01 - Ranked Ladder Reset
- **Old Policy**: No seasonal resets
- **New Policy**: Quarterly ladder resets with rewards
- **Reason**: Keep competitive scene fresh, reward consistent play
- **Impact**: All players start at 1000 rating each season

### 2025-12 - Chat Moderation Enhancement
- **Old Policy**: Manual moderation only
- **New Policy**: Automated profanity filter + manual review
- **Reason**: Improve response time for chat violations
- **Impact**: Faster moderation, fewer manual reports needed

## Upcoming Changes (Next 30 Days)

### Tournament Entry Limits
- **Current**: No limit on tournament entries
- **Planned**: Max 3 active tournament entries per player
- **Reason**: Prevent tournament hoarding, improve fill rates
- **Expected Impact**: Faster tournament starts, better player distribution
`;

/**
 * Best practices documentation
 */
export const DEFAULT_ADMIN_BEST_PRACTICES = `
# Admin Best Practices

## Moderation Principles

### Be Fair and Consistent
- Apply rules equally to all players regardless of status
- Document all actions in audit log with clear reasoning
- Always review evidence before taking action

### Communicate Clearly
- Explain reasons for moderation actions
- Use templates for common situations
- Provide path for appeal in all decisions

### Escalate When Uncertain
- Don't guess on edge cases - ask senior admin
- Coordinate with team on policy-affecting decisions
- Document new scenarios for future reference

## Investigation Workflow

1. **Gather Evidence**: Collect all relevant data (chat logs, match history, reports)
2. **Verify Facts**: Cross-reference multiple sources, check for false reports
3. **Apply Policy**: Match evidence to specific policy violations
4. **Take Action**: Use minimum necessary intervention first
5. **Document**: Record decision reasoning in audit log
6. **Follow Up**: Monitor player behavior post-action

## Common Mistakes to Avoid

- Acting on single report without verification
- Applying permanent ban without warning progression
- Making exceptions for "VIP" or known players
- Ignoring context (player provoked, mutual harassment)
- Failing to document actions properly
`;

/**
 * Troubleshooting guide
 */
export const DEFAULT_TROUBLESHOOTING_GUIDE = `
# Technical Troubleshooting Guide

## Player Account Issues

### Cannot Login
1. Verify email/username is correct
2. Check account status (not banned/suspended)
3. Test password reset flow
4. Check for database sync issues
5. Escalate to dev team if no resolution

### Missing Purchases
1. Check transaction logs (currencyTransactions table)
2. Verify payment gateway webhook received
3. Check for failed webhook processing
4. Manual credit if payment confirmed but items not received
5. Refund if payment failed but charge went through

### Lost Progress
1. Check database for account records
2. Review backup/sync logs
3. Verify last successful save timestamp
4. Restore from backup if within 7 days
5. Manual compensation if data unrecoverable

## Game System Issues

### Matchmaking Not Working
1. Check player queue entries (matchmakingQueue table)
2. Verify cron job is running (matchmaking findMatches)
3. Check for errors in cron logs
4. Restart matchmaking cron if stuck
5. Alert dev team if persistent issue

### Leaderboard Not Updating
1. Check aggregate component status
2. Verify leaderboard snapshot refresh cron
3. Force refresh via internal mutation
4. Check for aggregate index errors
5. Rebuild aggregates if corrupted

### Tournament Stuck
1. Check tournament status and current round
2. Verify all matches have results
3. Look for orphaned match records
4. Manual match result entry if confirmed
5. Tournament reset as last resort (with refunds)
`;
