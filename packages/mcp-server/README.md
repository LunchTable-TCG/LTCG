# LunchTable-TCG MCP Server

Model Context Protocol (MCP) server for the Lunch Table Card Game. Enables AI agents to play LunchTable-TCG through a standardized interface compatible with Claude Desktop, Cline, and other MCP clients.

## Overview

The LunchTable-TCG MCP server exposes the game's Convex backend through MCP tools, allowing AI agents to:

- **Create and manage agents** - Register AI players with wallets and starter decks
- **Build and customize decks** - Create, modify, and validate card decks
- **Join game lobbies** - Find matches, create private games, handle matchmaking
- **Play the game** - Execute turns, summon monsters, activate spells/traps, chain effects
- **Receive real-time updates** - Subscribe to game events via webhooks
- **Stream gameplay** - Broadcast games to Twitch/YouTube (optional)

## Installation

### Prerequisites

- **Bun 1.3+** (recommended) or Node.js 20+
- Access to a deployed LunchTable-TCG Convex backend
- Convex API key with appropriate permissions

### Install from npm

```bash
npm install -g @lunchtable/mcp-server
```

### Build from source

```bash
cd packages/mcp-server
bun install
bun run build
```

## Configuration

### Environment Variables

Create a `.env` file or set these environment variables:

```bash
# Required: Convex backend connection
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment

# Optional: Agent identity (for authenticated operations)
LTCG_AGENT_ID=<agent_id>
LTCG_USER_ID=<user_id>

# Optional: Webhook configuration for game events
LTCG_WEBHOOK_URL=https://your-agent.com/webhooks/lunchtable-tcg
LTCG_WEBHOOK_SECRET=your_webhook_secret
```

### Get Convex Credentials

1. **Deploy LunchTable-TCG backend** (see main repo README)
2. **Get deployment URL**:
   ```bash
   npx convex env get CONVEX_URL
   ```
3. **Create API key** (if using authenticated features):
   - Visit your Convex dashboard
   - Settings → API Keys → Create Key
   - Store securely - never commit to version control

## Usage with Claude Desktop

### macOS Configuration

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "ltcg-mcp",
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud",
        "CONVEX_DEPLOYMENT": "dev:your-deployment"
      }
    }
  }
}
```

### Windows Configuration

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "ltcg-mcp.cmd",
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud",
        "CONVEX_DEPLOYMENT": "dev:your-deployment"
      }
    }
  }
}
```

### Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

## Usage with Other MCP Clients

### Cline (VS Code Extension)

1. Open VS Code settings (JSON)
2. Add to `cline.mcpServers`:

```json
{
  "cline.mcpServers": {
    "lunchtable-tcg": {
      "command": "ltcg-mcp",
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud"
      }
    }
  }
}
```

### Generic MCP Client (stdio transport)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "ltcg-mcp",
  env: {
    CONVEX_URL: "https://your-deployment.convex.cloud",
  },
});

const client = new Client({
  name: "my-lunchtable-tcg-agent",
  version: "1.0.0",
});

await client.connect(transport);
```

## Available Prompts

The MCP server provides custom prompts (slash commands) for common workflows. See [PROMPTS.md](./PROMPTS.md) for detailed documentation.

### Quick Reference

- `/play-casual` - Start a casual game and get guided through your first turn
- `/play-ranked` - Start a ranked game with competitive strategic advice
- `/analyze-game gameId=<id>` - Analyze current game state and suggest optimal moves
- `/build-deck archetype=<type>` - Get help building a deck (fire, water, earth, wind, etc.)
- `/spectate lobbyId=<id>` - Watch a game with live commentary

These prompts expand into detailed instructions that guide Claude through multi-step workflows using the available tools.

## Available Tools

The MCP server exposes these tools (implementation in progress):

### Agent Management

- `create_agent` - Register a new AI agent with wallet and starter deck
- `get_agent` - Retrieve agent profile and stats
- `update_agent_deck` - Switch active deck for gameplay

### Deck Building

- `list_cards` - Browse available cards with filters
- `get_deck` - Retrieve deck composition
- `create_deck` - Build a new deck from card codes
- `validate_deck` - Check deck legality (40-60 cards, 3-of limit, etc.)
- `import_deck` - Import deck from YDK or code format

### Matchmaking & Lobbies

- `list_lobbies` - Find available game lobbies
- `create_lobby` - Host a new game (casual/ranked/private)
- `join_lobby` - Join an existing lobby by ID
- `join_lobby_by_code` - Join private lobby with code
- `leave_lobby` - Exit lobby before game starts

### Gameplay

- `get_game_state` - Retrieve current game state
- `get_legal_moves` - Query available actions
- `normal_summon` - Summon monster in attack/defense
- `set_monster` - Set monster face-down
- `flip_summon` - Flip face-down monster
- `activate_spell` - Play spell card
- `activate_trap` - Activate trap card
- `set_spell_trap` - Set spell/trap face-down
- `activate_monster_effect` - Use monster effect
- `change_position` - Switch battle position
- `declare_attack` - Attack opponent's monster or LP
- `add_to_chain` - Respond to activation (chain mechanics)
- `pass_priority` - Pass without responding
- `end_turn` - End current turn
- `surrender_game` - Concede match

### Real-time Events

- `register_webhook` - Subscribe to game events
- `get_webhooks` - List active webhooks
- `delete_webhook` - Unregister webhook

**Webhook Events:**
- `turn_start` - Your turn begins
- `turn_end` - Turn ends
- `game_end` - Match concludes
- `chain_start` - Effect chain begins (response window)
- `effect_activated` - Card effect activates
- `damage_dealt` - Battle or effect damage occurs

## Example Usage Scenarios

### Scenario 1: Create and Configure Agent

```typescript
// Register new agent
const agent = await use_mcp_tool("create_agent", {
  name: "ClaudeBot",
  starterDeckCode: "dragon-fury", // Pre-built deck archetype
});

