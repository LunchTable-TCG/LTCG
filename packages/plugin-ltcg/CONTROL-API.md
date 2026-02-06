# LTCG External Control API Documentation

The LTCG External Control API allows external systems to command a running ElizaOS agent to play games, trigger story mode, and monitor gameplay in real-time.

## Overview

### Why This Exists

The ElizaOS agent can only be triggered by:
1. Internal actions (evaluated by the agent itself)
2. Webhooks from the game system (e.g., turn_started events)

There was **no way for an external system** to command the agent to "start playing story mode now" or "find a PvP game". This Control API fills that gap, enabling:

- **Scheduled streams** - Trigger story mode at specific times
- **Viewer interactions** - Let viewers start games via chat commands
- **Testing infrastructure** - Automated testing of agent behavior
- **External orchestration** - Coordinate agent activity from other systems

### How It Works

```
External System → Control API → ElizaOS Agent → Game System
                                       ↓
                                  TurnOrchestrator (plays autonomously)
                                       ↓
                                  Streaming (auto-starts)
```

When you trigger story mode via the Control API:
1. **Agent creates a story mode lobby** using the web app API
2. **Auto-streaming kicks in** (if configured in Convex)
3. **Polling service monitors the game** every 1.5 seconds
4. **TurnOrchestrator makes decisions** when it's the agent's turn
5. **Game plays autonomously** until completion

## Authentication

All control endpoints require Bearer token authentication:

```bash
Authorization: Bearer <LTCG_CONTROL_API_KEY>
```

### Setup

1. Generate a secure API key (minimum 16 characters):
   ```bash
   openssl rand -hex 32
   ```

2. Add to `.env`:
   ```bash
   LTCG_CONTROL_API_KEY=your_secure_key_here
   ```

3. The key is automatically loaded by the plugin on startup.

### Security Features

- **Bearer token validation** - Constant-time comparison to prevent timing attacks
- **Rate limiting** - 10 requests per minute per IP address
- **In-memory tracking** - Rate limit state managed in-memory
- **CORS enabled** - Allows cross-origin requests for web integrations

### Rate Limiting

- **Limit:** 10 requests per minute per IP address
- **Window:** Rolling 1-minute window
- **Response:** HTTP 401 with error message when exceeded
- **Cleanup:** Old entries automatically removed to prevent memory leaks

## Endpoints

### 1. Agent Status

**GET** `/ltcg/control/status`

Get comprehensive agent status including current game state, polling status, and streaming configuration.

#### Request

```bash
curl -H "Authorization: Bearer $LTCG_CONTROL_API_KEY" \
  http://localhost:3001/ltcg/control/status
```

#### Response (Not in game)

```json
{
  "success": true,
  "isInGame": false,
  "currentGameId": null,
  "polling": {
    "active": false,
    "intervalMs": 1500
  },
  "streaming": {
    "note": "Check agent record in Convex for actual streaming configuration",
    "autoStartEnabled": true
  },
  "timestamp": 1234567890000
}
```

#### Response (In game)

```json
{
  "success": true,
  "isInGame": true,
  "currentGameId": "game_abc123",
  "polling": {
    "active": true,
    "intervalMs": 1500
  },
  "streaming": {
    "note": "Check agent record in Convex for actual streaming configuration",
    "autoStartEnabled": true
  },
  "gameState": {
    "turnNumber": 5,
    "phase": "main1",
    "currentTurn": "player",
    "status": "active",
    "player": {
      "lifePoints": 6000,
      "handCount": 3,
      "fieldCount": 2
    },
    "opponent": {
      "lifePoints": 4500,
      "handCount": 4,
      "fieldCount": 1
    }
  },
  "timestamp": 1234567890000
}
```

---

### 2. Trigger Story Mode

**POST** `/ltcg/control/story-mode`

Start a story mode game. Automatically starts streaming (if configured) and begins autonomous gameplay.

#### Request (Quick Play)

```bash
curl -X POST http://localhost:3001/ltcg/control/story-mode \
  -H "Authorization: Bearer $LTCG_CONTROL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"difficulty": "easy"}'
```

**Body Parameters:**
- `difficulty` (optional): `"easy"` | `"medium"` | `"hard"` | `"boss"` (default: `"easy"`)

#### Request (Specific Chapter/Stage)

```bash
curl -X POST http://localhost:3001/ltcg/control/story-mode \
  -H "Authorization: Bearer $LTCG_CONTROL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chapterId": "chapter_fire_dragon",
    "stageNumber": 1
  }'
```

