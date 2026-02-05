/**
 * Error Code System
 *
 * BEST PRACTICE: Use structured error codes instead of plain strings
 * Benefits:
 * - Easier to handle errors in frontend
 * - Better error tracking and monitoring
 * - Consistent error messages
 * - Internationalization support
 *
 * IMPORTANT: Uses ConvexError to ensure error messages are visible on the client.
 * Plain JavaScript Error objects get masked as "Server Error" by Convex for security.
 */

import { ConvexError } from "convex/values";

export const ErrorCode = {
  // Authentication Errors (1xxx)
  AUTH_REQUIRED: "AUTH_1001",
  AUTH_INVALID_TOKEN: "AUTH_1002",
  AUTH_SESSION_EXPIRED: "AUTH_1003",
  AUTH_INVALID_CREDENTIALS: "AUTH_1004",
  AUTH_USER_EXISTS: "AUTH_1005",
  AUTH_USERNAME_TAKEN: "AUTH_1006",

  // Authorization Errors (2xxx)
  AUTHZ_ADMIN_REQUIRED: "AUTHZ_2001",
  AUTHZ_INSUFFICIENT_PERMISSIONS: "AUTHZ_2002",
  AUTHZ_RESOURCE_FORBIDDEN: "AUTHZ_2003",

  // Rate Limiting Errors (3xxx)
  RATE_LIMIT_EXCEEDED: "RATE_3001",
  RATE_LIMIT_PACK_PURCHASE: "RATE_3002",
  RATE_LIMIT_FRIEND_REQUEST: "RATE_3003",
  RATE_LIMIT_CHAT_MESSAGE: "RATE_3004",

  // Resource Not Found Errors (4xxx)
  NOT_FOUND: "NOT_FOUND_4000", // Generic not found
  NOT_FOUND_GENERAL: "NOT_FOUND_4000", // Alias for generic not found (with entity param)
  NOT_FOUND_USER: "NOT_FOUND_4001",
  NOT_FOUND_QUEST: "NOT_FOUND_4002",
  NOT_FOUND_ACHIEVEMENT: "NOT_FOUND_4003",
  NOT_FOUND_PRODUCT: "NOT_FOUND_4004",
  NOT_FOUND_LOBBY: "NOT_FOUND_4005",
  NOT_FOUND_CARD: "NOT_FOUND_4006",
  NOT_FOUND_STORAGE_FILE: "NOT_FOUND_4007",
  NOT_FOUND_INBOX_MESSAGE: "NOT_FOUND_4008",

  // Inbox/Reward Errors (5xxx - State Validation)
  REWARD_ALREADY_CLAIMED: "REWARD_5020",
  REWARD_EXPIRED: "REWARD_5021",
  INVALID_OPERATION: "INVALID_5022",

  // Validation Errors (5xxx)
  VALIDATION_INVALID_INPUT: "VALIDATION_5001",
  VALIDATION_MISSING_FIELD: "VALIDATION_5002",
  VALIDATION_INVALID_FORMAT: "VALIDATION_5003",
  VALIDATION_INVALID_DECK: "VALIDATION_5009",
  VALIDATION_UNSUPPORTED_FORMAT: "VALIDATION_5011",
  VALIDATION_FILE_TOO_LARGE: "VALIDATION_5012",
  VALIDATION_DECK_SIZE: "VALIDATION_5013",
  VALIDATION_CARD_OWNERSHIP: "VALIDATION_5014",
  VALIDATION_RANGE: "VALIDATION_5015",

  // Quest/Achievement Errors (5xxx - State Validation)
  QUEST_NOT_COMPLETED: "QUEST_5004",
  QUEST_ALREADY_CLAIMED: "QUEST_5005",
  ACHIEVEMENT_ALREADY_UNLOCKED: "ACHIEVEMENT_5006",

  // Chat/Message Errors (5xxx - Content Validation)
  CHAT_MESSAGE_TOO_LONG: "CHAT_5007",
  CHAT_MESSAGE_EMPTY: "CHAT_5008",

  // Notification Errors (5xxx - State Validation)
  NOTIFICATION_NOT_FOUND: "NOTIFICATION_5010",

  // Economy Errors (6xxx)
  ECONOMY_INSUFFICIENT_GOLD: "ECONOMY_6001",
  ECONOMY_INSUFFICIENT_GEMS: "ECONOMY_6002",
  ECONOMY_INVALID_PRODUCT: "ECONOMY_6003",
  ECONOMY_PROMO_CODE_INVALID: "ECONOMY_6004",
  ECONOMY_PROMO_CODE_EXPIRED: "ECONOMY_6005",
  ECONOMY_PROMO_CODE_USED: "ECONOMY_6006",
  ECONOMY_ALREADY_CLAIMED: "ECONOMY_6008",
  ECONOMY_SALE_NOT_FOUND: "ECONOMY_6009",
  ECONOMY_SALE_UNAVAILABLE: "ECONOMY_6010",
  ECONOMY_TRANSACTION_NOT_FOUND: "ECONOMY_6011",

  // Marketplace Errors (6xxx - Economy Related)
  MARKETPLACE_BID_TOO_LOW: "MARKETPLACE_6007",

  // Social Errors (7xxx)
  SOCIAL_ALREADY_FRIENDS: "SOCIAL_7001",
  SOCIAL_REQUEST_PENDING: "SOCIAL_7002",
  SOCIAL_USER_BLOCKED: "SOCIAL_7003",
  SOCIAL_CANNOT_SELF_FRIEND: "SOCIAL_7004",

  // Guild Errors (7xxx - Social Related)
  GUILD_NOT_FOUND: "GUILD_7101",
  GUILD_NAME_TAKEN: "GUILD_7102",
  GUILD_NAME_INVALID: "GUILD_7103",
  GUILD_FULL: "GUILD_7104",
  GUILD_NOT_A_MEMBER: "GUILD_7105",
  GUILD_OWNER_REQUIRED: "GUILD_7106",
  GUILD_ALREADY_MEMBER: "GUILD_7107",
  GUILD_ALREADY_IN_GUILD: "GUILD_7108",
  GUILD_CANNOT_LEAVE_AS_OWNER: "GUILD_7109",
  GUILD_INVITE_NOT_FOUND: "GUILD_7110",
  GUILD_INVITE_EXPIRED: "GUILD_7111",
  GUILD_REQUEST_NOT_FOUND: "GUILD_7112",
  GUILD_REQUEST_ALREADY_PENDING: "GUILD_7113",
  GUILD_INVITE_ALREADY_PENDING: "GUILD_7114",
  GUILD_CANNOT_INVITE_SELF: "GUILD_7115",
  GUILD_CANNOT_KICK_OWNER: "GUILD_7116",
  GUILD_CANNOT_KICK_SELF: "GUILD_7117",

  // DM Errors (7xxx - Social Related)
  DM_NOT_FRIENDS: "DM_7201",
  DM_CONVERSATION_NOT_FOUND: "DM_7202",
  DM_NOT_PARTICIPANT: "DM_7203",

  // User Tournament Errors (73xx - Social Related)
  TOURNAMENT_NOT_FOUND: "TOURNAMENT_7301",
  TOURNAMENT_FULL: "TOURNAMENT_7302",
  TOURNAMENT_NOT_IN_REGISTRATION: "TOURNAMENT_7303",
  TOURNAMENT_ALREADY_REGISTERED: "TOURNAMENT_7304",
  TOURNAMENT_NOT_REGISTERED: "TOURNAMENT_7305",
  TOURNAMENT_ALREADY_HOSTING: "TOURNAMENT_7306",
  TOURNAMENT_NOT_HOST: "TOURNAMENT_7307",
  TOURNAMENT_HOST_CANNOT_LEAVE: "TOURNAMENT_7308",
  TOURNAMENT_INVALID_BUY_IN: "TOURNAMENT_7309",
  TOURNAMENT_CODE_NOT_FOUND: "TOURNAMENT_7310",
  TOURNAMENT_PRIVATE_REQUIRES_CODE: "TOURNAMENT_7311",
  TOURNAMENT_EXPIRED: "TOURNAMENT_7312",
  TOURNAMENT_NO_ACTIVE_DECK: "TOURNAMENT_7313",

  // Game Errors (8xxx)
  GAME_LOBBY_FULL: "GAME_8001",
  GAME_ALREADY_IN_GAME: "GAME_8002",
  GAME_INVALID_MOVE: "GAME_8003",
  GAME_NOT_YOUR_TURN: "GAME_8004",
  GAME_STATE_NOT_FOUND: "GAME_8008",
  GAME_CARD_NOT_FOUND: "GAME_8009",
  GAME_CARD_NOT_IN_HAND: "GAME_8010",
  GAME_CARD_NOT_ON_BOARD: "GAME_8011",
  GAME_INVALID_PHASE: "GAME_8012",
  GAME_INVALID_CARD_TYPE: "GAME_8013",
  GAME_ZONE_FULL: "GAME_8014",
  GAME_CARD_ALREADY_FACE_UP: "GAME_8015",
  GAME_TRAP_SAME_TURN: "GAME_8016",
  GAME_CARD_NOT_IN_ZONE: "GAME_8017",
  GAME_INVALID_SPELL_SPEED: "GAME_8018",
  GAME_NO_CHAIN: "GAME_8019",
  GAME_INVALID_CHAIN: "GAME_8020",
  GAME_CANNOT_ADVANCE_PHASE: "GAME_8021",
  GAME_AI_TURN_ERROR: "GAME_8022",
  GAME_NOT_STARTED: "GAME_8023",
  GAME_CHAIN_LIMIT_EXCEEDED: "GAME_8024",
  GAME_NOT_ACTIVE: "GAME_8027",
  GAME_CARD_ALREADY_IN_CHAIN: "GAME_8025",
  GAME_INVALID_CHAIN_STATE: "GAME_8026",

  // Matchmaking Errors (8xxx - Game Related)
  MATCHMAKING_ALREADY_IN_QUEUE: "MATCHMAKING_8005",
  MATCHMAKING_NOT_IN_QUEUE: "MATCHMAKING_8006",
  MATCHMAKING_PLAYER_LEFT_QUEUE: "MATCHMAKING_8007",

  // Agent Errors (10xxx)
  AGENT_LIMIT_REACHED: "AGENT_10001",
  AGENT_NAME_INVALID_LENGTH: "AGENT_10002",
  AGENT_NAME_INVALID_CHARS: "AGENT_10003",
  AGENT_NAME_DUPLICATE: "AGENT_10004",
  AGENT_INVALID_STARTER_DECK: "AGENT_10005",
  AGENT_INVALID_PROFILE_URL: "AGENT_10006",
  AGENT_INVALID_SOCIAL_URL: "AGENT_10007",
  AGENT_NOT_FOUND: "AGENT_10008",
  AGENT_DELETED: "AGENT_10009",
  AGENT_UNAUTHORIZED: "AGENT_10010",

  // Library/System Errors (11xxx)
  LIBRARY_EMPTY_DECK: "LIBRARY_11001",
  LIBRARY_NO_CARDS_FOUND: "LIBRARY_11002",
  LIBRARY_CARD_SELECTION_FAILED: "LIBRARY_11003",
  LIBRARY_EMPTY_ARRAY: "LIBRARY_11004",
  LIBRARY_INSUFFICIENT_CARDS: "LIBRARY_11005",
  LIBRARY_XP_CREATION_FAILED: "LIBRARY_11006",
  LIBRARY_INVALID_XP: "LIBRARY_11007",

  // Token Errors (12xxx)
  ECONOMY_INSUFFICIENT_TOKENS: "ECONOMY_12001",
  ECONOMY_WALLET_NOT_CONNECTED: "ECONOMY_12002",
  ECONOMY_WALLET_VERIFICATION_FAILED: "ECONOMY_12003",
  ECONOMY_TOKEN_TRANSACTION_PENDING: "ECONOMY_12004",
  ECONOMY_TOKEN_TRANSACTION_FAILED: "ECONOMY_12005",
  ECONOMY_TOKEN_TRANSACTION_EXPIRED: "ECONOMY_12006",
  ECONOMY_TOKEN_BALANCE_STALE: "ECONOMY_12007",
  ECONOMY_TOKEN_LISTING_INVALID: "ECONOMY_12008",
  ECONOMY_TOKEN_PURCHASE_INVALID: "ECONOMY_12009",
  ECONOMY_TOKEN_TRANSFER_FAILED: "ECONOMY_12010",

  // System Errors (9xxx)
  SYSTEM_INTERNAL_ERROR: "SYSTEM_9001",
  SYSTEM_DATABASE_ERROR: "SYSTEM_9002",
  SYSTEM_TRANSACTION_FAILED: "SYSTEM_9003",
  SYSTEM_EMAIL_SEND_FAILED: "SYSTEM_9004",
  SYSTEM_RATE_LIMIT_CONFIG: "SYSTEM_9005",
  SYSTEM_CURRENCY_NOT_FOUND: "SYSTEM_9006",
  SYSTEM_CURRENCY_CREATION_FAILED: "SYSTEM_9007",
  NOT_IMPLEMENTED: "SYSTEM_9008", // Feature not yet implemented
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Error messages mapped to error codes
 * These can be overridden per-locale for internationalization
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Authentication
  AUTH_1001: "Authentication required",
  AUTH_1002: "Invalid authentication token",
  AUTH_1003: "Session expired. Please sign in again",
  AUTH_1004: "Invalid email or password",
  AUTH_1005: "User with this email already exists",
  AUTH_1006: "Username is already taken",

  // Authorization
  AUTHZ_2001: "Admin access required",
  AUTHZ_2002: "You don't have permission to perform this action",
  AUTHZ_2003: "Access to this resource is forbidden",

  // Rate Limiting
  RATE_3001: "Rate limit exceeded. Please try again later",
  RATE_3002: "Too many pack purchases. Please wait before purchasing again",
  RATE_3003: "Too many friend requests. Please wait before sending more",
  RATE_3004: "Too many chat messages. Please slow down",

  // Not Found
  NOT_FOUND_4000: "Resource not found",
  NOT_FOUND_4001: "User not found",
  NOT_FOUND_4002: "Quest not found",
  NOT_FOUND_4003: "Achievement not found",
  NOT_FOUND_4004: "Product not found or unavailable",
  NOT_FOUND_4005: "Game lobby not found",
  NOT_FOUND_4006: "Card not found",
  NOT_FOUND_4007: "Storage file not found",
  NOT_FOUND_4008: "Inbox message not found",

  // Inbox/Reward
  REWARD_5020: "This reward has already been claimed",
  REWARD_5021: "This reward has expired",
  INVALID_5022: "Invalid operation",

  // Validation
  VALIDATION_5001: "Invalid input provided",
  VALIDATION_5002: "Required field is missing",
  VALIDATION_5003: "Invalid format",
  VALIDATION_5009: "Invalid deck configuration",
  VALIDATION_5011: "Unsupported file format",
  VALIDATION_5012: "File size exceeds maximum allowed size",
  VALIDATION_5013: "Deck size is outside allowed range",
  VALIDATION_5014: "Card ownership validation failed",
  VALIDATION_5015: "Value is outside allowed range",

  // Quest/Achievement
  QUEST_5004: "Quest is not completed yet",
  QUEST_5005: "Quest rewards have already been claimed",
  ACHIEVEMENT_5006: "Achievement has already been unlocked",

  // Chat/Message
  CHAT_5007: "Chat message is too long",
  CHAT_5008: "Chat message cannot be empty",

  // Notification
  NOTIFICATION_5010: "Notification not found",

  // Economy
  ECONOMY_6001: "Insufficient gold",
  ECONOMY_6002: "Insufficient gems",
  ECONOMY_6003: "Invalid product configuration",
  ECONOMY_6004: "Invalid promo code",
  ECONOMY_6005: "This promo code has expired",
  ECONOMY_6006: "You have already redeemed this promo code",
  ECONOMY_6008: "This item has already been claimed",
  ECONOMY_6009: "Sale not found",
  ECONOMY_6010: "Sale is no longer available",
  ECONOMY_6011: "Transaction not found",

  // Marketplace
  MARKETPLACE_6007: "Bid amount is too low",

  // Social
  SOCIAL_7001: "You are already friends with this user",
  SOCIAL_7002: "Friend request already sent",
  SOCIAL_7003: "Cannot send friend request to this user",
  SOCIAL_7004: "You cannot send a friend request to yourself",

  // Guild
  GUILD_7101: "Guild not found",
  GUILD_7102: "A guild with this name already exists",
  GUILD_7103: "Guild name must be 3-32 characters (letters, numbers, spaces)",
  GUILD_7104: "Guild is full (max 50 members)",
  GUILD_7105: "You are not a member of this guild",
  GUILD_7106: "Only the guild owner can perform this action",
  GUILD_7107: "User is already a member of this guild",
  GUILD_7108: "You are already in a guild. Leave your current guild first",
  GUILD_7109: "Guild owner cannot leave. Transfer ownership or delete the guild",
  GUILD_7110: "Guild invite not found",
  GUILD_7111: "Guild invite has expired",
  GUILD_7112: "Join request not found",
  GUILD_7113: "You already have a pending request to join this guild",
  GUILD_7114: "This user has already been invited",
  GUILD_7115: "You cannot invite yourself to a guild",
  GUILD_7116: "Cannot kick the guild owner",
  GUILD_7117: "Cannot kick yourself. Use leave guild instead",

  // DM
  DM_7201: "You can only message friends",
  DM_7202: "Conversation not found",
  DM_7203: "You are not a participant in this conversation",

  // User Tournaments
  TOURNAMENT_7301: "Tournament not found",
  TOURNAMENT_7302: "Tournament is full",
  TOURNAMENT_7303: "Tournament is not accepting registrations",
  TOURNAMENT_7304: "You are already registered for this tournament",
  TOURNAMENT_7305: "You are not registered for this tournament",
  TOURNAMENT_7306: "You already have an active hosted tournament",
  TOURNAMENT_7307: "Only the tournament host can perform this action",
  TOURNAMENT_7308: "Tournament host cannot leave their own tournament",
  TOURNAMENT_7309: "Buy-in must be between 0 and 100,000 gold",
  TOURNAMENT_7310: "Invalid tournament code",
  TOURNAMENT_7311: "This is a private tournament. Please enter the join code",
  TOURNAMENT_7312: "This tournament has expired",
  TOURNAMENT_7313: "You must have an active deck to join tournaments",

  // Game
  GAME_8001: "Game lobby is full",
  GAME_8002: "You are already in an active game",
  GAME_8003: "Invalid move",
  GAME_8004: "It is not your turn",
  GAME_8008: "Game state not found",
  GAME_8009: "Card not found",
  GAME_8010: "Card is not in your hand",
  GAME_8011: "Card not found on board",
  GAME_8012: "Action not allowed in current phase",
  GAME_8013: "Invalid card type for this action",
  GAME_8014: "Zone is full",
  GAME_8015: "Card is already face-up",
  GAME_8016: "Trap cards cannot be activated the same turn they are set",
  GAME_8017: "Card is not in your zone",
  GAME_8018: "Cannot chain card with lower Spell Speed",
  GAME_8019: "No chain to resolve or respond to",
  GAME_8020: "Invalid chain structure",
  GAME_8021: "Cannot advance from End Phase - use endTurn instead",
  GAME_8022: "AI turn execution failed",
  GAME_8023: "Game has not started yet",
  GAME_8024: "Chain cannot exceed 12 links",
  GAME_8025: "Card is already in the chain",
  GAME_8026: "Invalid chain state",
  GAME_8027: "Game is not active",

  // Matchmaking
  MATCHMAKING_8005: "You are already in the matchmaking queue",
  MATCHMAKING_8006: "You are not in the matchmaking queue",
  MATCHMAKING_8007: "One or more players left the matchmaking queue",

  // Agent
  AGENT_10001: "Maximum agents allowed per account",
  AGENT_10002: "Agent name must be between 3 and 32 characters",
  AGENT_10003: "Agent name can only contain letters, numbers, spaces, underscores, and hyphens",
  AGENT_10004: "You already have an agent with this name",
  AGENT_10005: "Invalid starter deck selection",
  AGENT_10006: "Invalid profile picture URL",
  AGENT_10007: "Invalid social link URL",
  AGENT_10008: "Agent not found",
  AGENT_10009: "Agent has been deleted",
  AGENT_10010: "You are not authorized to access this agent",

  // Library/System
  LIBRARY_11001: "Cannot draw card: deck is empty",
  LIBRARY_11002: "No cards found matching criteria",
  LIBRARY_11003: "Failed to select card",
  LIBRARY_11004: "Cannot pick from empty array",
  LIBRARY_11005: "Insufficient cards in collection",
  LIBRARY_11006: "Failed to create player XP record",
  LIBRARY_11007: "Cannot add negative XP",

  // Token Errors
  ECONOMY_12001: "Insufficient token balance",
  ECONOMY_12002: "Wallet not connected. Please connect your wallet to continue",
  ECONOMY_12003: "Wallet verification failed. Please reconnect your wallet",
  ECONOMY_12004: "A token transaction is already pending for this listing",
  ECONOMY_12005: "Token transaction failed",
  ECONOMY_12006: "Token transaction expired. Please try again",
  ECONOMY_12007: "Token balance is stale. Please refresh your balance",
  ECONOMY_12008: "Invalid token listing",
  ECONOMY_12009: "Invalid token purchase request",
  ECONOMY_12010: "Token transfer failed. Please check your wallet and try again",

  // System
  SYSTEM_9001: "An internal error occurred. Please try again",
  SYSTEM_9002: "Database error occurred",
  SYSTEM_9003: "Transaction failed. Please try again",
  SYSTEM_9004: "Failed to send email",
  SYSTEM_9005: "Rate limit configuration error",
  SYSTEM_9006: "Currency record not found. User may need to sign up again",
  SYSTEM_9007: "Failed to create currency record",
  SYSTEM_9008: "Feature not yet implemented",
};