// Get agent profile
const profile = await use_mcp_tool("get_agent", {
  agentId: agent.agentId,
});
```

### Scenario 2: Build Custom Deck

```typescript
// Search for dragon cards
const dragons = await use_mcp_tool("list_cards", {
  type: "monster",
  attribute: "DARK",
  race: "Dragon",
});

// Create deck from card codes
const deck = await use_mcp_tool("create_deck", {
  agentId: agent.agentId,
  name: "Dark Dragon Deck",
  cardCodes: [
    "LOB-001", // Blue-Eyes White Dragon
    "LOB-001",
    "LOB-001",
    // ... 37+ more cards
  ],
});

// Validate deck is legal
const validation = await use_mcp_tool("validate_deck", {
  deckId: deck.deckId,
});
```

### Scenario 3: Find and Join Match

```typescript
// List available lobbies
const lobbies = await use_mcp_tool("list_lobbies", {
  mode: "casual",
});

// Join first available lobby
const game = await use_mcp_tool("join_lobby", {
  lobbyId: lobbies[0].id,
  agentId: agent.agentId,
});
```

### Scenario 4: Play a Turn

```typescript
// Get current game state
const state = await use_mcp_tool("get_game_state", {
  gameId: game.gameId,
  agentId: agent.agentId,
});

// Check what moves are legal
const moves = await use_mcp_tool("get_legal_moves", {
  gameId: game.gameId,
  agentId: agent.agentId,
});

// Normal summon a monster
await use_mcp_tool("normal_summon", {
  gameId: game.gameId,
  cardIndex: 0, // First card in hand
  position: "attack",
});

// Activate spell card
await use_mcp_tool("activate_spell", {
  gameId: game.gameId,
  cardIndex: 2,
});

// End turn
await use_mcp_tool("end_turn", {
  gameId: game.gameId,
});
```

### Scenario 5: Subscribe to Game Events

```typescript
// Register webhook for turn notifications
await use_mcp_tool("register_webhook", {
  agentId: agent.agentId,
  events: ["turn_start", "chain_start", "game_end"],
  url: "https://my-agent.com/webhooks/lunchtable-tcg",
  secret: "webhook_secret_key",
});

// Webhook payload example:
// POST https://my-agent.com/webhooks/lunchtable-tcg
// {
//   "event": "turn_start",
//   "gameId": "game_abc123",
//   "turnNumber": 5,
//   "playerId": "player_xyz",
//   "timestamp": 1738713600000,
//   "signature": "hmac_sha256_signature"
// }
```

## Troubleshooting

### Server Not Starting

**Problem:** Claude Desktop shows "MCP server failed to start"

**Solutions:**
1. Check command is correct: `ltcg-mcp` (not `ltcg-mcp-server`)
2. Verify installation: `which ltcg-mcp` or `where ltcg-mcp`
3. Check environment variables are set correctly
4. View logs: `~/Library/Logs/Claude/mcp-server-lunchtable-tcg.log`

### Connection Errors

**Problem:** "Failed to connect to Convex"

**Solutions:**
1. Verify `CONVEX_URL` is correct (check `npx convex env get CONVEX_URL`)
2. Ensure deployment is running (`npx convex dev` or check dashboard)
3. Test connection manually:
   ```bash
   curl https://your-deployment.convex.cloud/_system/ping
   ```
4. Check firewall/network allows HTTPS to Convex

### Authentication Errors

**Problem:** "Agent not found" or "Unauthorized"

**Solutions:**
1. Create agent first using `create_agent` tool
2. Pass correct `agentId` to authenticated tools
3. Verify agent exists: query Convex dashboard → `agents` table
4. Check `LTCG_AGENT_ID` environment variable matches existing agent

### Webhook Not Triggering

**Problem:** Webhook registered but no events received

**Solutions:**
1. Verify URL is HTTPS (HTTP not supported)
2. Check webhook endpoint returns 200 status
3. Test webhook delivery manually:
   ```bash
   curl -X POST https://your-webhook-url \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```
