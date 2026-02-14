# OSS White-Label TCG Framework for AI Agents

**Date**: 2026-02-14
**Status**: Approved
**Scope**: Architecture design for making `@lunchtable-tcg` a plug-and-play, white-label TCG framework targeting ElizaOS/AI agent operators.

---

## Vision

Ship `@lunchtable-tcg` as a full white-label TCG framework. An ElizaOS agent (or any AI agent) can scaffold, customize, deploy, and operate its own trading card game — and play it. The blockchain/token layer is opt-in.

## Architecture

```
Consumer Layer
  ElizaOS Plugin  |  MCP Server  |  Web UI (Next.js)
        |                |              |
Backend Layer (Convex)
  Component packages: economy, marketplace,
  progression, competitive, social, etc.
  Installed via create-lunchtable-tcg CLI
        |
Engine Layer
  @lunchtable-tcg/engine — pure TypeScript, zero deps
  Rules, state machine, card defs, AI decision API
  Runs anywhere: server, browser, edge, agents
```

**Key principle**: The engine is the product. Everything else is infrastructure.

## Package Scope

All packages publish under `@lunchtable-tcg/*`:

| Package | Type | Purpose |
|---------|------|---------|
| `@lunchtable-tcg/engine` | Pure TS | Game rules, state machine, card defs, masking |
| `@lunchtable-tcg/config` | Pure TS | Config schema, defaults, validation |
| `@lunchtable-tcg/cards` | Convex | Card definitions, inventory, decks |
| `@lunchtable-tcg/game` | Convex | Lobbies, events, game states, matchmaking |
| `@lunchtable-tcg/economy` | Convex | Currency, shop, packs, rewards, sales |
| `@lunchtable-tcg/progression` | Convex | Achievements, quests, battle pass |
| `@lunchtable-tcg/competitive` | Convex | Leaderboards, tournaments |
| `@lunchtable-tcg/seasons` | Convex | Competitive seasons, rankings |
| `@lunchtable-tcg/story` | Convex | Story chapters, stages, progress |
| `@lunchtable-tcg/guilds` | Convex | Guild management, chat, discovery |
| `@lunchtable-tcg/social` | Convex | Friends, DMs, presence, notifications |
| `@lunchtable-tcg/content` | Convex | Scheduled content, news, feedback |
| `@lunchtable-tcg/email` | Convex | Templates, subscriber lists |
| `@lunchtable-tcg/marketplace` | Convex | Listings, bids, shop, analytics |
| `@lunchtable-tcg/payments` | Convex | Stripe, gem packages |
| `@lunchtable-tcg/referrals` | Convex | Referral links, tracking |
| `@lunchtable-tcg/admin` | Convex | Roles, audit, moderation, config |
| `@lunchtable-tcg/ai` | Convex | Agent decisions, chat sessions |
| `@lunchtable-tcg/webhooks` | Convex | Webhook config and management |
| `@lunchtable-tcg/token` | Convex | Balances, transactions (optional crypto) |
| `@lunchtable-tcg/treasury` | Convex | Wallet management (optional crypto) |
| `@elizaos/plugin-ltcg` | ElizaOS | Agent player + operator plugin |
| `@lunchtable-tcg/mcp-server` | MCP | AI agent game interface |
| `create-lunchtable-tcg` | CLI | Project scaffolder |

## 1. Engine: `@lunchtable-tcg/engine`

Pure TypeScript, zero dependencies. Extracted from `convex/gameplay/gameEngine/`.

### API Surface

```typescript
import { createEngine, defineCards } from "@lunchtable-tcg/engine";

// Define cards
const cards = defineCards([
  { id: "card-001", type: "stereotype", attack: 1800, defense: 1200, ... },
  { id: "card-002", type: "trap", effect: "destroy_all_attacking", ... },
]);

// Create engine with rules
const engine = createEngine({
  cards,
  rules: { startingLP: 8000, deckSize: 40, maxHandSize: 7 },
});

// Decider: command in -> events out
const events = engine.decide(state, { type: "PLAY_CARD", cardId: "card-001", position: "attack" });

// Reducer: apply events to state
const newState = events.reduce(engine.evolve, state);

// Masking: hide opponent's hidden info
const playerView = engine.mask(newState, "player1");

// Legal moves: what can this player do?
const moves = engine.legalMoves(state, "player1");
```

### What it contains

- Game state machine (phases: Draw, Main, Combat, Breakdown, End)
- Card definition schema + validation
- Command/event types (decider pattern)
- AI decision interface (`legalMoves` given a state)
- State masking (hide hand/facedowns per player)
- Rule variant configuration

### What it does NOT contain

- Database access, Convex, HTTP, WebSockets
- UI components
- Economy, progression, matchmaking

### Source

Extracted from:
- `convex/gameplay/gameEngine/stateBasedActions.ts`
- `convex/gameplay/gameEngine/` (all game logic files)
- Card effect definitions
- Phase/turn logic

Aligns with the event-sourced engine design in `docs/plans/2026-02-14-event-sourced-match-engine-design.md`.

## 2. Config: `@lunchtable-tcg/config`

New package. Central config schema that all components read from.

