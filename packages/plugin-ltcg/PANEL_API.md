# LTCG Panel API Documentation

REST API endpoints for the LTCG ElizaOS panel system.

## Base URL

All endpoints are prefixed with `/api/ltcg/`

## Authentication

API requests are authenticated via the ElizaOS runtime context. The `agentId` parameter identifies the agent making the request.

## Endpoints

### 1. Agent Status

Get the current runtime status of an agent.

**Endpoint:** `GET /api/ltcg/status`

**Query Parameters:**
- `agentId` (string, required): The UUID of the agent

**Response:**
```typescript
{
  agentId: string;
  isRunning: boolean;
  pollingActive: boolean;
  currentGameId: string | null;
  autoMatchmaking: boolean;
  uptime: number;          // milliseconds
  lastActivity: number;    // timestamp
}
```

**Example:**
```bash
curl "http://localhost:3000/api/ltcg/status?agentId=123e4567-e89b-12d3-a456-426614174000"
```

---

### 2. Matchmaking Status

Get the current matchmaking status and statistics.

**Endpoint:** `GET /api/ltcg/matchmaking`

**Query Parameters:**
- `agentId` (string, required): The UUID of the agent

**Response:**
```typescript
{
  enabled: boolean;
  status: 'idle' | 'scanning' | 'joining' | 'in_game';
  lobbiesScanned: number;
  recentJoins: Array<{
    timestamp: number;
    lobbyId: string;
    hostUsername: string;
    gameId?: string;
  }>;
  stats: {
    lobbiesJoined: number;
    gamesStarted: number;
    lastScanAt: number;
  };
  nextScanIn: number;      // milliseconds until next scan
}
```

**Example:**
```bash
curl "http://localhost:3000/api/ltcg/matchmaking?agentId=123e4567-e89b-12d3-a456-426614174000"
```

---

### 3. Game State

Get the current state of an active game.

**Endpoint:** `GET /api/ltcg/game`

**Query Parameters:**
- `agentId` (string, required): The UUID of the agent
- `gameId` (string, required): The ID of the game

**Response:**
```typescript
{
  gameId: string;
  phase: string;
  turnNumber: number;
  isMyTurn: boolean;
  lifePoints: {
    agent: number;
    opponent: number;
  };
  board: {
    agentMonsters: number;
    agentSpellTraps: number;
    opponentMonsters: number;
    opponentSpellTraps: number;
  };
  hand: {
    count: number;
    cards: Array<{
      type: 'monster' | 'spell' | 'trap';
      name: string;
    }>;
  };
  status: 'waiting' | 'active' | 'completed';
  winner?: 'agent' | 'opponent';
}
```

**Example:**
```bash
curl "http://localhost:3000/api/ltcg/game?agentId=123e4567-e89b-12d3-a456-426614174000&gameId=game_abc123"
```

---

### 4. Decision History

Get the AI decision history for a game.

**Endpoint:** `GET /api/ltcg/decisions`

**Query Parameters:**
- `agentId` (string, required): The UUID of the agent
- `gameId` (string, required): The ID of the game
- `limit` (number, optional): Max number of decisions to return (default: 20, max: 100)

**Response:**
```typescript
{
  gameId: string;
  decisions: Array<{
    id: string;
    timestamp: number;
    turnNumber: number;
    phase: string;
    action: string;
    reasoning: string;
    parameters: Record<string, unknown>;
    result: 'success' | 'failed' | 'pending';
    executionTimeMs: number;
    confidence?: number;
  }>;
  total: number;
}
```

**Example:**
```bash
curl "http://localhost:3000/api/ltcg/decisions?agentId=123e4567-e89b-12d3-a456-426614174000&gameId=game_abc123&limit=50"
```

---

### 5. Performance Metrics

Get agent performance statistics and analytics.

**Endpoint:** `GET /api/ltcg/metrics`

**Query Parameters:**
- `agentId` (string, required): The UUID of the agent

**Response:**
```typescript
{
  lifetime: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;        // 0.0 to 1.0
  };
  performance: {
    avgTurnTimeMs: number;
    avgActionsPerTurn: number;
    apiCallCount: number;
    apiErrorRate: number;   // 0.0 to 1.0
  };
  recentGames: Array<{
    gameId: string;
    timestamp: number;
    result: 'win' | 'loss';
    duration: number;       // milliseconds
    turns: number;
  }>;
  storyMode?: {
    battlesCompleted: number;
    currentBattle: string;
    progress: number;       // 0.0 to 1.0
  };
}
```

**Example:**
```bash
curl "http://localhost:3000/api/ltcg/metrics?agentId=123e4567-e89b-12d3-a456-426614174000"
```

---

## Error Responses

All endpoints return standard error responses:

**400 Bad Request:**
```json
{
  "error": "Missing agentId parameter"
}
```

**503 Service Unavailable:**
```json
{
  "error": "StateAggregator service not available"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Error message details"
}
```

---

## Polling Strategy

The panel frontend uses React Query with these polling intervals:

- **Status, Matchmaking, Game, Decisions:** 5-second polling
- **Metrics:** 10-second polling (less frequent due to expensive calculations)

### Caching

- Game state responses are cached for 5 seconds in the StateAggregator
- React Query implements client-side caching with `staleTime` settings
- Structural sharing prevents unnecessary re-renders

### Performance Considerations

- All endpoints use in-memory data from LTCG services (no database queries)
- State aggregation happens on-demand with minimal overhead
- 5-second polling is sufficient for monitoring dashboards
- Use React Query's automatic request deduplication

---

## Integration Example

Using the panel API with React Query:

```typescript
import { useQuery } from '@tanstack/react-query';

function useAgentStatus(agentId: string) {
  return useQuery({
    queryKey: ['ltcg', 'status', agentId],
    queryFn: async () => {
      const res = await fetch(`/api/ltcg/status?agentId=${agentId}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
    refetchInterval: 5000,
    staleTime: 4000,
    enabled: !!agentId,
  });
}
```

---

## See Also

- [Panel Development Guide](./PANEL_DEVELOPMENT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
