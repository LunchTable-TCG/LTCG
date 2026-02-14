# Event-Sourced Match Engine Design

**Date**: 2026-02-14
**Status**: Approved

## Architecture Overview

Three-layer split:

1. **`@ltcg/engine`** (pure TypeScript, zero dependencies) - Game rules, state machine, masking
2. **`@lunchtable-tcg/match`** (Convex component) - Persistence, real-time queries, server authority
3. **TanStack Start migration** (apps/web) - Client routing, hooks, UI state

### Why Two Packages?

Convex components cannot export pure functions for client-side import. The engine must run on both server (Convex mutations) and client (optimistic updates, agent bots, tests). Splitting into a pure TS package + Convex component solves this.

## Package 1: `@ltcg/engine`

Location: `packages/engine/`

### Core Pattern: Decider

```
decide(state, command) -> events[]    // Validate + produce events
evolve(state, event)   -> state       // Apply event (the reducer)
mask(state, seat)      -> PlayerView  // Strip hidden info per seat
```

### Type System

```typescript
// Seats
type Seat = "host" | "away";

// Commands (player actions)
type Command =
  | { type: "SUMMON"; cardId: string; position: "attack" | "defense" }
  | { type: "SET_SPELL_TRAP"; cardId: string }
  | { type: "ACTIVATE_SPELL"; cardId: string; targets?: string[] }
  | { type: "DECLARE_ATTACK"; attackerId: string; targetId?: string }
  | { type: "ENTER_COMBAT" }
  | { type: "END_TURN" }
  | { type: "RESPOND_OPTIONAL_TRIGGER"; cardId: string; effectIndex: number; activate: boolean }
  | { type: "RESPOND_CHAIN"; cardId?: string; pass: boolean }
  | { type: "SURRENDER" };

// Events (facts that happened)
type EngineEvent =
  | { type: "CARD_DRAWN"; seat: Seat; cardId: string }
  | { type: "STEREOTYPE_SUMMONED"; seat: Seat; cardId: string; position: "attack" | "defense" }
  | { type: "SPELL_TRAP_SET"; seat: Seat; cardId: string }
  | { type: "ATTACK_DECLARED"; seat: Seat; attackerId: string; targetId?: string }
  | { type: "DAMAGE_DEALT"; seat: Seat; amount: number }
  | { type: "CARD_DESTROYED"; cardId: string; reason: "battle" | "effect" | "breakdown" }
  | { type: "VICE_COUNTER_ADDED"; cardId: string; newCount: number }
  | { type: "BREAKDOWN_TRIGGERED"; seat: Seat; cardId: string }
  | { type: "CLOUT_CHANGED"; seat: Seat; amount: number }
  | { type: "PHASE_CHANGED"; phase: Phase }
  | { type: "TURN_STARTED"; seat: Seat; turnNumber: number }
  | { type: "GAME_ENDED"; winner: Seat; reason: string }
  // ... etc

// Phases (5-phase system)
type Phase = "draw" | "main" | "combat" | "breakdown_check" | "end";
```

### File Structure

```
packages/engine/
  src/
    types.ts           # GameState, Command, EngineEvent, PlayerViewState
    decide.ts          # validate command -> events[]
    evolve.ts          # apply event -> new state
    mask.ts            # strip hidden info per seat
    init.ts            # createInitialState(hostDeck, awayDeck)
    rules/
      combat.ts        # damage calc, battle resolution
      summoning.ts     # tribute validation, zone limits
      chain.ts         # chain/priority resolution
      phases.ts        # phase transitions, clout increment
      vice.ts          # vice counters, breakdown triggers
      effects.ts       # spell/trap/ability execution
    index.ts           # barrel export
  package.json
  tsconfig.json
```

### Key Rules

- **Zero dependencies**: No Convex, no Node APIs. Pure TypeScript.
- **Immutable state**: `evolve()` returns a new state object, never mutates.
- **Deterministic**: Same state + same command = same events. Always.
- **Testable**: Import in Vitest, no mocking needed.