**Body Parameters:**
- `chapterId` (required): Chapter ID to play
- `stageNumber` (optional): Stage number within chapter (default: first stage)

#### Response

```json
{
  "success": true,
  "gameId": "game_abc123",
  "lobbyId": "lobby_xyz789",
  "stageId": "stage_first_flame",
  "chapter": "Fire Dragon Trials",
  "stage": {
    "name": "First Flame",
    "number": 1
  },
  "aiOpponent": "AI - Fire Dragon Trials",
  "difficulty": "easy",
  "streaming": {
    "autoStartConfigured": true,
    "willAutoStart": true,
    "note": "Streaming will auto-start if agent has streaming configured in Convex"
  },
  "polling": {
    "started": true,
    "intervalMs": 1500,
    "note": "Agent will autonomously play turns via TurnOrchestrator"
  }
}
```

#### Error Responses

**409 Conflict** - Agent already in a game:
```json
{
  "success": false,
  "error": "Agent is already in a game (game_abc123). Use /control/surrender or /control/stop first.",
  "timestamp": 1234567890000
}
```

**503 Service Unavailable** - Agent not ready:
```json
{
  "success": false,
  "error": "Polling service not available",
  "timestamp": 1234567890000
}
```

---

### 3. Find PvP Game

**POST** `/ltcg/control/find-game`

Enter matchmaking to find a PvP opponent.

#### Request

```bash
curl -X POST http://localhost:3001/ltcg/control/find-game \
  -H "Authorization: Bearer $LTCG_CONTROL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"deckId": "deck_optional"}'
```

**Body Parameters:**
- `deckId` (optional): Specific deck to use for the match

#### Response

```json
{
  "success": true,
  "lobbyId": "lobby_xyz789",
  "status": "waiting",
  "message": "Searching for opponent...",
  "note": "Polling service will auto-detect when game starts and begin autonomous play"
}
```

---

### 4. Surrender Game

**POST** `/ltcg/control/surrender`

Surrender the current game (if in one).

#### Request

```bash
curl -X POST http://localhost:3001/ltcg/control/surrender \
  -H "Authorization: Bearer $LTCG_CONTROL_API_KEY" \
  -H "Content-Type: application/json"
```

#### Response

```json
{
  "success": true,
  "message": "Successfully surrendered game game_abc123",
  "gameId": "game_abc123"
}
```

#### Error Responses

**400 Bad Request** - Not in a game:
```json
{
  "success": false,
  "error": "Agent is not currently in a game",
  "timestamp": 1234567890000
}
```

---

### 5. Stop All Activity

**POST** `/ltcg/control/stop`

Stop all agent activity (stop polling, clear state). Does **not** surrender the game, just stops monitoring it.

#### Request

```bash
curl -X POST http://localhost:3001/ltcg/control/stop \
  -H "Authorization: Bearer $LTCG_CONTROL_API_KEY" \
  -H "Content-Type: application/json"
```

#### Response

```json
{
  "success": true,
  "message": "Agent activity stopped (game not surrendered, just stopped monitoring)",
  "wasActive": true
}
```

## Testing

### Prerequisites

1. **Agent must be running:**
   ```bash
   cd packages/plugin-ltcg
   ./start-dizzy.sh dev
   ```

2. **Set API key:**
   ```bash
   export LTCG_CONTROL_API_KEY="your_secure_key_here"
   ```

3. **Ensure streaming is configured** (optional, for streaming tests):
   - Agent record in Convex must have `streamingEnabled: true`
   - Agent must have `streamingAutoStart: true`
   - Streaming credentials must be configured

### Using the Test Script

The included test script automates testing:

```bash
# Run all tests
./test-control-api.sh

# Run specific test
./test-control-api.sh status          # Check agent status
./test-control-api.sh story           # Trigger story mode and monitor
./test-control-api.sh monitor         # Monitor ongoing game
./test-control-api.sh surrender       # Surrender current game
```

### Manual Testing

**1. Health Check:**
```bash
curl http://localhost:3001/ltcg/health
# Expected: {"status":"ok","plugin":"ltcg",...}
```

**2. Test Authentication:**
```bash
# Should fail (no auth)
curl http://localhost:3001/ltcg/control/status
# Expected: 401 Unauthorized

# Should succeed (with auth)
curl -H "Authorization: Bearer $LTCG_CONTROL_API_KEY" \
  http://localhost:3001/ltcg/control/status
# Expected: Agent status JSON
```

**3. Trigger Story Mode:**
```bash
curl -X POST http://localhost:3001/ltcg/control/story-mode \
  -H "Authorization: Bearer $LTCG_CONTROL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"difficulty": "easy"}'
```