```typescript
// lunchtable-tcg.config.ts (project root)
import { defineConfig } from "@lunchtable-tcg/config";

export default defineConfig({
  game: {
    name: "Milady Battle Cards",
    engine: { startingLP: 8000, deckSize: 40, maxHandSize: 7 },
  },
  economy: {
    startingCurrency: 1000,
    packPrice: 100,
    rarityWeights: { common: 60, uncommon: 25, rare: 10, legendary: 5 },
    wagerWinnerPct: 0.9,
  },
  progression: {
    xp: { rankedWin: 30, rankedLoss: 10, casualWin: 15, casualLoss: 5 },
    levelCurve: "exponential",
  },
  cards: "./cards/",
  theme: {
    brand: "Milady",
    palette: { primary: "#ff69b4", secondary: "#1a1a2e" },
  },
  blockchain: {
    enabled: false,
  },
});
```

Replaces hardcoded constants in `convex/lib/constants.ts`. Each component reads from shared config rather than importing constants directly.

## 3. Component Tiers

Packages grouped into tiers for the CLI scaffolder:

| Tier | Packages | Required? |
|------|----------|-----------|
| **Core** | `engine`, `config`, `cards`, `game`, `economy` | Yes |
| **Engagement** | `progression`, `competitive`, `seasons`, `story` | No |
| **Social** | `guilds`, `social`, `content`, `email` | No |
| **Monetization** | `marketplace`, `payments`, `referrals` | No |
| **Operations** | `admin`, `ai`, `webhooks` | No |
| **Crypto** | `token`, `treasury` | No |

Core tier is the minimum playable TCG.

## 4. CLI: `create-lunchtable-tcg`

```bash
npx create-lunchtable-tcg my-card-game
```

Interactive prompts select game name, tiers, ElizaOS plugin, MCP server, web UI.

### Generated structure

```
my-card-game/
├── lunchtable-tcg.config.ts
├── cards/
│   ├── stereotypes/
│   ├── spells/
│   └── traps/
├── convex/
│   ├── convex.config.ts      # only selected components
│   ├── schema.ts
│   └── lib/
├── apps/
│   └── web/                   # Next.js (optional)
├── plugins/
│   ├── elizaos/               # ElizaOS plugin (optional)
│   └── mcp/                   # MCP server (optional)
└── package.json
```

Implementation: thin wrapper using `@clack/prompts`. Copies from a `templates/` directory, runs string replacements for game name/branding, removes unselected tiers.

## 5. ElizaOS Plugin: `@elizaos/plugin-ltcg`

Agent acts as both player and operator.

### Player Actions

| Action | Description |
|--------|-------------|
| `playCard` | Play a card from hand |
| `attack` | Declare attack with a stereotype |
| `activateTrap` | Activate face-down trap |
| `buildDeck` | Construct a deck from collection |
| `joinMatch` | Queue for a match |
| `openPack` | Open a card pack |
| `tradeCard` | List/bid on marketplace |

### Operator Actions

| Action | Description |
|--------|-------------|
| `createCard` | Define new cards |
| `adjustEconomy` | Tune currency/pricing |
| `runTournament` | Create and manage tournaments |
| `banPlayer` | Moderate |
| `setSeason` | Configure competitive season |

### Providers

| Provider | Context supplied |
|----------|-----------------|
| `gameState` | Current match state, hand, board |
| `collection` | Agent's card collection |
| `economy` | Currency balance, shop prices |
| `leaderboard` | Rankings, standings |
| `meta` | Win rates by card/deck archetype |

### Services

| Service | Purpose |
|---------|---------|
| `matchService` | Connection to active game |
| `convexService` | Convex client connection |

### Agent-to-Agent Gameplay

Two ElizaOS agents play each other through the standard message bus. `GAME_CHALLENGE` action creates a lobby. Both agents take turns via `playCard` handlers. The engine SDK runs rules — agents submit commands.

Agent personality (play style, trash talk, operator decisions) comes from the ElizaOS character file, not the plugin.

## 6. Migration Plan (Current Codebase)

| Area | Change | Effort |
|------|--------|--------|
| Extract `@lunchtable-tcg/engine` | Pull game rules from `convex/gameplay/gameEngine/` into pure TS | Large |
| Create `@lunchtable-tcg/config` | Config schema + defaults. Components read config instead of constants | Medium |
| Refactor constants | Move `convex/lib/constants.ts` values into config defaults | Small |
| Template-ize monorepo | Create `templates/` directory with scaffold source | Medium |
| Build `create-lunchtable-tcg` CLI | Scaffolder using `@clack/prompts` | Small |
| Expand `@elizaos/plugin-ltcg` | Add operator actions, providers, match service | Medium |
| Expand MCP server | Add operator tools alongside player tools | Small |
| Card definition format | Standardize as JSON/TS files loadable by engine | Medium |
| Documentation | README per package, getting-started, card authoring guide | Medium |

### Execution order

1. **Engine extraction** — the foundation everything else depends on
2. **Config package** — unblocks component refactoring
3. **Component refactoring** — read from config instead of constants
4. **Card definition format** — standardize for engine + components
5. **ElizaOS plugin expansion** — player + operator actions
6. **CLI scaffolder** — template from the working monorepo
7. **Documentation** — READMEs, guides, examples

## Decisions

- Package scope stays `@lunchtable-tcg/*`
- Blockchain/token layer is opt-in (disabled by default)
- CLI scaffold + self-hosted Convex deployment model
- Engine is pure TS, zero deps, decider/reducer pattern
- ElizaOS agents are both players and operators
- Agent personality comes from character files, not plugin code
