# Error Code Reference

Complete reference for all error codes in the LTCG backend. Error codes are structured by category (1xxx, 2xxx, etc.) for easy identification and handling.

## Error Code System

File: `convex/lib/errorCodes.ts`

### Benefits of Error Codes

- Easier error handling in frontend
- Better error tracking and monitoring
- Consistent error messages
- Internationalization support
- Type-safe error handling

### Usage

```typescript
import { ErrorCode, createError, hasErrorCode } from "convex/lib/errorCodes";

// Throw an error
throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GOLD, {
  required: 100,
  available: 50
});

// Catch and handle
try {
  await someOperation();
} catch (error) {
  if (hasErrorCode(error)) {
    if (error.code === ErrorCode.ECONOMY_INSUFFICIENT_GOLD) {
      // Handle insufficient gold
    }
  }
}
```

---

## Error Categories

### 1xxx: Authentication Errors

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `AUTH_1001` | AUTH_REQUIRED | Authentication required | Sign in or create account |
| `AUTH_1002` | AUTH_INVALID_TOKEN | Invalid authentication token | Re-authenticate |
| `AUTH_1003` | AUTH_SESSION_EXPIRED | Session expired. Please sign in again | Sign in again |
| `AUTH_1004` | AUTH_INVALID_CREDENTIALS | Invalid email or password | Check credentials |
| `AUTH_1005` | AUTH_USER_EXISTS | User with this email already exists | Use different email |
| `AUTH_1006` | AUTH_USERNAME_TAKEN | Username is already taken | Choose different username |

**When to Use**:
- User not authenticated
- Invalid credentials
- Token expired
- User registration conflicts

**Example**:
```typescript
const user = await getCurrentUser(ctx);
if (!user) {
  throw createError(ErrorCode.AUTH_REQUIRED);
}
```

---

### 2xxx: Authorization Errors

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `AUTHZ_2001` | AUTHZ_ADMIN_REQUIRED | Admin access required | Contact admin |
| `AUTHZ_2002` | AUTHZ_INSUFFICIENT_PERMISSIONS | You don't have permission to perform this action | Request permission |
| `AUTHZ_2003` | AUTHZ_RESOURCE_FORBIDDEN | Access to this resource is forbidden | Check ownership |

**When to Use**:
- User lacks required role
- Resource doesn't belong to user
- Action requires elevated permissions

**Example**:
```typescript
const deck = await ctx.db.get(deckId);
if (!deck || deck.userId !== userId) {
  throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
    reason: "Deck not owned by user"
  });
}
```

---

### 3xxx: Rate Limiting Errors

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `RATE_3001` | RATE_LIMIT_EXCEEDED | Rate limit exceeded. Please try again later | Wait before retry |
| `RATE_3002` | RATE_LIMIT_PACK_PURCHASE | Too many pack purchases. Please wait before purchasing again | Wait before retry |
| `RATE_3003` | RATE_LIMIT_FRIEND_REQUEST | Too many friend requests. Please wait before sending more | Wait before retry |
| `RATE_3004` | RATE_LIMIT_CHAT_MESSAGE | Too many chat messages. Please slow down | Wait before retry |

**When to Use**:
- Too many requests in short time
- Spam prevention
- Resource protection

**Rate Limits**:
- Pack purchase: 10 per minute
- Friend request: 5 per minute
- Chat message: 10 per 10 seconds

---

### 4xxx: Resource Not Found Errors

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `NOT_FOUND_4001` | NOT_FOUND_USER | User not found | Check user ID |
| `NOT_FOUND_4002` | NOT_FOUND_QUEST | Quest not found | Check quest ID |
| `NOT_FOUND_4003` | NOT_FOUND_ACHIEVEMENT | Achievement not found | Check achievement ID |
| `NOT_FOUND_4004` | NOT_FOUND_PRODUCT | Product not found or unavailable | Check shop |
| `NOT_FOUND_4005` | NOT_FOUND_LOBBY | Game lobby not found | Lobby may have closed |
| `NOT_FOUND_4006` | NOT_FOUND_CARD | Card not found | Card may be inactive |
| `NOT_FOUND_4007` | NOT_FOUND_STORAGE_FILE | Storage file not found | File may be deleted |

**When to Use**:
- Database record doesn't exist
- Resource deleted or inactive
- Invalid ID provided

**Example**:
```typescript
const product = await ctx.db.get(productId);
if (!product || !product.isActive) {
  throw createError(ErrorCode.NOT_FOUND_4004);
}
```

---

