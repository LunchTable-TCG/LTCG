# Cards Component Extraction Design

## Overview

Extract the core cards and decks system into a standalone Convex component (`lunchtable-tcg-cards`) so users can plug and play their own card definitions, deck rules, and game variations. Delete the unused card template/design system.

## Component: `packages/lunchtable-tcg-cards/`

### Tables (6)

| Table | Purpose |
|-------|---------|
| `cardDefinitions` | Master card catalog — stats, abilities, rarity, art |
| `playerCards` | Player inventory — which cards each user owns |
| `userDecks` | Deck metadata — name, archetype, active status |
| `deckCards` | Deck composition — cards in each deck (junction table) |
| `starterDeckDefinitions` | Pre-built starter decks for new players |
| `numberedCardRegistry` | Limited edition serial tracking (#1-500) |

All user references use `v.string()` at the boundary (users table stays in main app). Internal cross-references (e.g. `deckCards.cardDefinitionId`) use `v.id()`.

The `templateId` field on `cardDefinitions` is removed — templates are being deleted.

### Tables to Delete (Template System — 6 tables)

| Table | Reason |
|-------|--------|
| `cardTemplates` | Unused template system |
| `cardTemplateBlocks` | Template block elements |
| `cardBackgrounds` | Background images for templates |
| `cardTypeTemplates` | Type-specific template layouts |
| `freeformDesigns` | Freeform card designer |
| `freeformElements` | Freeform designer elements |

Delete associated function files and frontend components.

## Component Functions

### Card Queries
- `getAllCards()` — all active card definitions
- `getCard(cardId)` — single card by ID
- `getCardsBatch(cardIds[])` — batch resolve (critical for game engine performance)
- `getUserCards(userId)` — player's inventory with card details
- `getUserFavoriteCards(userId)` — favorites only
- `getCollectionStats(userId)` — unique/total/favorite counts

### Card Mutations
- `createCardDefinition(...)` — create new card (admin/seeding)
- `updateCardDefinition(...)` — update card stats/abilities
- `toggleCardActive(cardId)` — soft delete/restore
- `addCardsToInventory(userId, cards[])` — add cards (pack opening, rewards, trades)
- `toggleFavorite(userId, playerCardId)` — mark/unmark favorite
- `giveStarterCollection(userId)` — new player starter cards

### Deck Queries
- `getUserDecks(userId)` — all active decks with card counts
- `getDeckWithCards(deckId)` — full deck with card details
- `getDeckStats(deckId)` — element/rarity/cost breakdown
- `validateDeck(deckId)` — validate against configurable game rules

### Deck Mutations
- `createDeck(userId, name)` — create empty deck
- `saveDeck(deckId, cards[])` — save composition (validates ownership + limits)
- `renameDeck(deckId, name)` — rename
- `deleteDeck(deckId)` — soft delete
- `duplicateDeck(deckId, name)` — copy
- `setActiveDeck(userId, deckId)` — validate and return deckId (main app updates users.activeDeckId)
- `selectStarterDeck(userId, deckCode)` — claim starter deck + award cards

### Seed
- `seedStarterCards(cards[], decks[])` — populate card definitions and starter decks

## Boundary Contract

```
Main App (gameStates, marketplace, progression)
    |
    | string cardDefinitionId (cross-component ref)
    | string userId (cross-component ref)
    v
+----------------------------+
|  lunchtable-tcg-cards      |
|                            |
|  v.id("cardDefinitions")   | <- internal
|  v.id("playerCards")       |
|  v.id("userDecks")         |
|  v.id("deckCards")         |
|  v.string() for userId     | <- external
+----------------------------+
```

## Client Class

```typescript
class CardsClient {
  // Card catalog
  getAllCards(ctx): Promise<CardDefinition[]>
  getCard(ctx, cardId: string): Promise<CardDefinition | null>
  getCardsBatch(ctx, cardIds: string[]): Promise<CardDefinition[]>

  // Player inventory
  getUserCards(ctx, userId: string): Promise<PlayerCard[]>
  getUserFavoriteCards(ctx, userId: string): Promise<PlayerCard[]>
  getCollectionStats(ctx, userId: string): Promise<CollectionStats>
  addCardsToInventory(ctx, userId: string, cards: {cardDefinitionId: string, quantity: number, source: string}[]): Promise<void>
  toggleFavorite(ctx, userId: string, playerCardId: string): Promise<boolean>

  // Deck management
  getUserDecks(ctx, userId: string): Promise<UserDeck[]>
  getDeckWithCards(ctx, deckId: string): Promise<DeckWithCards>
  createDeck(ctx, userId: string, name: string): Promise<string>
  saveDeck(ctx, deckId: string, cards: {cardDefinitionId: string, quantity: number}[]): Promise<void>
  renameDeck(ctx, deckId: string, name: string): Promise<void>
  deleteDeck(ctx, deckId: string): Promise<void>
  duplicateDeck(ctx, deckId: string, name: string): Promise<string>
  setActiveDeck(ctx, userId: string, deckId: string): Promise<string>
  selectStarterDeck(ctx, userId: string, deckCode: string): Promise<{deckId: string, cardsReceived: number}>

  // Seeding
  seedCards(ctx, cards: CardSeed[]): Promise<{created: number}>
  seedStarterDecks(ctx, decks: StarterDeckSeed[]): Promise<{created: number}>
}
```

## Configurable Game Rules

The component accepts configuration for game rules, making it adaptable to different card game formats:

```typescript
app.use(cards, {
  deckMinSize: 30,       // minimum cards per deck
  deckMaxSize: 60,       // maximum cards per deck
  maxCopiesPerCard: 3,   // max copies of any card
  maxLegendaryCopies: 1, // max copies of legendary rarity
  maxDecksPerUser: 50,   // max decks per player
});
```

## What Stays in Main App

- **Admin card management** (`convex/admin/cards.ts`) — depends on role system, wraps component functions
- **HTTP deck endpoints** (`convex/http/decks.ts`) — depends on API auth, wraps component functions
- **Game engine** (`convex/gameplay/`) — stores card IDs as `v.string()`, resolves via `getCardsBatch`
- **Marketplace** — references `cardDefinitionId` as `v.string()`
- **Pack opening logic** — in economy module, calls `addCardsToInventory` after generating cards
- **`users.activeDeckId`** — becomes `v.optional(v.string())`, main app manages it
- **Progression** — references card IDs as strings in quest/achievement rewards

## Schema Impact on Main App

After extraction, references to card tables in `convex/schema.ts` change:
- `v.id("cardDefinitions")` → `v.string()` in gameStates, marketplaceListings, packOpeningHistory, etc.
- `v.id("userDecks")` → `v.string()` in users.activeDeckId
- `v.id("playerCards")` → removed (only used within card system)
- `v.id("deckCards")` → removed (only used within card system)

## File Structure

```
packages/lunchtable-tcg-cards/
  package.json
  tsconfig.json
  src/
    component/
      _generated/
      convex.config.ts
      schema.ts          # 6 tables
      cards.ts           # card queries + mutations
      decks.ts           # deck queries + mutations
      seeds.ts           # seeding functions
    client/
      index.ts           # CardsClient class
    index.ts             # package entry
```
