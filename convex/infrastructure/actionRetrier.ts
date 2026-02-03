/**
 * Action Retrier Configuration
 *
 * Provides automatic retry logic for actions that fail due to transient errors
 * (network issues, server restarts, 3rd party API failures).
 *
 * Features:
 * - Exponential backoff with configurable parameters
 * - Idempotent retry guarantees
 * - Automatic cleanup of completed runs after 7 days
 */

import { ActionRetrier } from "@convex-dev/action-retrier";
import { components } from "../_generated/api";

/**
 * Type assertion required: components.actionRetrier may not be in generated types yet
 * The actionRetrier component is properly configured in convex.config.ts
 */
// biome-ignore lint/suspicious/noExplicitAny: Convex component type workaround
const actionRetrierComponent = (components as any).actionRetrier;

/**
 * Initialize the ActionRetrier component
 */
export const actionRetrier = new ActionRetrier(actionRetrierComponent);

/**
 * Retry Configurations for Different API Types
 *
 * Each configuration defines:
 * - maxFailures: Maximum number of retry attempts
 * - initialBackoffMs: Initial delay before first retry (ms)
 * - base: Exponential backoff multiplier
 *
 * Backoff formula: delay = initialBackoffMs * (base ^ attemptNumber)
 */
export const RetryConfig = {
  /**
   * Email Service Retries
   *
   * Total attempts: 5 (1 initial + 4 retries)
   * Backoff sequence: 500ms, 1s, 2s, 4s
   * Max total delay: ~7.5s
   *
   * Use for: Resend API, transactional emails
   */
  email: {
    maxFailures: 4,
    initialBackoffMs: 500,
    base: 2,
  },

  /**
   * Webhook Retries
   *
   * Total attempts: 4 (1 initial + 3 retries)
   * Backoff sequence: 250ms, 500ms, 1s
   * Max total delay: ~1.75s
   *
   * Use for: Discord webhooks, Slack notifications
   */
  webhook: {
    maxFailures: 3,
    initialBackoffMs: 250,
    base: 2,
  },

  /**
   * Solana RPC Retries
   *
   * Total attempts: 6 (1 initial + 5 retries)
   * Backoff sequence: 150ms, 300ms, 600ms, 1.2s, 2.4s
   * Max total delay: ~4.65s
   *
   * Use for: RPC calls, transaction building, balance queries
   */
  solanaRpc: {
    maxFailures: 5,
    initialBackoffMs: 150,
    base: 2,
  },

  /**
   * AI Provider Retries
   *
   * Total attempts: 5 (1 initial + 4 retries)
   * Backoff sequence: 1s, 2s, 4s, 8s
   * Max total delay: ~15s
   *
   * Use for: OpenAI, Anthropic, other LLM APIs
   */
  aiProvider: {
    maxFailures: 4,
    initialBackoffMs: 1000,
    base: 2,
  },
} as const;