### 5xxx: Validation Errors

#### General Validation (5001-5015)

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `VALIDATION_5001` | VALIDATION_INVALID_INPUT | Invalid input provided | Check parameters |
| `VALIDATION_5002` | VALIDATION_MISSING_FIELD | Required field is missing | Provide required field |
| `VALIDATION_5003` | VALIDATION_INVALID_FORMAT | Invalid format | Check format rules |
| `VALIDATION_5009` | VALIDATION_INVALID_DECK | Invalid deck configuration | Fix deck composition |
| `VALIDATION_5011` | VALIDATION_UNSUPPORTED_FORMAT | Unsupported file format | Use supported format |
| `VALIDATION_5012` | VALIDATION_FILE_TOO_LARGE | File size exceeds maximum allowed size | Use smaller file |
| `VALIDATION_5013` | VALIDATION_DECK_SIZE | Deck size is outside allowed range | Need 30+ cards |
| `VALIDATION_5014` | VALIDATION_CARD_OWNERSHIP | Card ownership validation failed | Don't own enough copies |
| `VALIDATION_5015` | VALIDATION_RANGE | Value is outside allowed range | Check min/max values |

#### Quest/Achievement State (5004-5006)

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `QUEST_5004` | QUEST_NOT_COMPLETED | Quest is not completed yet | Complete quest first |
| `QUEST_5005` | QUEST_ALREADY_CLAIMED | Quest rewards have already been claimed | Already claimed |
| `ACHIEVEMENT_5006` | ACHIEVEMENT_ALREADY_UNLOCKED | Achievement has already been unlocked | Already unlocked |

#### Chat/Message (5007-5008)

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `CHAT_5007` | CHAT_MESSAGE_TOO_LONG | Chat message is too long | Shorten message |
| `CHAT_5008` | CHAT_MESSAGE_EMPTY | Chat message cannot be empty | Type a message |

#### Notification (5010)

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `NOTIFICATION_5010` | NOTIFICATION_NOT_FOUND | Notification not found | May be deleted |

**When to Use**:
- Invalid input parameters
- Business rule violations
- Format/type mismatches

**Example**:
```typescript
if (message.length > 500) {
  throw createError(ErrorCode.CHAT_MESSAGE_TOO_LONG);
}

if (deckCards.length < 30) {
  throw createError(ErrorCode.VALIDATION_DECK_SIZE, {
    min: 30,
    current: deckCards.length
  });
}
```

---

### 6xxx: Economy Errors

#### Currency (6001-6003)

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `ECONOMY_6001` | ECONOMY_INSUFFICIENT_GOLD | Insufficient gold | Earn/buy more gold |
| `ECONOMY_6002` | ECONOMY_INSUFFICIENT_GEMS | Insufficient gems | Buy more gems |
| `ECONOMY_6003` | ECONOMY_INVALID_PRODUCT | Invalid product configuration | Contact support |

#### Promo Codes (6004-6006)

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `ECONOMY_6004` | ECONOMY_PROMO_CODE_INVALID | Invalid promo code | Check code spelling |
| `ECONOMY_6005` | ECONOMY_PROMO_CODE_EXPIRED | This promo code has expired | Code no longer valid |
| `ECONOMY_6006` | ECONOMY_PROMO_CODE_USED | You have already redeemed this promo code | One use per user |

#### Marketplace (6007)

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `MARKETPLACE_6007` | MARKETPLACE_BID_TOO_LOW | Bid amount is too low | Bid higher |

**When to Use**:
- Insufficient funds
- Invalid purchases
- Promo code issues
- Marketplace transactions

**Example**:
```typescript
const currency = await getCurrency(ctx, userId);
if (currency.gold < cost) {
  throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GOLD, {
    required: cost,
    available: currency.gold
  });
}
```

---

### 7xxx: Social Errors

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `SOCIAL_7001` | SOCIAL_ALREADY_FRIENDS | You are already friends with this user | Already friends |
| `SOCIAL_7002` | SOCIAL_REQUEST_PENDING | Friend request already sent | Request pending |
| `SOCIAL_7003` | SOCIAL_USER_BLOCKED | Cannot send friend request to this user | User blocked you |
| `SOCIAL_7004` | SOCIAL_CANNOT_SELF_FRIEND | You cannot send a friend request to yourself | Can't friend self |

**When to Use**:
- Friend request issues
- Duplicate friend attempts
- Blocked users

