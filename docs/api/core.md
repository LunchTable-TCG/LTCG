# Core Module API Reference

The Core module handles fundamental game data: user accounts, cards, and decks. This module provides the foundation for all other game systems.

## Module Overview

```
convex/core/
├── users.ts          # User queries and authentication
├── cards.ts          # Card definitions and player collections
├── decks.ts          # Deck management and validation
├── userPreferences.ts # User settings and preferences
└── index.ts          # Module exports
```

---

## Users API

File: `convex/core/users.ts`

### Queries

#### `currentUser`

Get the authenticated user's complete profile.

```typescript
const user = await convex.query(api.core.users.currentUser, {});
```

**Parameters**: None

**Returns**: `FullUser | null`
- Returns complete user object with all fields (email, username, stats, ratings, XP, etc.)
- Returns `null` if not authenticated
- Uses Convex Auth session management

**Fields Returned**:
- Authentication: `email`, `username`, `bio`, `createdAt`
- Economy: `gold`, `gems`
- Stats: `totalWins`, `totalLosses`, `rankedWins`, `casualWins`, `storyWins`, `currentWinStreak`, `longestWinStreak`
- Ratings: `rankedElo`, `casualRating`
- Progression: `xp`, `level`
- Deck: `activeDeckId`
- Flags: `isAiAgent`, `isAnonymous`

---

#### `getUser`

Get basic public info for a user by ID.