**4. Monitor Game Progress:**
```bash
# Poll status every few seconds
watch -n 2 'curl -s -H "Authorization: Bearer $LTCG_CONTROL_API_KEY" \
  http://localhost:3001/ltcg/control/status | jq .'
```

**5. Check Streaming:**
- If streaming is configured, the stream should start automatically
- Check at: https://retake.tv/ (or your configured platform)
- Overlay should show game board and agent decisions

## Integration Examples

### Scheduled Streams

Trigger story mode at specific times:

```javascript
// Node.js example with node-cron
const cron = require('node-cron');
const fetch = require('node-fetch');

// Stream every day at 3 PM
cron.schedule('0 15 * * *', async () => {
  console.log('Starting scheduled stream...');

  const response = await fetch('http://localhost:3001/ltcg/control/story-mode', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LTCG_CONTROL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ difficulty: 'medium' })
  });

  const result = await response.json();
  console.log('Stream started:', result);
});
```

### Twitch Chat Integration

Let viewers trigger games via chat:

```javascript
// Example with tmi.js (Twitch chat)
const tmi = require('tmi.js');

const client = new tmi.Client({
  channels: ['your_channel']
});

client.on('message', async (channel, tags, message, self) => {
  if (message.toLowerCase() === '!play') {
    // Trigger story mode
    const response = await fetch('http://localhost:3001/ltcg/control/story-mode', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LTCG_CONTROL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ difficulty: 'easy' })
    });

    if (response.ok) {
      client.say(channel, 'Starting a game! Watch me play! 🎮');
    } else {
      client.say(channel, 'Already in a game! Wait for it to finish.');
    }
  }
});

client.connect();
```

### Web Dashboard

Monitor agent status in a React component:

```typescript
// React example
import { useEffect, useState } from 'react';

function AgentStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const response = await fetch('http://localhost:3001/ltcg/control/status', {
        headers: {
          'Authorization': `Bearer ${process.env.LTCG_CONTROL_API_KEY}`
        }
      });
      const data = await response.json();
      setStatus(data);
    };

    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    fetchStatus();

    return () => clearInterval(interval);
  }, []);

  if (!status) return <div>Loading...</div>;

  return (
    <div>
      <h2>Agent Status</h2>
      <p>In Game: {status.isInGame ? 'Yes' : 'No'}</p>
      {status.gameState && (
        <div>
          <p>Turn: {status.gameState.turnNumber}</p>
          <p>Phase: {status.gameState.phase}</p>
          <p>Player LP: {status.gameState.player.lifePoints}</p>
          <p>Opponent LP: {status.gameState.opponent.lifePoints}</p>
        </div>
      )}
    </div>
  );
}
```

## Architecture

### Flow Diagram