**Example**:
```typescript
if (friendId === userId) {
  throw createError(ErrorCode.SOCIAL_CANNOT_SELF_FRIEND);
}

const existing = await ctx.db
  .query("friendships")
  .withIndex("by_user_friend", q =>
    q.eq("userId", userId).eq("friendId", friendId)
  )
  .first();

if (existing?.status === "accepted") {
  throw createError(ErrorCode.SOCIAL_ALREADY_FRIENDS);
}
```

---

### 8xxx: Game Errors

#### General Game (8001-8004)

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `GAME_8001` | GAME_LOBBY_FULL | Game lobby is full | Join different lobby |
| `GAME_8002` | GAME_ALREADY_IN_GAME | You are already in an active game | Finish current game |
| `GAME_8003` | GAME_INVALID_MOVE | Invalid move | Check game rules |
| `GAME_8004` | GAME_NOT_YOUR_TURN | It is not your turn | Wait for your turn |

#### Matchmaking (8005-8007)

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `MATCHMAKING_8005` | MATCHMAKING_ALREADY_IN_QUEUE | You are already in the matchmaking queue | Leave queue first |
| `MATCHMAKING_8006` | MATCHMAKING_NOT_IN_QUEUE | You are not in the matchmaking queue | Join queue first |
| `MATCHMAKING_8007` | MATCHMAKING_PLAYER_LEFT_QUEUE | One or more players left the matchmaking queue | Try again |

#### Game State (8008-8022)

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `GAME_8008` | GAME_STATE_NOT_FOUND | Game state not found | Game may have ended |
| `GAME_8009` | GAME_CARD_NOT_FOUND | Card not found | Check card ID |
| `GAME_8010` | GAME_CARD_NOT_IN_HAND | Card is not in your hand | Check hand |
| `GAME_8011` | GAME_CARD_NOT_ON_BOARD | Card not found on board | Check board state |
| `GAME_8012` | GAME_INVALID_PHASE | Action not allowed in current phase | Wait for correct phase |
| `GAME_8013` | GAME_INVALID_CARD_TYPE | Invalid card type for this action | Check card type |
| `GAME_8014` | GAME_ZONE_FULL | Zone is full | No space available |
| `GAME_8015` | GAME_CARD_ALREADY_FACE_UP | Card is already face-up | Can't flip again |
| `GAME_8016` | GAME_TRAP_SAME_TURN | Trap cards cannot be activated the same turn they are set | Wait one turn |
| `GAME_8017` | GAME_CARD_NOT_IN_ZONE | Card is not in your zone | Check card location |
| `GAME_8018` | GAME_INVALID_SPELL_SPEED | Cannot chain card with lower Spell Speed | Check spell speed |
| `GAME_8019` | GAME_NO_CHAIN | No chain to resolve or respond to | No active chain |
| `GAME_8020` | GAME_INVALID_CHAIN | Invalid chain structure | Chain rules violation |
| `GAME_8021` | GAME_CANNOT_ADVANCE_PHASE | Cannot advance from End Phase - use endTurn instead | Use endTurn |
| `GAME_8022` | GAME_AI_TURN_ERROR | AI turn execution failed | Retry or report bug |

**When to Use**:
- Game rule violations
- Invalid game actions
- Turn/phase mismatches
- Matchmaking issues

**Example**:
```typescript
if (gameState.currentTurnPlayerId !== userId) {
  throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
}

if (gameState.currentPhase !== "main1" && gameState.currentPhase !== "main2") {
  throw createError(ErrorCode.GAME_INVALID_PHASE, {
    action: "summon",
    currentPhase: gameState.currentPhase
  });
}

if (gameState.hostBoard.length >= 5) {
  throw createError(ErrorCode.GAME_ZONE_FULL, { zone: "monster" });
}
```

---

### 9xxx: System Errors

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `SYSTEM_9001` | SYSTEM_INTERNAL_ERROR | An internal error occurred. Please try again | Retry or report bug |
| `SYSTEM_9002` | SYSTEM_DATABASE_ERROR | Database error occurred | Retry or report bug |
| `SYSTEM_9003` | SYSTEM_TRANSACTION_FAILED | Transaction failed. Please try again | Retry transaction |
| `SYSTEM_9004` | SYSTEM_EMAIL_SEND_FAILED | Failed to send email | Check email service |
| `SYSTEM_9005` | SYSTEM_RATE_LIMIT_CONFIG | Rate limit configuration error | Check config |
| `SYSTEM_9006` | SYSTEM_CURRENCY_NOT_FOUND | Currency record not found. User may need to sign up again | Re-register |
| `SYSTEM_9007` | SYSTEM_CURRENCY_CREATION_FAILED | Failed to create currency record | Contact support |