```typescript
const user = await convex.query(api.core.users.getUser, {
  userId: "j57abc123" as Id<"users">
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| userId | `Id<"users">` | User ID to fetch |

**Returns**: `UserInfo | null`
```typescript
{
  _id: Id<"users">;
  username?: string;
  bio?: string;
  createdAt?: number;
}
```

**Use Cases**:
- Display player card in UI
- Show opponent info during matchmaking
- Friend list previews

---

#### `getUserByUsername`

Get basic public info for a user by username.

```typescript
const user = await convex.query(api.core.users.getUserByUsername, {
  username: "player123"
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| username | `string` | Username to look up (case-insensitive) |

**Returns**: `UserInfo | null`

**Notes**:
- Username lookup is case-insensitive
- Uses indexed query for performance
- Returns same fields as `getUser`

---

#### `getUserProfile`

Get comprehensive public profile with stats for profile dialogs.

```typescript
const profile = await convex.query(api.core.users.getUserProfile, {
  username: "player123"
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| username | `string` | Username to look up (case-insensitive) |

**Returns**: `UserProfile | null`
```typescript
{
  _id: Id<"users">;
  username?: string;
  bio?: string;
  createdAt?: number;

  // Stats
  totalWins: number;        // Default: 0
  totalLosses: number;      // Default: 0
  rankedWins: number;       // Default: 0
  rankedLosses: number;     // Default: 0
  casualWins: number;       // Default: 0
  casualLosses: number;     // Default: 0
  storyWins: number;        // Default: 0

  // Ratings
  rankedElo: number;        // Default: 1000
  casualRating: number;     // Default: 1000

  // Progression
  xp: number;               // Default: 0
  level: number;            // Default: 1

  // Player type
  isAiAgent: boolean;       // Default: false
}
```

**Use Cases**:
- Player profile dialog
- Post-match opponent stats
- Leaderboard details

---

#### `getUserStats`

Get comprehensive stats by user ID (alternative to `getUserProfile`).

```typescript
const stats = await convex.query(api.core.users.getUserStats, {
  userId: "j57abc123" as Id<"users">
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| userId | `Id<"users">` | User ID to fetch stats for |

**Returns**: `UserProfile | null` (same as `getUserProfile`)

**When to Use**:
- Use `getUserProfile` when you have a username
- Use `getUserStats` when you have a user ID

---

## Cards API

File: `convex/core/cards.ts`

### Queries

#### `getAllCardDefinitions`

Get all active card definitions in the game.

```typescript
const cards = await convex.query(api.core.cards.getAllCardDefinitions, {});
```

**Parameters**: None

**Returns**: `Array<CardDefinition>`
```typescript
{
  _id: Id<"cardDefinitions">;
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  archetype: "infernal_dragons" | "abyssal_horrors" | "nature_spirits" | /* ... */;
  cardType: "creature" | "spell" | "trap" | "equipment";
  attack?: number;          // Creatures only
  defense?: number;         // Creatures only
  cost: number;             // Mana cost
  ability?: string;         // Effect description
  flavorText?: string;      // Lore text
  imageUrl?: string;        // Card art URL
  imageStorageId?: Id<"_storage">;  // Convex storage ID
  isActive: boolean;        // Available in game
  createdAt: number;
}
```

**Use Cases**:
- Card browser/encyclopedia
- Deck builder card selection
- Pack opening displays

**Performance**: ~200-500 cards, indexed by `isActive` field.

---

#### `getCardDefinition`

Get a single card definition by ID.

```typescript
const card = await convex.query(api.core.cards.getCardDefinition, {
  cardId: "jd4xyz789" as Id<"cardDefinitions">
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| cardId | `Id<"cardDefinitions">` | Card definition ID |

**Returns**: `CardDefinition | null`

---

#### `getUserCards`

Get all cards owned by the current user with ownership data.

```typescript
const collection = await convex.query(api.core.cards.getUserCards, {});
```

**Parameters**: None (uses authenticated user)

**Returns**: `Array<CardWithOwnership>`
```typescript
{
  id: string;                      // playerCards._id as string
  cardDefinitionId: Id<"cardDefinitions">;
  name: string;
  rarity: Rarity;
  archetype: Archetype;
  element: Element;                // Derived from archetype
  cardType: CardType;
  attack?: number;
  defense?: number;
  cost: number;
  ability?: string;
  flavorText?: string;
  imageUrl?: string;

  // Ownership fields
  owned: number;                   // Quantity owned
  isFavorite: boolean;             // Favorited for quick access
  acquiredAt: number;              // First acquisition timestamp
}
```

**Use Cases**:
- Card binder view
- Deck builder card pool
- Collection statistics

**Performance**: Batched fetching avoids N+1 queries.

---

#### `getUserFavoriteCards`

Get cards marked as favorites by the current user.

```typescript
const favorites = await convex.query(api.core.cards.getUserFavoriteCards, {});
```

**Parameters**: None (uses authenticated user)

**Returns**: `Array<CardWithOwnership>` (same as `getUserCards`)

**Use Cases**:
- Quick deck building
- Favorite cards tab in binder

---

#### `getUserCollectionStats`

Get collection statistics for the current user.

```typescript
const stats = await convex.query(api.core.cards.getUserCollectionStats, {});
```

**Parameters**: None (uses authenticated user)

**Returns**:
```typescript
{
  uniqueCards: number;    // Number of different cards owned
  totalCards: number;     // Total copies across all cards
  favoriteCount: number;  // Number of favorited cards
}
```

**Use Cases**:
- Collection progress displays
- Profile statistics
- Achievement tracking

---

### Mutations

#### `toggleFavorite`

Toggle favorite status on a card.

```typescript
const result = await convex.mutation(api.core.cards.toggleFavorite, {
  playerCardId: "jc9def456"
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| playerCardId | `string` | Player card ID (not card definition ID) |

**Returns**:
```typescript
{
  success: boolean;
  isFavorite: boolean;  // New favorite state
}
```

**Errors**:
- `AUTHZ_RESOURCE_FORBIDDEN`: Card not found or not owned by user

---

#### `addCardsToInventory`

Add cards to a player's inventory (used for pack opening, rewards).

```typescript
const result = await convex.mutation(api.core.cards.addCardsToInventory, {
  cardDefinitionId: "jd4xyz789" as Id<"cardDefinitions">,
  quantity: 3
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| cardDefinitionId | `Id<"cardDefinitions">` | Card to add |
| quantity | `number` | Number of copies |

**Returns**:
```typescript
{
  success: boolean;
  newQuantity: number;  // Total quantity after addition
}
```

**Behavior**:
- If card already owned: increments quantity
- If new card: creates ownership record
- Updates `lastUpdatedAt` timestamp

**Errors**:
- `VALIDATION_INVALID_INPUT`: Card definition not found or inactive

---

#### `giveStarterCollection`

Give player all cards for testing/setup (grants multiple copies based on rarity).

```typescript
const result = await convex.mutation(api.core.cards.giveStarterCollection, {});
```

**Parameters**: None (uses authenticated user)

**Returns**:
```typescript
{
  success: boolean;
  cardsAdded: number;  // Number of unique cards added
}
```

**Quantities by Rarity**:
- Common: 4 copies
- Uncommon: 3 copies
- Rare: 2 copies
- Epic: 1 copy
- Legendary: 1 copy

**Errors**:
- `VALIDATION_INVALID_INPUT`: User already has cards in collection

**Use Cases**:
- Testing/development
- Admin tools
- Special promotions

---

## Decks API

File: `convex/core/decks.ts`

### Constants

```typescript
MAX_DECKS_PER_USER = 50;
MIN_DECK_SIZE = 30;         // Minimum only, no maximum
MAX_COPIES_PER_CARD = 3;
MAX_LEGENDARY_COPIES = 1;
```

### Queries

#### `getUserDecks`

Get all decks for the current user with card counts.

```typescript
const decks = await convex.query(api.core.decks.getUserDecks, {});
```

**Parameters**: None (uses authenticated user)

**Returns**: `Array<DeckWithCount>`
```typescript
{
  id: Id<"userDecks">;
  name: string;
  description?: string;
  deckArchetype?: Archetype;
  cardCount: number;        // Total cards in deck
  createdAt: number;
  updatedAt: number;
}
```

**Behavior**:
- Returns only active decks (soft delete)
- Sorted by most recently updated
- Limited to 50 decks per user

**Note**: Deprecated in favor of `getUserDecksPaginated` for better performance.

---

#### `getUserDecksPaginated`

Get user decks with cursor-based pagination.

```typescript
const result = await convex.query(api.core.decks.getUserDecksPaginated, {
  paginationOpts: { numItems: 10, cursor: null }
});

// Next page
const nextResult = await convex.query(api.core.decks.getUserDecksPaginated, {
  paginationOpts: { numItems: 10, cursor: result.continueCursor }
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| paginationOpts | `PaginationOptions` | Cursor and page size |

**Returns**:
```typescript
{
  page: Array<DeckWithCount>;
  isDone: boolean;
  continueCursor: string | null;
}
```

**Recommended**: Use this instead of `getUserDecks` for large collections.

---

#### `getDeckWithCards`

Get a specific deck with all its cards.

```typescript
const deck = await convex.query(api.core.decks.getDeckWithCards, {
  deckId: "jk2abc789" as Id<"userDecks">
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| deckId | `Id<"userDecks">` | Deck to retrieve |

**Returns**: `DeckWithCards`
```typescript
{
  id: Id<"userDecks">;
  name: string;
  description?: string;
  deckArchetype?: Archetype;
  cards: Array<{
    cardDefinitionId: Id<"cardDefinitions">;
    name: string;
    rarity: Rarity;
    archetype: Archetype;
    element: Element;
    cardType: CardType;
    attack?: number;
    defense?: number;
    cost: number;
    ability?: string;
    flavorText?: string;
    imageUrl?: string;
    quantity: number;       // How many copies in deck
    position?: number;      // Card ordering
  }>;
  createdAt: number;
  updatedAt: number;
}
```

**Errors**:
- `AUTHZ_RESOURCE_FORBIDDEN`: Deck not found or not owned by user

**Use Cases**:
- Deck editor
- Deck view/export
- Matchmaking deck submission

---

#### `getDeckStats`

Get statistical breakdown of a deck.

```typescript
const stats = await convex.query(api.core.decks.getDeckStats, {
  deckId: "jk2abc789" as Id<"userDecks">
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| deckId | `Id<"userDecks">` | Deck to analyze |

**Returns**: `DeckStats`
```typescript
{
  elementCounts: {
    fire: number;
    water: number;
    earth: number;
    wind: number;
    neutral: number;
  };
  rarityCounts: {
    common: number;
    uncommon: number;
    rare: number;
    epic: number;
    legendary: number;
  };
  avgCost: string;          // Average mana cost (formatted)
  creatureCount: number;
  spellCount: number;
  trapCount: number;
  equipmentCount: number;
  totalCards: number;
}
```

**Errors**:
- `AUTHZ_RESOURCE_FORBIDDEN`: Deck not found or not owned by user

**Use Cases**:
- Deck analysis
- Deck builder statistics
- Meta analytics

---

#### `validateDeck`

Validate a deck against game rules.

```typescript
const validation = await convex.query(api.core.decks.validateDeck, {
  deckId: "jk2abc789" as Id<"userDecks">
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| deckId | `Id<"userDecks">` | Deck to validate |

**Returns**:
```typescript
{
  isValid: boolean;
  errors: string[];         // Blocking issues
  warnings: string[];       // Non-blocking suggestions
  totalCards: number;
}
```

**Validation Rules**:
- Minimum 30 cards (no maximum)
- Maximum 3 copies per card
- Maximum 1 copy of legendary cards
- All cards must be active and valid

**Example Errors**:
```typescript
[
  "Deck needs at least 30 cards. Currently has 28.",
  "Dark Magician: Legendary cards limited to 1 copy",
  "Fire Blast: Limited to 3 copies per deck"
]
```

**Errors**:
- `AUTHZ_RESOURCE_FORBIDDEN`: Deck not found or not owned by user

---

### Mutations

#### `createDeck`

Create a new empty deck.

```typescript
const result = await convex.mutation(api.core.decks.createDeck, {
  name: "My Fire Deck",
  description: "Aggressive fire strategy"
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| name | `string` | Deck name (1-50 characters) |
| description | `string?` | Optional deck description |

**Returns**:
```typescript
{
  deckId: Id<"userDecks">;
}
```

**Errors**:
- `VALIDATION_INVALID_INPUT`:
  - Name too short/long
  - Deck limit exceeded (50 decks max)

---

#### `saveDeck`

Save or update a deck's card list.

```typescript
const result = await convex.mutation(api.core.decks.saveDeck, {
  deckId: "jk2abc789" as Id<"userDecks">,
  cards: [
    { cardDefinitionId: "jd4xyz789" as Id<"cardDefinitions">, quantity: 3 },
    { cardDefinitionId: "jd4abc123" as Id<"cardDefinitions">, quantity: 2 },
    // ... more cards
  ]
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| deckId | `Id<"userDecks">` | Deck to update |
| cards | `Array<{ cardDefinitionId, quantity }>` | Card list |

**Returns**:
```typescript
{
  success: boolean;
}
```

**Behavior**:
- Replaces ALL cards in deck with provided list
- Validates minimum 30 cards
- Validates card ownership
- Validates card copy limits
- Auto-sets as active deck if user has none

**Errors**:
- `AUTHZ_RESOURCE_FORBIDDEN`: Deck not owned by user
- `VALIDATION_INVALID_INPUT`:
  - Deck too small (< 30 cards)
  - Card not owned
  - Too many copies
  - Invalid cards

---

#### `renameDeck`

Rename a deck.

```typescript
const result = await convex.mutation(api.core.decks.renameDeck, {
  deckId: "jk2abc789" as Id<"userDecks">,
  newName: "Updated Deck Name"
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| deckId | `Id<"userDecks">` | Deck to rename |
| newName | `string` | New deck name (1-50 characters) |

**Returns**:
```typescript
{
  success: boolean;
}
```

**Errors**:
- `AUTHZ_RESOURCE_FORBIDDEN`: Deck not owned by user
- `VALIDATION_INVALID_INPUT`: Name invalid length

---

#### `deleteDeck`

Delete a deck (soft delete).

```typescript
const result = await convex.mutation(api.core.decks.deleteDeck, {
  deckId: "jk2abc789" as Id<"userDecks">
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| deckId | `Id<"userDecks">` | Deck to delete |

**Returns**:
```typescript
{
  success: boolean;
}
```

**Behavior**:
- Soft delete: sets `isActive = false`
- Deck is hidden from queries
- Can be restored by admin if needed

**Errors**:
- `AUTHZ_RESOURCE_FORBIDDEN`: Deck not owned by user

---

#### `duplicateDeck`

Duplicate an existing deck with a new name.

```typescript
const result = await convex.mutation(api.core.decks.duplicateDeck, {
  sourceDeckId: "jk2abc789" as Id<"userDecks">,
  newName: "Copy of My Deck"
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| sourceDeckId | `Id<"userDecks">` | Deck to copy |
| newName | `string` | Name for the copy (1-50 characters) |

**Returns**:
```typescript
{
  deckId: Id<"userDecks">;  // New deck ID
}
```

**Behavior**:
- Copies all cards from source deck
- Copies description and archetype
- Creates independent deck

**Errors**:
- `AUTHZ_RESOURCE_FORBIDDEN`: Source deck not owned by user
- `VALIDATION_INVALID_INPUT`:
  - Name invalid
  - Deck limit exceeded (50 max)

---

#### `setActiveDeck`

Set a deck as the active deck for matchmaking.

```typescript
const result = await convex.mutation(api.core.decks.setActiveDeck, {
  deckId: "jk2abc789" as Id<"userDecks">
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| deckId | `Id<"userDecks">` | Deck to set as active |

**Returns**:
```typescript
{
  success: boolean;
}
```

**Validation**:
- Deck must have minimum 30 cards
- All cards must be valid
- Must pass card copy limits

**Errors**:
- `AUTHZ_RESOURCE_FORBIDDEN`: Deck not owned by user
- `VALIDATION_INVALID_INPUT`: Deck invalid or too small

**Use Cases**:
- Pre-match deck selection
- Quick match setup

---

#### `selectStarterDeck`

Select and claim a starter deck (one-time only).

```typescript
const result = await convex.mutation(api.core.decks.selectStarterDeck, {
  deckCode: "INFERNAL_DRAGONS"
});
```

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| deckCode | `"INFERNAL_DRAGONS" \| "ABYSSAL_DEPTHS"` | Starter deck code |

**Returns**:
```typescript
{
  success: boolean;
  deckId: Id<"userDecks">;
  deckName: string;
  cardsReceived: number;    // 45 cards
  deckSize: number;         // 45 cards
}
```

**Behavior**:
- Grants all 45 cards from starter deck
- Creates complete ready-to-play deck
- Sets as active deck
- Auto-seeds card definitions if needed
- Can only be claimed once per user

**Starter Decks Available**:
- **INFERNAL_DRAGONS**: Fire-based aggressive deck
- **ABYSSAL_DEPTHS**: Water-based control deck

**Errors**:
- `VALIDATION_INVALID_INPUT`:
  - User already has decks
  - Invalid deck code
  - Card definitions not found

**Use Cases**:
- New player onboarding
- First-time setup

---

## User Preferences API

File: `convex/core/userPreferences.ts`

### Queries

#### `getUserPreferences`

Get user preferences for authenticated user.

```typescript
const prefs = await convex.query(api.core.userPreferences.getUserPreferences, {});
```

**Parameters**: None (uses authenticated user)

**Returns**: `UserPreferences | null`
```typescript
{
  userId: Id<"users">;
  notifications: {
    questComplete: boolean;
    matchInvites: boolean;
    friendRequests: boolean;
    marketplaceSales: boolean;
    dailyReminders: boolean;
    promotions: boolean;
  };
  display: {
    animations: boolean;
    reducedMotion: boolean;
    cardQuality: "low" | "medium" | "high";
    showDamageNumbers: boolean;
  };
  game: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    soundVolume: number;      // 0-100
    musicVolume: number;      // 0-100
    autoEndTurn: boolean;
    confirmActions: boolean;
    showTutorialHints: boolean;
  };
  privacy: {
    profilePublic: boolean;
    showOnlineStatus: boolean;
    allowFriendRequests: boolean;
    showMatchHistory: boolean;
  };
  createdAt: number;
  updatedAt: number;
}
```

**Defaults**: If no preferences exist, returns null. Frontend should use sensible defaults.

---

### Mutations

#### `updateUserPreferences`

Update user preferences (partial update).

```typescript
const result = await convex.mutation(api.core.userPreferences.updateUserPreferences, {
  notifications: {
    questComplete: true,
    matchInvites: false
  },
  game: {
    soundVolume: 75
  }
});
```

**Parameters**: Partial `UserPreferences` object

**Returns**:
```typescript
{
  success: boolean;
}
```

**Behavior**:
- Creates preferences if they don't exist
- Updates only provided fields (partial update)
- Updates `updatedAt` timestamp

---

## Common Patterns

### Check Card Ownership Before Deck Save

```typescript
// Frontend validation
const userCards = await convex.query(api.core.cards.getUserCards, {});
const cardMap = new Map(userCards.map(c => [c.cardDefinitionId, c.owned]));

// Check if user owns enough copies
const deckCards = [
  { cardDefinitionId: "jd4xyz789", quantity: 3 }
];

for (const card of deckCards) {
  const owned = cardMap.get(card.cardDefinitionId) ?? 0;
  if (owned < card.quantity) {
    // Show error: not enough copies
  }
}

// Backend will also validate
await convex.mutation(api.core.decks.saveDeck, {
  deckId,
  cards: deckCards
});
```

---

### Deck Builder Flow

```typescript
// 1. Get user's collection
const collection = await convex.query(api.core.cards.getUserCards, {});

// 2. Create new deck
const { deckId } = await convex.mutation(api.core.decks.createDeck, {
  name: "My Deck"
});

// 3. Add cards to deck
await convex.mutation(api.core.decks.saveDeck, {
  deckId,
  cards: selectedCards
});

// 4. Validate deck
const validation = await convex.query(api.core.decks.validateDeck, { deckId });

if (!validation.isValid) {
  // Show errors
}

// 5. Set as active deck
await convex.mutation(api.core.decks.setActiveDeck, { deckId });
```

---

### Starter Deck Selection

```typescript
// 1. Check if user already has decks
const decks = await convex.query(api.core.decks.getUserDecks, {});

if (decks.length > 0) {
  // User already claimed starter deck
  return;
}

// 2. Select starter deck
const result = await convex.mutation(api.core.decks.selectStarterDeck, {
  deckCode: "INFERNAL_DRAGONS"
});

// Result contains:
// - deckId: New deck ID
// - deckName: "Infernal Dragons"
// - cardsReceived: 45
// - deckSize: 45

// 3. Deck is automatically set as active
```

---

## Error Handling

All Core module functions use structured error codes:

```typescript
import { ErrorCode } from "convex/lib/errorCodes";

try {
  await convex.mutation(api.core.decks.saveDeck, { deckId, cards });
} catch (error) {
  if (error.code === ErrorCode.AUTHZ_RESOURCE_FORBIDDEN) {
    // Deck not owned by user
  } else if (error.code === ErrorCode.VALIDATION_INVALID_INPUT) {
    // Invalid deck composition
  } else if (error.code === ErrorCode.VALIDATION_CARD_OWNERSHIP) {
    // Don't own enough copies
  } else if (error.code === ErrorCode.VALIDATION_DECK_SIZE) {
    // Deck too small (< 30 cards)
  }
}
```

### Common Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| `AUTH_1001` | Not authenticated | Sign in required |
| `AUTHZ_2003` | Resource forbidden | Not your deck/card |
| `VALIDATION_5001` | Invalid input | Check parameters |
| `VALIDATION_5009` | Invalid deck | Check deck rules |
| `VALIDATION_5013` | Deck size invalid | Need 30+ cards |
| `VALIDATION_5014` | Card ownership | Buy/earn more cards |
| `NOT_FOUND_4001` | User not found | User deleted |
| `NOT_FOUND_4006` | Card not found | Card inactive |

---

## Performance Considerations

### Batched Fetching

The Core module uses batched fetching to avoid N+1 queries:

```typescript
// ❌ BAD: N+1 queries
for (const deckCard of deckCards) {
  const cardDef = await ctx.db.get(deckCard.cardDefinitionId);
}

// ✅ GOOD: Batched parallel fetching
const cardDefs = await Promise.all(
  deckCards.map(dc => ctx.db.get(dc.cardDefinitionId))
);
```

### Index Usage

All queries use appropriate indexes:

- `by_user`: Find user's resources
- `by_user_card`: Check card ownership
- `by_deck`: Find cards in deck
- `by_name`: Card name lookup
- `username`: Username lookup (case-insensitive)

### Pagination

Use `getUserDecksPaginated` for large deck collections:

```typescript
// Initial load
const { page, continueCursor } = await convex.query(
  api.core.decks.getUserDecksPaginated,
  { paginationOpts: { numItems: 20 } }
);

// Load more
if (continueCursor) {
  const next = await convex.query(
    api.core.decks.getUserDecksPaginated,
    { paginationOpts: { numItems: 20, cursor: continueCursor } }
  );
}
```

---

## Type Definitions

### Archetype

```typescript
type Archetype =
  | "infernal_dragons"
  | "abyssal_horrors"
  | "nature_spirits"
  | "storm_elementals"
  | "shadow_assassins"
  | "celestial_guardians"
  | "undead_legion"
  | "divine_knights"
  | "arcane_mages"
  | "mechanical_constructs"
  | "neutral";
```

### Rarity

```typescript
type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
```

### CardType

```typescript
type CardType = "creature" | "spell" | "trap" | "equipment";
```

### Element

```typescript
type Element = "fire" | "water" | "earth" | "wind" | "neutral";
```

---

## Migration Notes

### Deprecated Functions

- `getUserDecks`: Use `getUserDecksPaginated` for better performance

### Breaking Changes

None currently. All functions maintain backward compatibility.