## Package 2: `@lunchtable-tcg/match`

Location: `packages/lunchtable-tcg-match/`

### Schema (4 tables)

```typescript
// matches - metadata + lobby info
matches: defineTable({
  matchId: v.string(),           // UUID
  hostId: v.string(),            // user ID
  awayId: v.optional(v.string()),
  status: v.string(),            // "waiting" | "active" | "completed"
  mode: v.string(),              // "casual" | "ranked"
  winner: v.optional(v.string()),
  createdAt: v.number(),
  startedAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),
})

// matchSnapshots - materialized game state (THE source of truth)
matchSnapshots: defineTable({
  matchId: v.string(),
  version: v.number(),           // increments on every action
  state: v.any(),                // Full GameState from engine
  updatedAt: v.number(),
})

// matchEvents - append-only log (for replays/animations, NOT source of truth)
matchEvents: defineTable({
  matchId: v.string(),
  version: v.number(),           // matches snapshot version that produced them
  seat: v.string(),
  events: v.any(),               // EngineEvent[] batch from one action
  command: v.optional(v.any()),  // The command that produced these events
  createdAt: v.number(),
})

// matchPrompts - pending player decisions (optional triggers, chain responses)
matchPrompts: defineTable({
  matchId: v.string(),
  seat: v.string(),
  promptType: v.string(),        // "optional_trigger" | "chain_response" | "target_select"
  data: v.any(),                 // prompt-specific data
  createdAt: v.number(),
})
```

### Mutation Flow (submitAction)

```
1. Load latest matchSnapshot
2. Deserialize state
3. Call engine.decide(state, command) -> events[]
4. Call engine.evolve(state, events) -> newState
5. Save new matchSnapshot (version + 1)
6. Append matchEvents batch
7. Return events (for animation)
```

### Queries

- `getMatchMeta(matchId)` - Status, players, mode
- `getPlayerView(matchId, userId)` - Calls `mask(state, seat)` server-side
- `getRecentEvents(matchId, sinceVersion)` - For animation replay
- `getOpenPrompt(matchId, userId)` - Pending decisions

### Client Class (following LTCGSocial pattern)

```typescript
export class LTCGMatch {
  constructor(private component: typeof api) {}

  async submitAction(ctx: RunMutationCtx, args: { matchId: string; command: Command }) { ... }
  async getPlayerView(ctx: RunQueryCtx, args: { matchId: string; userId: string }) { ... }
  async getRecentEvents(ctx: RunQueryCtx, args: { matchId: string; sinceVersion: number }) { ... }
}
```

## Player View Masking Rules

Server-authoritative masking via `mask(state, seat)`:

| Data | Owner sees | Opponent sees |
|------|-----------|---------------|
| Hand cards | Full card data | Count only |
| Face-down monsters | Full card data | `{ faceDown: true, position }` |
| Face-down spells/traps | Full card data | `{ faceDown: true }` |
| Deck | Count only | Count only |
| Graveyard | Full (public) | Full (public) |
| Banished | Full (public) | Full (public) |
| Life points | Full | Full |
| Clout | Full | Full |
| Vice counters | Full | Full (public info) |

## Agent Parity

Agents use the same `@ltcg/engine` types and `@lunchtable-tcg/match` Convex API. The REST agent API (`/api/agents/*`) wraps the match component's mutations. No separate game logic for agents.

## TanStack Start Migration

Incremental migration from Next.js App Router:

1. Set up TanStack Start with Vite SSR in `apps/web/`
2. Route structure: `src/routes/__root.tsx`, `app/_layout.tsx`, `app/matches/$matchId.tsx`
3. `useMatchStream` hook wraps Convex live queries for `getPlayerView` + `getRecentEvents`
4. React Query for static data (card library, profiles, decks)
5. Convex live queries for real-time data (match state, chat, presence)

## Migration Strategy

**Clean break** - no backward compatibility with old `gameStates` system. The new match system runs alongside the old one during development. Old system is removed once new one is verified.
