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

## Dual-Mode Transport Architecture

The MCP server supports **two transport modes** for maximum flexibility:

| Transport | Use Case | Benefits | Configuration |
|-----------|----------|----------|---------------|
| **Stdio** | Local development, Claude Desktop | Zero-latency, no network overhead, simple setup | `MCP_TRANSPORT=stdio` (default) |
| **HTTP** | Remote deployment, cloud hosting, multiple clients | Scalable, accessible from anywhere, load-balanceable | `MCP_TRANSPORT=http` |

### When to Use Each Mode

**Use Stdio Transport when:**
- Developing locally with Claude Desktop or Cline
- Running the MCP server on the same machine as the MCP client
- You need minimal latency and don't require remote access
- Testing and debugging locally

**Use HTTP Transport when:**
- Deploying to cloud platforms (Vercel, Railway, Docker, etc.)
- Serving multiple MCP clients from a single server
- Accessing the MCP server from remote machines or different networks
- Implementing load balancing or horizontal scaling
- Building production AI agent systems

Configure via the `MCP_TRANSPORT` environment variable. See [docs/HTTP_TRANSPORT.md](./docs/HTTP_TRANSPORT.md) for detailed HTTP transport documentation and [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for deployment guides.

## Configuration

### Environment Variables

Create a `.env` file or set these environment variables:

**Required (all modes):**
```bash
LTCG_API_KEY=your_ltcg_api_key_here  # API key for LunchTable-TCG backend
```

**Optional (all modes):**
```bash
LTCG_API_URL=https://lunchtable.cards  # Backend API URL
MCP_TRANSPORT=stdio                     # Transport mode: "stdio" or "http" (default: "stdio")
```

**HTTP Mode Configuration:**
```bash
PORT=3000                              # HTTP server port (default: 3000)
ALLOWED_ORIGINS=*                      # CORS origins (comma-separated, default: *)
MCP_API_KEY=your_mcp_api_key_here     # Optional: Require authentication for MCP clients
```

**Example `.env` for HTTP deployment:**
```bash
LTCG_API_KEY=ltcg_live_abc123xyz
LTCG_API_URL=https://lunchtable.cards
MCP_TRANSPORT=http
PORT=8080
ALLOWED_ORIGINS=https://your-frontend.com,https://app.example.com
MCP_API_KEY=mcp_secret_key_here
```

### Legacy Configuration (for reference)

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

## Usage

### Stdio Mode (Local Development)

**Start the server:**

```bash
MCP_TRANSPORT=stdio bun run start:stdio
# or
MCP_TRANSPORT=stdio node dist/index.js
```

**Claude Desktop Configuration (macOS):**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "LTCG_API_KEY": "your_api_key_here",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

**Claude Desktop Configuration (Windows):**

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lunchtable-tcg": {
      "command": "node",
      "args": ["C:\\path\\to\\packages\\mcp-server\\dist\\index.js"],
      "env": {
        "LTCG_API_KEY": "your_api_key_here",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

**Restart Claude Desktop** to load the MCP server.

### HTTP Mode (Remote Deployment)

**Start the server:**

```bash
# Using environment variables
MCP_TRANSPORT=http PORT=3000 bun run start:http

# Or with .env file
echo "MCP_TRANSPORT=http" >> .env
echo "PORT=3000" >> .env
bun run start:http

# Using Node.js
MCP_TRANSPORT=http PORT=3000 node dist/index.js
```

**Server Endpoints:**

| Method | Endpoint | Purpose | Headers Required |
|--------|----------|---------|------------------|
| `POST` | `/mcp` | Main MCP JSON-RPC requests | `Content-Type`, `Authorization` (if enabled), `Mcp-Session-Id` (after init) |
| `DELETE` | `/mcp` | Terminate session | `Mcp-Session-Id` |
| `GET` | `/health` | Health check | None |

**Making Requests:**

```bash
# 1. Health check
curl http://localhost:3000/health
# Response: {"status":"healthy","transport":"http","sessions":0}

# 2. Initialize MCP session
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
# Response includes: Mcp-Session-Id header (save this for subsequent requests)

# 3. List available tools (using session ID from step 2)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -H "Mcp-Session-Id: SESSION_ID_FROM_STEP_2" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# 4. Call a tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -H "Mcp-Session-Id: SESSION_ID_FROM_STEP_2" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_lobbies",
      "arguments": {
        "mode": "casual"
      }
    }
  }'

# 5. Terminate session when done
curl -X DELETE http://localhost:3000/mcp \
  -H "Mcp-Session-Id: SESSION_ID_FROM_STEP_2"
```

**Client Configuration for Remote MCP Server:**

See [examples/http-client-config.json](./examples/http-client-config.json) for configuration examples for Claude Desktop and other MCP clients.

## Remote Deployment

Deploy the MCP server to cloud platforms for remote access and scalability. Detailed guides available in [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

### Quick Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Set environment variables
vercel env add LTCG_API_KEY
vercel env add MCP_TRANSPORT (set to "http")
vercel env add MCP_API_KEY (optional, for authentication)

# 3. Deploy
vercel --prod
```

Your MCP server will be available at `https://your-project.vercel.app/mcp`

### Quick Deploy to Railway

```bash
# 1. Install Railway CLI
npm install -g railway

# 2. Initialize Railway project
railway init

# 3. Set environment variables
railway variables set LTCG_API_KEY=your_key_here
railway variables set MCP_TRANSPORT=http
railway variables set PORT=3000

# 4. Deploy
railway up
```

Your MCP server will be available at `https://your-project.railway.app/mcp`

### Deploy with Docker

```bash
# Build the image
docker build -t ltcg-mcp-server .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e LTCG_API_KEY=your_key_here \
  -e MCP_TRANSPORT=http \
  -e PORT=3000 \
  -e MCP_API_KEY=your_mcp_key \
  ltcg-mcp-server
```

### Security Best Practices for HTTP Deployment

1. **Always use HTTPS** - Never deploy HTTP-only in production
2. **Set MCP_API_KEY** - Require authentication for all MCP clients
3. **Restrict CORS origins** - Use specific domains instead of `*`
4. **Use environment variables** - Never hardcode secrets
5. **Monitor sessions** - Check `/health` endpoint for active session counts
6. **Implement rate limiting** - Use a reverse proxy (Nginx, Cloudflare) for rate limiting
7. **Rotate API keys regularly** - Update both LTCG_API_KEY and MCP_API_KEY periodically

**Example production configuration:**

```bash
# .env.production
LTCG_API_KEY=ltcg_live_xxxxxxxx
MCP_TRANSPORT=http
PORT=8080
ALLOWED_ORIGINS=https://app.example.com,https://agent.example.com
MCP_API_KEY=strong_random_secret_here
```

For comprehensive deployment guides, load balancing, SSL configuration, and monitoring setup, see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

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
    LTCG_API_KEY: "your_api_key_here",
    MCP_TRANSPORT: "stdio",
  },
});