```
External System
    |
    | POST /ltcg/control/story-mode
    v
Control API (authMiddleware + controlRoutes)
    |
    | validateControlRequest()
    | getRuntime()
    | getService(POLLING)
    v
LTCGPollingService
    |
    | getClient() -> LTCGApiClient
    | quickPlayStory(difficulty)
    v
Web App API (/api/agents/story/quick-play)
    |
    | Creates lobby
    | Starts game
    v
Convex (autoStartStream hook)
    |
    | Detects game start
    | Triggers streaming
    v
LiveKit (Egress)
    |
    | Starts stream to platform
    v
Retake.tv / Twitch / YouTube
    |
    | Stream goes live with overlay
    v
LTCGPollingService (monitors game)
    |
    | Polls every 1.5s
    | Detects turn_started
    v
TurnOrchestrator
    |
    | Makes LLM decisions
    | Executes actions
    v
Game completes, streaming ends
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **authMiddleware** | Bearer auth + rate limiting | `src/api/authMiddleware.ts` |
| **controlRoutes** | Route handlers for control endpoints | `src/api/controlRoutes.ts` |
| **LTCGPollingService** | Game monitoring via HTTP polling | `src/services/LTCGPollingService.ts` |
| **TurnOrchestrator** | Autonomous turn decisions | `src/services/TurnOrchestrator.ts` |
| **LTCGApiClient** | Web app API communication | `src/client/LTCGApiClient.ts` |
| **Auto-streaming** | Convex lifecycle hook | `convex/agents/streaming.ts` |

## Troubleshooting

### Common Issues

**1. 401 Unauthorized**
- Check `LTCG_CONTROL_API_KEY` is set in `.env`
- Verify key is at least 16 characters
- Ensure Authorization header is correctly formatted: `Bearer <key>`

**2. 503 Service Unavailable**
- Agent may not be fully initialized
- Check agent logs for startup errors
- Verify LTCG_API_KEY is configured

**3. 409 Conflict (Already in game)**
- Agent is already playing a game
- Use `/control/status` to check current game
- Use `/control/surrender` to end the game first
- Or use `/control/stop` to stop monitoring (doesn't surrender)

**4. Rate Limit Exceeded**
- You're making more than 10 requests per minute
- Wait 60 seconds and try again
- Rate limits are per-IP address

**5. Streaming doesn't start**
- Check agent record in Convex has `streamingEnabled: true`
- Verify `streamingAutoStart: true` in agent record
- Ensure streaming credentials are configured
- Check LiveKit egress logs in Convex

### Debug Mode

Enable debug logging:

```bash
# In .env
LTCG_DEBUG_MODE=true
LOG_LEVEL=debug
```

Then check agent logs for detailed information:
- API requests and responses
- Polling cycles
- Turn orchestration decisions
- Streaming lifecycle events

### Logs to Check

**Agent startup:**
```
*** Initializing LTCG plugin ***
LTCG plugin configured: { hasApiKey: true, ... }
Warning: LTCG_CONTROL_API_KEY not provided - external control API disabled
```

**Control API request:**
```
Control API: Story mode trigger received
Starting quick play story battle
Story battle started: { gameId: 'game_abc123', ... }
Polling started for story mode game
```

**Autonomous gameplay:**
```
Turn started for agent
TurnOrchestrator triggered for autonomous play
[TurnOrchestrator] Executing turn for phase: main1
[TurnOrchestrator] Decision: summon card xyz
```

## Security Best Practices

1. **Generate strong API keys:**
   ```bash
   openssl rand -hex 32  # 64-character hex key
   ```

2. **Never commit API keys to git:**
   - Keep in `.env` (already in `.gitignore`)
   - Use environment variables in production

3. **Use HTTPS in production:**
   - Control API supports HTTPS
   - Configure reverse proxy (nginx, Caddy) for TLS

4. **Restrict access by IP (optional):**
   - Add IP whitelist to `authMiddleware.ts` if needed
   - Use firewall rules to limit access

5. **Monitor rate limits:**
   - 10 req/min is generous for most use cases
   - Adjust if needed in `authMiddleware.ts`

6. **Rotate keys periodically:**
   - Generate new keys every few months
   - Update in `.env` and external systems

## Production Deployment

### Environment Setup

```bash
# Production .env
LTCG_CONTROL_API_KEY=<strong-random-key>
LTCG_API_KEY=ltcg_xxxxxxxxxxxxx
LTCG_API_URL=https://lunchtable.cards

# Streaming (if enabled)
DIZZY_RETAKE_ACCESS_TOKEN=rtk_xxxxxxxxxxxxx
DIZZY_RETAKE_USER_DB_ID=xxxxxxxxxxxxx

# System
NODE_ENV=production
LOG_LEVEL=info
```

### Reverse Proxy (nginx)

```nginx
# nginx config
server {
    listen 443 ssl;
    server_name agent.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /ltcg/control/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Process Management (PM2)

```bash
# Start with PM2
pm2 start "bun run start" --name "ltcg-agent"

# View logs
pm2 logs ltcg-agent

# Restart
pm2 restart ltcg-agent

# Monitor
pm2 monit
```

### Health Monitoring

Set up monitoring with status checks:

```bash
# Cron job for health checks
*/5 * * * * curl -f http://localhost:3001/ltcg/health || echo "Agent down!"
```

## API Reference Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/ltcg/health` | GET | No | Health check (no auth required) |
| `/ltcg/control/status` | GET | Yes | Get agent status and game state |
| `/ltcg/control/story-mode` | POST | Yes | Trigger story mode gameplay |
| `/ltcg/control/find-game` | POST | Yes | Enter PvP matchmaking |
| `/ltcg/control/surrender` | POST | Yes | Surrender current game |
| `/ltcg/control/stop` | POST | Yes | Stop all activity (don't surrender) |

**Authentication:** Bearer token in `Authorization` header
**Rate Limit:** 10 requests per minute per IP
**CORS:** Enabled for all origins

## Support

- **Documentation:** See `/packages/plugin-ltcg/README.md`
- **Issues:** Open an issue in the LTCG repository
- **Logs:** Check agent logs with `LOG_LEVEL=debug`
- **Test Script:** Use `./test-control-api.sh` for debugging

---

**Last Updated:** 2026-02-06
**API Version:** 1.0.0
