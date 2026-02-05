# Chain System API Endpoints

HTTP API endpoints for handling Yu-Gi-Oh-style chain mechanics (spell/trap responses).

## Endpoints

### 1. Add to Chain
**POST** `/api/game/chain/add`

Add a card effect to the current chain.

**Request Body:**
```json
{
  "lobbyId": "string",
  "cardId": "string",
  "spellSpeed": 1 | 2 | 3,
  "effect": {
    "effects": [
      {
        "type": "damage",
        "value": 500
      }
    ]
  },
  "targets": ["cardId1", "cardId2"] // optional
}
```

**Success Response (200):**
```json
{
  "success": true,
  "chainLinkNumber": 2,
  "currentChainLength": 2
}
```

**Error Codes:**
- `NOT_FOUND_LOBBY` (404) - Lobby not found
- `GAME_STATE_NOT_FOUND` (404) - Game state not found
- `GAME_CHAIN_LIMIT_EXCEEDED` (400) - Chain exceeds 12 links
- `GAME_CARD_ALREADY_IN_CHAIN` (400) - Card already in chain
- `GAME_INVALID_SPELL_SPEED` (400) - Invalid spell speed for current chain
- `GAME_INVALID_CHAIN_STATE` (400) - Invalid chain state

---

### 2. Pass Priority
**POST** `/api/game/chain/pass`

Pass priority - decline to respond to the current chain. If both players pass, the chain automatically resolves.

**Request Body:**
```json
{
  "lobbyId": "string"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "priorityPassedTo": "opponent" | "none",
  "chainResolved": true // only present if chain was resolved
}
```

**Error Codes:**
- `NOT_FOUND_LOBBY` (404) - Lobby not found
- `GAME_STATE_NOT_FOUND` (404) - Game state not found
- `GAME_NO_CHAIN` (400) - No chain to respond to

---

### 3. Resolve Chain
**POST** `/api/game/chain/resolve`

Manually resolve the current chain in reverse order (CL3 → CL2 → CL1). Executes all effects, handles negated effects, and performs state-based actions.

**Request Body:**
```json
{
  "lobbyId": "string"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "resolvedChainLinks": 3,
  "gameEnded": false,
  "winnerId": "userId123", // only if gameEnded is true
  "replayTriggered": false // battle replay triggered
}
```

**Error Codes:**
- `NOT_FOUND_LOBBY` (404) - Lobby not found
- `GAME_STATE_NOT_FOUND` (404) - Game state not found
- `GAME_NO_CHAIN` (400) - No chain to resolve
- `GAME_INVALID_CHAIN` (400) - Invalid chain structure

---

### 4. Get Chain State
**GET** `/api/game/chain/state?lobbyId=xxx`

Retrieves the current chain state with enriched card and player information.

**Query Parameters:**
- `lobbyId` (required) - The game lobby ID

**Success Response (200):**
```json
{
  "success": true,
  "chain": [
    {
      "chainLink": 1,
      "cardId": "cardId123",
      "cardName": "Mirror Force",
      "playerId": "userId456",
      "playerName": "Player1",
      "spellSpeed": 2,
      "effect": "[Effect: destroyAll]"
    },
    {
      "chainLink": 2,
      "cardId": "cardId789",
      "cardName": "Solemn Judgment",
      "playerId": "userId789",
      "playerName": "Player2",
      "spellSpeed": 3,
      "effect": "[Effect: negate]"
    }
  ],
  "priorityPlayer": "userId456"
}
```

**Error Codes:**
- `MISSING_LOBBY_ID` (400) - Missing lobbyId parameter
- `INVALID_LOBBY_ID` (400) - Invalid lobbyId format
- `NOT_FOUND_LOBBY` (404) - Lobby not found

---

## Authentication

All endpoints require API key authentication via the `Authorization` header:

```
Authorization: Bearer ltcg_xxxxx...
```

## Spell Speed Rules

- **Speed 1 (Normal)**: Normal Spells, Ignition Effects
- **Speed 2 (Quick)**: Quick-Play Spells, Quick Effects, Normal Traps
- **Speed 3 (Counter)**: Counter Traps only

**Chain Rules:**
- Can't chain lower speed to higher speed
- Only Speed 3 can respond to Speed 3 (exclusive window)
- Maximum 12 chain links
- Chain resolves in reverse order (last-in, first-out)

## Example Flow

1. **Player A activates Mirror Force (Speed 2)**
   ```bash
   POST /api/game/chain/add
   {
     "lobbyId": "lobby123",
     "cardId": "mirrorForceId",
     "spellSpeed": 2,
     "effect": { ... }
   }
   ```

2. **Player B responds with Solemn Judgment (Speed 3)**
   ```bash
   POST /api/game/chain/add
   {
     "lobbyId": "lobby123",
     "cardId": "solemnJudgmentId",
     "spellSpeed": 3,
     "effect": { ... }
   }
   ```

3. **Player A passes priority**
   ```bash
   POST /api/game/chain/pass
   { "lobbyId": "lobby123" }
   ```

4. **Chain automatically resolves** (both players passed)
   - Solemn Judgment (CL2) negates Mirror Force (CL1)
   - Mirror Force effect doesn't activate (negated)

## Backend Integration

These endpoints call the following Convex mutations/queries:

- `api.gameplay.chainResolver.addToChain`
- `api.gameplay.chainResolver.passPriority`
- `api.gameplay.chainResolver.resolveChain`
- `api.gameplay.chainResolver.getCurrentChain`

See `/convex/gameplay/chainResolver.ts` for implementation details.
