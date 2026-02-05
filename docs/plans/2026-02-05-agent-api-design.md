# LTCG Agent API Integration Design

**Date:** 2026-02-05
**Status:** Approved
**Goal:** Enable OpenClaw agents and other AI frameworks to play LTCG autonomously

## Overview

Build a comprehensive API integration system that allows autonomous AI agents (OpenClaw, ElizaOS, custom agents) to play the Lunch Table Card Game. This leverages the existing internal mutations and API key system while adding HTTP REST endpoints, MCP server support, and OpenClaw skill integration.

## Context

### The OpenClaw/Moltbook Phenomenon

- **OpenClaw**: Open-source autonomous AI agent with 100K+ GitHub stars
- **Moltbook**: AI-only social network with 1.5M+ agents
- **Opportunity**: Make LTCG playable by these autonomous agents

### Current LTCG Architecture

- ✅ API key authentication system (`ltcg_xxxxx...`)
- ✅ Internal mutations that bypass session auth
- ✅ Event streaming endpoint (`/api/agents/events`)
- ✅ Complete game logic (summons, attacks, turns, win conditions)
- ✅ Existing ElizaOS plugin
- ❌ No HTTP REST API for game actions
- ❌ No MCP server support
- ❌ No OpenClaw skill

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Surface | High-level + Low-level | Flexibility for simple and advanced agents |
| Distribution | MCP Server + OpenClaw Skill | Broad compatibility across agent frameworks |
| Authentication | Existing API keys + user accounts | Already implemented, prevents abuse |
| Matchmaking | Any opponent (same queues) | Simpler, faster matchmaking |
| High-level Intelligence | Legal moves + full state | Prevents errors while enabling strategy |
| Notifications | Polling + Webhooks | Multiple options for compatibility |
| Timers | Same for agents and humans | Fair, simple, no special cases |
| Debugging | Errors + Replay + Streaming | Comprehensive developer experience |
| Documentation | OpenAPI + Quickstart + Reference | Complete onboarding |

## Architecture

### Three-Layer System

**Layer 1: HTTP REST API** (`/apps/web/app/api/game/*`)
- Thin wrappers around existing Convex internal mutations
- API key authentication middleware
- Two API levels:
  - **Low-level**: Direct action endpoints
  - **High-level**: Smart endpoint with legal moves

**Layer 2: MCP Server** (`/mcp-servers/ltcg-game/`)
- Exposes game functions as MCP tools
- Works with Claude Desktop, Cline, OpenClaw (future)
- Reuses same authentication

**Layer 3: OpenClaw Skill** (`/integrations/openclaw-skill/`)
- Markdown skill file teaching agents how to play
- Includes rules, strategy, API usage
- Distributed via npm

**Notification System:**
- **Polling**: `GET /api/game/state` (simple)
- **Webhooks**: Register callback URLs (efficient)
- **Future**: WebSocket if needed

## REST API Specification

### Authentication

All endpoints require: `Authorization: Bearer ltcg_xxxxx...`

### Low-Level API (Direct Control)

```
POST /api/game/create
  Body: { mode: "casual" | "ranked", isPrivate: boolean }
  Returns: { lobbyId, joinCode? }

POST /api/game/join
  Body: { lobbyId?, joinCode? }
  Returns: { gameId, lobbyId, opponentUsername }

GET /api/game/state?lobbyId=xxx
  Returns: Full gameState (boards, hands, LP, phase, turn info)

POST /api/game/summon
  Body: { gameId, cardId, position: "attack" | "defense", tributeCardIds? }
  Returns: { success, cardSummoned, position }

POST /api/game/attack
  Body: { gameId, attackerCardId, targetCardId? }
  Returns: { success, damage, destroyed, gameEnded?, winnerId? }

POST /api/game/end-turn
  Body: { gameId }
  Returns: { success, newTurnPlayer, newTurnNumber, gameEnded?, winnerId? }

POST /api/game/set-spell-trap
  Body: { gameId, cardId }

POST /api/game/activate-spell
  Body: { gameId, cardId, targets? }

POST /api/game/change-position
  Body: { gameId, cardId }
```

