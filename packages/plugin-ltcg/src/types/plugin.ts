/**
 * Plugin Configuration Types
 */

/**
 * Configuration interface for the LTCG plugin
 * These settings control how the AI agent interacts with the LTCG game
 */
export interface LTCGPluginConfig {
  // ============================================================================
  // Required Settings
  // ============================================================================

  /**
   * API key obtained from registering an agent with LTCG
   * Format: ltcg_xxxxxxxxxxxxx
   *
   * @required
   */
  LTCG_API_KEY: string;

  /**
   * Convex deployment URL for real-time subscriptions
   * Format: https://your-deployment.convex.cloud
   *
   * @required
   */
  LTCG_CONVEX_URL: string;

  // ============================================================================
  // Optional Settings
  // ============================================================================

  /**
   * Base URL for the LTCG HTTP REST API
   * Default: inferred from LTCG_CONVEX_URL
   *
   * @optional
   * @default undefined (uses Convex URL)
   */
  LTCG_API_URL?: string;

  /**
   * Agent's preferred playstyle
   * - aggressive: Prioritizes attacking and board presence
   * - defensive: Focuses on protecting life points and controlling opponent
   * - control: Uses spells/traps to limit opponent options
   * - balanced: Mix of all strategies
   *
   * @optional
   * @default 'balanced'
   */
  LTCG_PLAY_STYLE?: 'aggressive' | 'defensive' | 'control' | 'balanced';

  /**
   * Risk tolerance for decision-making
   * - low: Conservative plays, avoids risky attacks
   * - medium: Calculated risks when advantageous
   * - high: Bold plays, willing to take chances
   *
   * @optional
   * @default 'medium'
   */
  LTCG_RISK_TOLERANCE?: 'low' | 'medium' | 'high';

  /**
   * Automatically search for and join games when idle
   *
   * @optional
   * @default false
   */
  LTCG_AUTO_MATCHMAKING?: boolean;

  /**
   * Play ranked matches instead of casual
   * Note: Ranked games affect agent's ELO rating
   *
   * @optional
   * @default false
   */
  LTCG_RANKED_MODE?: boolean;

  /**
   * Enable personality-driven chat features
   * (trash talk, reactions to plays, GG messages)
   *
   * @optional
   * @default true
   */
  LTCG_CHAT_ENABLED?: boolean;

  /**
   * Level of trash talk
   * - none: No trash talk
   * - mild: Friendly banter
   * - aggressive: Competitive trash talk
   *
   * @optional
   * @default 'mild'
   */
  LTCG_TRASH_TALK_LEVEL?: 'none' | 'mild' | 'aggressive';

  /**
   * Artificial delay between actions (milliseconds)
   * Makes the agent feel more human-like
   *
   * @optional
   * @default 1500
   */
  LTCG_RESPONSE_TIME?: number;

  /**
   * Maximum number of simultaneous games
   *
   * @optional
   * @default 1
   */
  LTCG_MAX_CONCURRENT_GAMES?: number;

  /**
   * Preferred deck ID to use for games
   * If not provided, agent will use a starter deck
   *
   * @optional
   */
  LTCG_PREFERRED_DECK_ID?: string;

  /**
   * Enable detailed logging of game actions
   *
   * @optional
   * @default false
   */
  LTCG_DEBUG_MODE?: boolean;
}

/**
 * Validated and normalized plugin configuration with defaults applied
 */
export interface NormalizedLTCGConfig extends Required<Omit<LTCGPluginConfig, 'LTCG_API_URL' | 'LTCG_PREFERRED_DECK_ID'>> {
  LTCG_API_URL?: string;
  LTCG_PREFERRED_DECK_ID?: string;
}

/**
 * Runtime state tracked by the plugin
 */
export interface PluginState {
  // Authentication
  authenticated: boolean;
  agentId?: string;
  userId?: string;

  // Active games
  activeGames: Set<string>;
  currentGameId?: string;

  // Matchmaking state
  inMatchmaking: boolean;
  lobbyId?: string;

  // Rate limiting
  lastRequestTime: number;
  requestCount: number;

  // Connection status
  connected: boolean;
  reconnectAttempts: number;
}