/**
 * Create a structured error with code and message
 *
 * Uses ConvexError to ensure error details are visible on the client.
 * Plain JavaScript Error objects get masked as "Server Error" by Convex for security.
 *
 * @param code - Error code from ErrorCode enum
 * @param details - Optional additional details
 * @returns ConvexError with structured data
 *
 * @example
 * throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GOLD, { required: 100, available: 50 });
 */
export function createError(code: ErrorCode, details?: Record<string, unknown>): ConvexError<string> {
  // Use details.reason if provided, otherwise fall back to static message
  const message = (details?.["reason"] as string) || ErrorMessages[code];
  // Include code in message for easy extraction on client
  const fullMessage = `[${code}] ${message}`;
  return new ConvexError(fullMessage);
}

/**
 * Type guard to check if error is a ConvexError
 */
export function isConvexError(error: unknown): error is ConvexError<string> {
  return error instanceof ConvexError;
}

/**
 * Extract error code and message from a ConvexError
 * Error format: "[CODE] Message"
 */
export function parseConvexError(error: unknown): {
  code: string;
  message: string;
} | null {
  if (!isConvexError(error) || typeof error.data !== "string") {
    return null;
  }
  // Parse format: "[CODE] Message"
  const match = error.data.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return { code: match[1] ?? "", message: match[2] ?? "" };
  }
  return { code: "", message: error.data };
}

/**
 * @deprecated Use isConvexError and parseConvexError instead
 */
export function hasErrorCode(error: unknown): boolean {
  return isConvexError(error);
}

/**
 * @deprecated Use parseConvexError instead
 */
export function getErrorData(error: unknown): { code: string; message: string } | null {
  return parseConvexError(error);
}