**When to Use**:
- Unexpected errors
- Database failures
- External service failures
- Configuration issues

**Example**:
```typescript
try {
  await complexOperation();
} catch (error) {
  console.error("Unexpected error:", error);
  throw createError(ErrorCode.SYSTEM_INTERNAL_ERROR, {
    operation: "complexOperation",
    error: error.message
  });
}
```

---

### 10xxx: Agent Errors

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `AGENT_10001` | AGENT_LIMIT_REACHED | Maximum agents allowed per account | Delete an agent |
| `AGENT_10002` | AGENT_NAME_INVALID_LENGTH | Agent name must be between 3 and 32 characters | Adjust name length |
| `AGENT_10003` | AGENT_NAME_INVALID_CHARS | Agent name can only contain letters, numbers, spaces, underscores, and hyphens | Fix name format |
| `AGENT_10004` | AGENT_NAME_DUPLICATE | You already have an agent with this name | Choose different name |
| `AGENT_10005` | AGENT_INVALID_STARTER_DECK | Invalid starter deck selection | Choose valid deck |
| `AGENT_10006` | AGENT_INVALID_PROFILE_URL | Invalid profile picture URL | Fix URL format |
| `AGENT_10007` | AGENT_INVALID_SOCIAL_URL | Invalid social link URL | Fix URL format |
| `AGENT_10008` | AGENT_NOT_FOUND | Agent not found | Check agent ID |
| `AGENT_10009` | AGENT_DELETED | Agent has been deleted | Agent no longer active |

**When to Use**:
- AI agent registration
- Agent configuration
- Agent limits

---

### 11xxx: Library/System Errors

| Code | Name | Message | Resolution |
|------|------|---------|------------|
| `LIBRARY_11001` | LIBRARY_EMPTY_DECK | Cannot draw card: deck is empty | Deck exhausted |
| `LIBRARY_11002` | LIBRARY_NO_CARDS_FOUND | No cards found matching criteria | Adjust filters |
| `LIBRARY_11003` | LIBRARY_CARD_SELECTION_FAILED | Failed to select card | Retry or report bug |
| `LIBRARY_11004` | LIBRARY_EMPTY_ARRAY | Cannot pick from empty array | Array is empty |
| `LIBRARY_11005` | LIBRARY_INSUFFICIENT_CARDS | Insufficient cards in collection | Get more cards |
| `LIBRARY_11006` | LIBRARY_XP_CREATION_FAILED | Failed to create player XP record | Contact support |
| `LIBRARY_11007` | LIBRARY_INVALID_XP | Cannot add negative XP | XP must be positive |

**When to Use**:
- Helper function failures
- Data selection issues
- XP system errors

---

## Error Handling Best Practices

### Frontend Error Handling

```typescript
import { ErrorCode } from "@/convex/lib/errorCodes";

async function buyPack(packId: string) {
  try {
    const result = await convex.mutation(api.economy.shop.purchasePack, {
      productId: packId
    });

    return { success: true, data: result };
  } catch (error: any) {
    // Handle specific error codes
    switch (error.code) {
      case ErrorCode.ECONOMY_INSUFFICIENT_GOLD:
        return {
          success: false,
          message: "Not enough gold. Earn more by completing quests!"
        };

      case ErrorCode.ECONOMY_INSUFFICIENT_GEMS:
        return {
          success: false,
          message: "Not enough gems. Visit the shop to purchase more."
        };

      case ErrorCode.RATE_LIMIT_PACK_PURCHASE:
        return {
          success: false,
          message: "Slow down! Too many purchases. Try again in a minute."
        };

      case ErrorCode.NOT_FOUND_4004:
        return {
          success: false,
          message: "This pack is no longer available."
        };

      default:
        return {
          success: false,
          message: error.message || "Something went wrong. Please try again."
        };
    }
  }
}
```

### Backend Error Creation

```typescript
import { createError, ErrorCode } from "./errorCodes";

// Simple error
throw createError(ErrorCode.AUTH_REQUIRED);

// Error with details
throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GOLD, {
  required: 100,
  available: 50,
  productId: "pack_fire_001"
});

// Conditional error
if (deck.userId !== userId) {
  throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
    reason: "Deck not owned by user",
    deckId: deck._id
  });
}
```

### Type Guards