const client = new Client({
  name: "my-lunchtable-tcg-agent",
  version: "1.0.0",
});

await client.connect(transport);
```

### Generic MCP Client (HTTP transport)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// Custom HTTP transport implementation
class HttpTransport {
  private sessionId?: string;
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async send(message: JSONRPCMessage): Promise<JSONRPCMessage> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify(message),
    });

    // Extract session ID from response
    const newSessionId = response.headers.get("Mcp-Session-Id");
    if (newSessionId) {
      this.sessionId = newSessionId;
    }

    return await response.json();
  }
}

// Connect to remote MCP server
const transport = new HttpTransport(
  "https://your-mcp-server.com",
  "your_mcp_api_key"
);

const client = new Client({
  name: "my-remote-agent",
  version: "1.0.0",
});

await client.connect(transport);
```

For complete HTTP client examples and Claude Desktop configuration for remote servers, see [examples/http-client-config.json](./examples/http-client-config.json).

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

- `ltcg_create_game` - Create a new game lobby (casual/ranked, public/private)
- `ltcg_join_game` - Join an existing lobby by ID (with optional join code for private lobbies)

### Gameplay

**Game State & Information:**
- `ltcg_get_state` - Retrieve current game state for a lobby
- `ltcg_get_legal_moves` - Query available actions and game state