### High-Level API (Assisted Play)

```
GET /api/game/legal-moves?gameId=xxx
  Returns: {
    canSummon: [{ cardId, cardName, level, requiresTributes, tributeOptions }],
    canAttack: [{ attackerId, attackerName, targets: [...] }],
    canSetSpellTrap: [{ cardId, cardName }],
    canActivateSpell: [{ cardId, cardName, targets? }],
    canChangePosition: [{ cardId, currentPosition }],
    canEndTurn: boolean,
    gameState: { ... }  // Full state included
  }
```

### Debugging APIs

```
GET /api/game/history?gameId=xxx
  Returns: All game events from start to current state

GET /api/game/replay?gameId=xxx
  Returns: Full game replay with timestamps, actions, state changes

POST /api/agents/events  (already exists!)
  Agents emit decision-making process
```

### Webhook Management

```
POST /api/game/webhooks
  Body: {
    events: ["turn_start", "game_end", "game_start"],
    url: "https://agent.example.com/ltcg-webhook",
    secret: "optional_signing_secret"
  }
  Returns: { webhookId, status: "active" }

DELETE /api/game/webhooks/:webhookId
  Unregister webhook
```

## MCP Server Design

### Location
`/mcp-servers/ltcg-game/`

### MCP Tools

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ltcg_create_game",
      description: "Create a new LTCG game lobby",
      inputSchema: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["casual", "ranked"] },
          isPrivate: { type: "boolean" }
        }
      }
    },
    {
      name: "ltcg_join_game",
      description: "Join an existing LTCG game",
      inputSchema: {
        type: "object",
        properties: {
          lobbyId: { type: "string" },
          joinCode: { type: "string" }
        }
      }
    },
    {
      name: "ltcg_get_legal_moves",
      description: "Get all legal moves for current turn with full game state",
      inputSchema: {
        type: "object",
        properties: {
          gameId: { type: "string", required: true }
        }
      }
    },
    {
      name: "ltcg_summon_monster",
      description: "Summon a monster from hand"
    },
    {
      name: "ltcg_declare_attack",
      description: "Attack with a monster"
    },
    {
      name: "ltcg_end_turn",
      description: "End current turn"
    }
    // ... all other game actions
  ]
}));
```

### Configuration

Users add to MCP settings:
```json
{
  "mcpServers": {
    "ltcg-game": {
      "command": "node",
      "args": ["/path/to/ltcg/mcp-servers/ltcg-game/index.js"],
      "env": {
        "LTCG_API_KEY": "ltcg_xxxxx..."
      }
    }
  }
}
```

## OpenClaw Skill

### Location
`/integrations/openclaw-skill/ltcg-game.md`

### Structure

```markdown
# LTCG Trading Card Game

Play the Lunch Table Card Game (LTCG), a Yu-Gi-Oh-inspired online TCG.

## Setup

1. Get your API key from https://lunchtable.cards/agents
2. Set environment variable: `LTCG_API_KEY=ltcg_xxxxx...`

## Game Rules

- 8000 Life Points, lose when LP ≤ 0 or deck runs out
- Draw 5 cards initially
- 1 Normal Summon per turn
- Levels 1-4: no tribute, Levels 5-6: 1 tribute, Levels 7+: 2 tributes
- Turn structure: Draw → Standby → Main1 → Battle → Main2 → End

## How to Play

### Starting a Game
- Create lobby: `POST https://lunchtable.cards/api/game/create`
- Wait for opponent (poll `/api/game/state` until gameId exists)

### Playing Your Turn
1. Check if it's your turn: `GET /api/game/legal-moves?gameId=xxx`
2. If `gameState.currentTurnPlayerId` matches your userId, make moves
3. Available actions in response: canSummon, canAttack, canSetSpellTrap, etc.
4. Execute action (e.g., `POST /api/game/summon`)
5. When done: `POST /api/game/end-turn`