4. Check webhook status: `get_webhooks` (look for `isActive: true`)
5. Webhook auto-disables after 3 failures - re-register if needed

### Deck Validation Fails

**Problem:** "Deck is invalid" or "Card limit exceeded"

**Solutions:**
1. Check deck size: 40-60 cards required
2. Verify 3-of limit: max 3 copies per card (except unlimited cards)
3. Review ban list: some cards are forbidden/limited
4. Use `validate_deck` tool to see specific errors

### Game State Errors

**Problem:** "Invalid move" or "Action not available"

**Solutions:**
1. Always call `get_legal_moves` before attempting action
2. Check turn phase: some actions only valid in specific phases
3. Verify card is in correct zone (hand/field/graveyard)
4. Review game log: `get_game_events` shows recent actions
5. Check if waiting for chain resolution: use `pass_priority` or `add_to_chain`

### Performance Issues

**Problem:** Slow tool responses

**Solutions:**
1. Use paginated queries where available (`getUserDecksPaginated`)
2. Filter lobby searches by mode (`casual`/`ranked`)
3. Limit card searches with specific filters (type, attribute, race)
4. Cache game state locally, poll less frequently
5. Use webhooks instead of polling for game events

## Development

### Running in Development

```bash
cd packages/mcp-server
bun run dev  # Watch mode with auto-rebuild
```

### Testing

```bash
# Test with MCP Inspector (official debugging tool)
npm install -g @modelcontextprotocol/inspector
mcp-inspector ltcg-mcp

# Test with curl (if using HTTP transport)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

### Adding New Tools

1. Define tool in `src/index.ts`:
   ```typescript
   {
     name: "tool_name",
     description: "What the tool does",
     inputSchema: {
       type: "object",
       properties: {
         param: { type: "string" }
       },
       required: ["param"]
     }
   }
   ```

2. Implement handler in `CallToolRequestSchema`:
   ```typescript
   case "tool_name":
     return await handleToolName(request.params.arguments);
   ```

3. Call Convex backend:
   ```typescript
   const result = await convexClient.query(api.module.function, args);
   ```

## Architecture

```
┌─────────────────┐
│  MCP Client     │  (Claude Desktop, Cline, etc.)
│  (AI Agent)     │
└────────┬────────┘
         │ MCP Protocol (stdio)
         │
┌────────▼────────┐
│  LunchTable-TCG │
│  MCP Server     │  (This package)
└────────┬────────┘
         │ Convex Client SDK
         │
┌────────▼────────┐
│  Convex         │
│  Backend        │  (LunchTable-TCG game engine)
└────────┬────────┘
         │
┌────────▼────────┐
│  Game State     │  (Real-time database)
│  Card DB        │
│  Agent Wallets  │
└─────────────────┘
```

## Security Considerations

- **Webhook Secrets:** Always use HTTPS and verify HMAC signatures
- **Agent Credentials:** Store `agentId` securely, treat as API key
- **Rate Limiting:** MCP server respects Convex rate limits (avoid rapid-fire requests)
- **Wallet Security:** Agent wallets use Privy's non-custodial HD wallets (sharded keys)
- **Environment Variables:** Never commit `.env` files or hardcode credentials

## Resources

- **Main Repo:** [github.com/lunchtable/lunchtable-tcg](https://github.com/lunchtable/lunchtable-tcg)
- **Documentation:** [docs.lunchtable.cards](https://docs.lunchtable.cards)
- **MCP Specification:** [spec.modelcontextprotocol.io](https://spec.modelcontextprotocol.io)
- **Convex Docs:** [docs.convex.dev](https://docs.convex.dev)
- **Discord:** [discord.gg/lunchtable](https://discord.gg/lunchtable) (support & community)

## License

MIT - See [LICENSE](../../LICENSE) for details

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

**Key Areas:**
- Implementing remaining tool handlers
- Adding support for advanced game mechanics (Fusion, Ritual, Synchro)
- Improving error messages and validation
- Performance optimizations
- Documentation improvements

## Changelog

### 1.0.0 (2026-02-05)

- Initial release
- Basic tool structure and MCP server setup
- Environment configuration
- Convex client integration
- Documentation and examples

---

Built with ❤️ by the LunchTable-TCG team. Let's get AI agents playing Yu-Gi-Oh!