```typescript
import { hasErrorCode } from "convex/lib/errorCodes";

try {
  await someOperation();
} catch (error) {
  if (hasErrorCode(error)) {
    // error.code is typed as ErrorCode
    console.error(`Error ${error.code}: ${error.message}`);

    if (error.details) {
      console.error("Details:", error.details);
    }
  } else {
    // Unknown error
    console.error("Unknown error:", error);
  }
}
```

---

## Error Monitoring

### Logging Errors

```typescript
function logError(code: ErrorCode, details?: Record<string, unknown>) {
  console.error(`[ERROR ${code}]`, {
    timestamp: new Date().toISOString(),
    code,
    message: ErrorMessages[code],
    details
  });
}

// Usage
try {
  await operation();
} catch (error) {
  if (hasErrorCode(error)) {
    logError(error.code, error.details);
  }
  throw error;
}
```

### Error Tracking

Integrate with error tracking services:

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  await operation();
} catch (error) {
  if (hasErrorCode(error)) {
    Sentry.captureException(error, {
      tags: {
        errorCode: error.code
      },
      contexts: {
        errorDetails: error.details
      }
    });
  }
  throw error;
}
```

---

## Internationalization (i18n)

### Translating Error Messages

```typescript
// English (default)
const ErrorMessagesEN: Record<ErrorCode, string> = {
  ECONOMY_6001: "Insufficient gold",
  // ...
};

// Spanish
const ErrorMessagesES: Record<ErrorCode, string> = {
  ECONOMY_6001: "Oro insuficiente",
  // ...
};

// Japanese
const ErrorMessagesJA: Record<ErrorCode, string> = {
  ECONOMY_6001: "ゴールドが不足しています",
  // ...
};

// Get message by locale
function getErrorMessage(code: ErrorCode, locale: string = "en"): string {
  const messages = {
    en: ErrorMessagesEN,
    es: ErrorMessagesES,
    ja: ErrorMessagesJA
  }[locale] || ErrorMessagesEN;

  return messages[code];
}
```

---

## Testing Error Handling

### Unit Tests

```typescript
import { ErrorCode, createError } from "./errorCodes";

describe("Error Codes", () => {
  it("should create error with code", () => {
    const error = createError(ErrorCode.AUTH_REQUIRED);

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(ErrorCode.AUTH_REQUIRED);
    expect(error.message).toBe("Authentication required");
  });

  it("should include details", () => {
    const error = createError(ErrorCode.ECONOMY_INSUFFICIENT_GOLD, {
      required: 100,
      available: 50
    });

    expect(error.details).toEqual({
      required: 100,
      available: 50
    });
  });
});
```

### Integration Tests

```typescript
import { api } from "convex/_generated/api";
import { ErrorCode } from "convex/lib/errorCodes";

describe("Purchase Pack", () => {
  it("should fail with insufficient gold", async () => {
    // Setup: User with 0 gold

    await expect(
      convex.mutation(api.economy.shop.purchasePack, {
        productId: "pack_fire_001"
      })
    ).rejects.toMatchObject({
      code: ErrorCode.ECONOMY_INSUFFICIENT_GOLD
    });
  });
});
```

---

## Error Code Quick Reference

### By Category

```
1xxx: Authentication
2xxx: Authorization
3xxx: Rate Limiting
4xxx: Resource Not Found
5xxx: Validation
6xxx: Economy
7xxx: Social
8xxx: Game
9xxx: System
10xxx: Agent
11xxx: Library/System
```

### Most Common Errors

1. `ECONOMY_6001` - Insufficient gold
2. `ECONOMY_6002` - Insufficient gems
3. `GAME_8004` - Not your turn
4. `AUTH_1001` - Authentication required
5. `VALIDATION_5013` - Invalid deck size
6. `AUTHZ_2003` - Resource forbidden
7. `GAME_8012` - Invalid phase
8. `NOT_FOUND_4006` - Card not found

---

## Future Error Codes

Reserved ranges for future expansion:

- `12xxx`: Tournament system
- `13xxx`: Trading system
- `14xxx`: Guilds/Clans
- `15xxx`: Events/Seasons
- `16xxx`: Cosmetics/Shop
- `17xxx`: Replay system
- `18xxx`: Spectator system
- `19xxx`: Reserved

---

## Migration Guide

### Adding New Error Codes

1. Add to `ErrorCode` object in `convex/lib/errorCodes.ts`
2. Add message to `ErrorMessages` object
3. Update this documentation
4. Add frontend handling if needed
5. Add tests for new error code

### Deprecating Error Codes

1. Mark as deprecated in code comments
2. Update documentation
3. Keep code for backward compatibility
4. Remove after 2 major versions