**Monster Actions:**
- `ltcg_summon_monster` - Normal summon monster in attack/defense position
- `ltcg_set_monster` - Set monster face-down in defense position
- `ltcg_flip_summon` - Flip summon a face-down monster
- `ltcg_change_position` - Switch monster between attack/defense

**Spell & Trap Actions:**
- `ltcg_set_spell_trap` - Set spell/trap card face-down
- `ltcg_activate_spell` - Activate a spell card from hand or field
- `ltcg_activate_trap` - Activate a trap card from field
- `ltcg_activate_monster_effect` - Activate a monster card's effect

**Combat:**
- `ltcg_declare_attack` - Attack opponent's monster or directly attack life points

**Chain System:**
- `ltcg_chain_add` - Add a card effect to the current chain
- `ltcg_chain_pass` - Pass priority on the current chain
- `ltcg_chain_resolve` - Resolve the current chain
- `ltcg_chain_get_state` - Get the current chain state

**Phase Management:**
- `ltcg_phase_advance` - Advance to the next game phase
- `ltcg_phase_skip_battle` - Skip the Battle Phase
- `ltcg_phase_skip_to_end` - Skip directly to the End Phase

**Turn & Game Control:**
- `ltcg_end_turn` - End current turn
- `ltcg_surrender` - Surrender/forfeit the current game

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

### Server Not Starting (Stdio Mode)

**Problem:** Claude Desktop shows "MCP server failed to start"

**Solutions:**
1. Check command is correct: `ltcg-mcp` (not `ltcg-mcp-server`)
2. Verify installation: `which ltcg-mcp` or `where ltcg-mcp`
3. Check environment variables are set correctly in Claude Desktop config
4. Ensure `MCP_TRANSPORT=stdio` is set (or omitted, as it's the default)
5. View logs: `~/Library/Logs/Claude/mcp-server-lunchtable-tcg.log`

### Server Not Starting (HTTP Mode)

**Problem:** HTTP server fails to start or crashes immediately

**Solutions:**
1. Check if port is already in use: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
2. Verify `MCP_TRANSPORT=http` is set
3. Check `LTCG_API_KEY` is configured
4. Try a different port: `PORT=8080 bun run start:http`
5. Check console output for specific error messages
6. Verify Bun is installed: `bun --version`

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

### HTTP Transport Issues

**Problem:** "Unauthorized" or "Invalid API key" errors in HTTP mode

**Solutions:**
1. Ensure `Authorization: Bearer YOUR_KEY` header is included in requests
2. Verify `MCP_API_KEY` environment variable matches the key in your request
3. Check that the key doesn't have extra whitespace or newlines
4. If MCP_API_KEY is not set, authentication is disabled (public access)

**Problem:** "Invalid session" error

**Solutions:**
1. Save the `Mcp-Session-Id` header from the `initialize` response
2. Include it in all subsequent requests: `-H "Mcp-Session-Id: YOUR_SESSION_ID"`
3. Sessions expire after 1 hour of inactivity - reinitialize if expired
4. Check session count with `GET /health` endpoint

**Problem:** CORS errors in browser-based clients

**Solutions:**
1. Configure `ALLOWED_ORIGINS` with your client's origin (e.g., `https://app.example.com`)
2. Don't use `*` in production - specify exact origins
3. Ensure your client sends the `Origin` header
4. Check browser console for specific CORS error messages

**Problem:** Slow HTTP responses or timeouts

**Solutions:**
1. Deploy closer to your clients geographically
2. Use a CDN or edge network (Vercel, Cloudflare Workers)
3. Implement HTTP/2 or HTTP/3 for better performance
4. Check `/health` endpoint to monitor session count (high count may indicate memory issues)
5. Consider horizontal scaling with load balancer

### Performance Issues

**Problem:** Slow tool responses

**Solutions:**
1. Use paginated queries where available (`getUserDecksPaginated`)
2. Filter lobby searches by mode (`casual`/`ranked`)
3. Limit card searches with specific filters (type, attribute, race)
4. Cache game state locally, poll less frequently
5. Use webhooks instead of polling for game events
6. In HTTP mode, reuse sessions instead of reinitializing for each request
7. Deploy MCP server geographically close to your backend API

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