### Basic Strategy
- Summon strongest monster in hand if possible
- Attack if you have monsters and opponent doesn't
- Set Spells/Traps for protection
- Preserve Life Points

## API Endpoints
[Full endpoint reference...]

## Example Game Loop
[Code example showing full game from start to finish...]
```

### Distribution
- Publish as npm package: `@ltcg/openclaw-skill`
- Users install: `openclaw skill add @ltcg/openclaw-skill`
- Also available as direct download

## Error Handling

### Error Response Format

```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "INVALID_ACTION",
    "message": "Cannot summon - already summoned this turn",
    "details": {
      "gameId": "xxx",
      "userId": "yyy",
      "normalSummonedThisTurn": true
    }
  }
}
```

### Error Codes

Reuse existing `ErrorCode.*`:
- `NOT_YOUR_TURN` - Action attempted when it's opponent's turn
- `INVALID_ACTION` - Action not legal in current phase
- `CARD_NOT_FOUND` - Card not in hand/board
- `INSUFFICIENT_TRIBUTES` - Not enough tributes for high-level summon
- `ALREADY_ATTACKED` - Monster already attacked this turn
- `GAME_ENDED` - Action attempted after game ended
- `INVALID_API_KEY` - Authentication failed

## Webhooks & Notifications

### Webhook Payloads

**Turn Start:**
```json
{
  "event": "turn_start",
  "timestamp": 1738800000,
  "gameId": "xxx",
  "lobbyId": "yyy",
  "turnNumber": 5,
  "playerId": "user_zzz",
  "signature": "hmac_sha256_if_secret_provided"
}
```

**Game End:**
```json
{
  "event": "game_end",
  "timestamp": 1738800100,
  "gameId": "xxx",
  "winnerId": "user_zzz",
  "reason": "life_points_zero",
  "finalState": { ... }
}
```

### Polling Alternative

```
GET /api/game/state?lobbyId=xxx
  Returns:
  - currentTurnPlayerId (check if it's you)
  - status: "waiting" | "active" | "completed"
  - lastUpdated: timestamp

Recommended: Poll every 2-3 seconds during active games
```

### Retry Logic
- Webhooks retry 3 times with exponential backoff (1s, 5s, 15s)
- If all retries fail, webhook marked as failed in logs
- Agent can re-register or fall back to polling

## File Structure

### New Files

```
/apps/web/app/api/game/
├── create/route.ts          # POST /api/game/create
├── join/route.ts            # POST /api/game/join
├── state/route.ts           # GET /api/game/state
├── legal-moves/route.ts     # GET /api/game/legal-moves
├── summon/route.ts          # POST /api/game/summon
├── attack/route.ts          # POST /api/game/attack
├── end-turn/route.ts        # POST /api/game/end-turn
├── set-spell-trap/route.ts
├── activate-spell/route.ts
├── change-position/route.ts
├── history/route.ts         # GET /api/game/history
├── webhooks/route.ts        # POST /api/game/webhooks
└── middleware/
    └── auth.ts              # API key authentication middleware

/mcp-servers/ltcg-game/
├── package.json
├── index.ts                 # MCP server entry point
├── tools/                   # Tool implementations
│   ├── createGame.ts
│   ├── joinGame.ts
│   ├── getLegalMoves.ts
│   └── ... (all game actions)
└── README.md

/integrations/openclaw-skill/
├── ltcg-game.md            # OpenClaw skill definition
├── package.json            # For npm distribution
└── examples/
    └── basic-agent.ts      # Reference implementation

/convex/gameplay/
├── legalMoves.ts           # NEW: Query to get legal moves
└── webhooks.ts             # NEW: Webhook management

/docs/agents/
├── quickstart.md           # Quick start guide
├── api-reference.md        # Full API docs
└── strategies.md           # Game strategy guide
```

### Convex Schema Changes

```typescript
// Add to schema.ts
webhooks: defineTable({
  agentId: v.id("agents"),
  events: v.array(v.string()),  // ["turn_start", "game_end"]
  url: v.string(),
  secret: v.optional(v.string()),
  isActive: v.boolean(),
  lastTriggered: v.optional(v.number()),
  failureCount: v.number(),
})
  .index("by_agent", ["agentId"])
  .index("by_active", ["isActive"]),
```

## Implementation Plan

### Phase 1: Core API (Week 1)
- [ ] Implement HTTP API endpoints wrapping internal mutations
- [ ] Add API key authentication middleware
- [ ] Create `getLegalMoves` query
- [ ] Test with Postman/curl

### Phase 2: Webhooks (Week 1-2)
- [ ] Implement webhook registration system
- [ ] Add webhook table to Convex schema
- [ ] Create webhook trigger logic in game mutations
- [ ] Test with webhook.site

### Phase 3: MCP Server (Week 2)
- [ ] Build MCP server with all game tools
- [ ] Test locally with Claude Desktop
- [ ] Publish as npm package

### Phase 4: OpenClaw Skill (Week 2-3)
- [ ] Write skill markdown with full documentation
- [ ] Create reference agent implementation
- [ ] Test with actual OpenClaw installation
- [ ] Publish skill file

### Phase 5: Documentation (Week 3)
- [ ] Generate OpenAPI spec from endpoints
- [ ] Write quick start guide
- [ ] Create video tutorial
- [ ] Add to main docs site

## Testing Strategy

1. **Unit Tests**: Each API endpoint tested in isolation
2. **Integration Tests**: Full game played via API only
3. **Reference Agent**: Build simple bot that can complete a game
4. **Load Testing**: Multiple agents playing simultaneously
5. **Beta Testing**: Invite ElizaOS/OpenClaw community to test

## Success Metrics

- Reference agent can complete 10 games without errors
- API response time < 200ms (p95)
- Webhook delivery success rate > 99%
- At least 3 community-built agents within first month

## Rollout Plan

1. **Beta API** (invite-only) for testing
2. **Public API launch** with rate limits
3. **Announce** on OpenClaw/ElizaOS communities
4. **Monitor** usage and iterate

## Key Considerations

### For Agent Developers

**Authentication Flow:**
1. User creates agent via frontend or API
2. System generates API key (`ltcg_xxxxx...`)
3. Agent stores API key securely
4. Agent validates key on each request

**Decision Context:**
Agents need to analyze:
- My Hand: `gameState.hostHand`
- My Board: `gameState.hostBoard`
- Opponent Board: `gameState.opponentBoard`
- My LP: `gameState.hostLifePoints`
- Opponent LP: `gameState.opponentLifePoints`
- Turn Number: `gameState.turnNumber`
- Current Phase: `gameState.currentPhase`
- Card Details: Query for each card ID

**Turn Timing:**
- Auto-phases: Draw, Standby (auto-execute)
- Interactive phases: Main1, Battle, Main2, End
- Same timer for agents and humans
- No time limit extensions

### Action Validation

All actions validate:
- Is it your turn?
- Is the card in your hand/board?
- Do you have enough tributes?
- Is the target valid?
- Have you already summoned this turn?

Errors returned as exceptions with detailed error codes.

## Future Enhancements

- WebSocket support for real-time notifications
- Agent leaderboards and tournaments
- Advanced strategy API (card advantage, board control metrics)
- Agent vs Agent only queues
- Spectator API for watching games
- Replay analysis tools

## References

- [OpenClaw Official Site](https://openclaw.ai/)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [CNBC: OpenClaw Phenomenon](https://www.cnbc.com/2026/02/02/openclaw-open-source-ai-agent-rise-controversy-clawdbot-moltbot-moltbook.html)
- [ElizaOS Agent Creation Guide](https://metamask.io/news/create-an-ai-agent-that-can-transfer-and-swap-tokens-using-elizaos/)
- Existing LTCG ElizaOS plugin (location TBD)

---

**Next Steps:**
1. Review and approve this design
2. Set up git worktree for isolated development
3. Create detailed implementation plan
4. Begin Phase 1 implementation
