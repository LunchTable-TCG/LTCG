# LunchTable-TCG MCP Server - Example Usage

This document shows example workflows for using the LunchTable-TCG MCP tools.

## Basic Game Flow

### 1. Create a Game Lobby

```json
Tool: ltcg_create_game
Input:
{
  "mode": "casual",
  "isPrivate": false
}

Response:
{
  "success": true,
  "data": {
    "lobbyId": "abc123",
    "joinCode": null
  }
}
```

### 2. Join a Game Lobby

Another player joins the lobby:

```json
Tool: ltcg_join_game
Input:
{
  "lobbyId": "abc123"
}

Response:
{
  "success": true,
  "data": {
    "gameId": "game_xyz789",
    "lobbyId": "abc123",
    "opponentUsername": "Player1"
  }
}
```

### 3. Get Game State

```json
Tool: ltcg_get_state
Input:
{
  "lobbyId": "abc123"
}

Response:
{
  "success": true,
  "gameState": {
    "gameId": "game_xyz789",
    "currentTurn": "player1_id",
    "phase": "Main1",
    "player1": {
      "lifePoints": 8000,
      "hand": [...],
      "field": {...},
      "graveyard": [...]
    },
    "player2": {
      "lifePoints": 8000,
      "hand": [...],
      "field": {...},
      "graveyard": [...]
    }
  }
}
```

### 4. Get Legal Moves

Check what moves are available:

```json
Tool: ltcg_get_legal_moves
Input:
{
  "gameId": "game_xyz789"
}

Response:
{
  "success": true,
  "data": {
    "canSummon": [
      {
        "cardId": "card_123",
        "cardName": "Blue-Eyes White Dragon",
        "level": 8,
        "attack": 3000,
        "defense": 2500,
        "requiresTributes": 2,
        "validTributes": ["card_456", "card_789"]
      }
    ],
    "canAttack": [
      {
        "cardId": "card_456",
        "cardName": "Dark Magician",
        "attack": 2500,
        "validTargets": [
          {
            "cardId": "card_opponent_1",
            "cardName": "Celtic Guardian",
            "position": 1
          }
        ],
        "canDirectAttack": false
      }
    ],
    "canEndTurn": true,
    "gameState": {
      "isMyTurn": true,
      "currentPhase": "Main1",
      "normalSummonedThisTurn": false,
      "myHandCount": 5,
      "myBoardCount": 2,
      "opponentBoardCount": 1,
      "myLifePoints": 8000,
      "opponentLifePoints": 7500
    }
  }
}
```

### 5. Summon a Monster

Summon a low-level monster (no tributes required):

```json
Tool: ltcg_summon_monster
Input:
{
  "gameId": "game_xyz789",
  "cardId": "card_low_level",
  "position": "attack"
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "cardSummoned": "card_low_level",
    "position": "attack"
  }
}
```

Summon a high-level monster with tributes:

```json
Tool: ltcg_summon_monster
Input:
{
  "gameId": "game_xyz789",
  "cardId": "card_123",
  "position": "attack",
  "tributeCardIds": ["card_456", "card_789"]
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "cardSummoned": "card_123",
    "position": "attack"
  }
}
```

### 6. Declare Attack

Direct attack (when opponent has no monsters):

```json
Tool: ltcg_declare_attack
Input:
{
  "gameId": "game_xyz789",
  "attackerCardId": "card_456"
}

Response:
{
  "success": true,
  "damage": 2500,
  "destroyed": [],
  "gameEnded": false
}
```

Attack an opponent's monster:

```json
Tool: ltcg_declare_attack
Input:
{
  "gameId": "game_xyz789",
  "attackerCardId": "card_456",
  "targetCardId": "card_opponent_1"
}

Response:
{
  "success": true,
  "damage": 0,
  "destroyed": ["card_opponent_1"],
  "gameEnded": false
}
```

### 7. End Turn

```json
Tool: ltcg_end_turn
Input:
{
  "gameId": "game_xyz789"
}

Response:
{
  "success": true,
  "newTurnPlayer": "player2_id",
  "newTurnNumber": 2
}
```

## Complete Turn Example

Here's a complete turn sequence:

1. **Check legal moves** - See what actions are available
2. **Summon a monster** - Place a monster on the field
3. **Declare attacks** - Attack with monsters already on field
4. **End turn** - Pass to opponent

```
1. ltcg_get_legal_moves(gameId: "game_xyz789")
   → See available summons and attacks

2. ltcg_summon_monster(
     gameId: "game_xyz789",
     cardId: "card_low_level",
     position: "attack"
   )
   → Summon a monster in attack position

3. ltcg_declare_attack(
     gameId: "game_xyz789",
     attackerCardId: "card_existing",
     targetCardId: "card_opponent_1"
   )
   → Attack opponent's monster

4. ltcg_end_turn(gameId: "game_xyz789")
   → End turn and pass to opponent
```

## Error Handling Examples

### Invalid API Key

```json
Response:
{
  "success": false,
  "error": "API request failed (401): Invalid or inactive API key"
}
```

### Not Your Turn

```json
Tool: ltcg_summon_monster
Response:
{
  "success": false,
  "error": "API request failed (409): It is not your turn"
}
```

### Card Not in Hand

```json
Tool: ltcg_summon_monster
Response:
{
  "success": false,
  "error": "API request failed (400): The card is not in your hand"
}
```

### Game Not Found

```json
Tool: ltcg_get_state
Response:
{
  "success": false,
  "error": "API request failed (404): Game lobby not found"
}
```

## AI Agent Strategy Example

An AI agent playing LunchTable-TCG might follow this pattern each turn:

```
1. Get legal moves to understand the board state
2. Analyze available actions:
   - Can I summon a strong monster?
   - Should I use tributes for a powerful summon?
   - Which monsters can attack?
   - Should I attack directly or target opponent's monsters?
3. Execute actions in optimal order:
   - Summon first (if beneficial)
   - Attack with existing monsters
   - End turn
4. Handle responses and errors gracefully
5. Repeat for next turn
```

## Private Game Example

Create and join a private game:

```json
// Player 1 creates private lobby
Tool: ltcg_create_game
Input:
{
  "mode": "casual",
  "isPrivate": true
}
Response:
{
  "success": true,
  "data": {
    "lobbyId": "private_123",
    "joinCode": "ABCD-1234"
  }
}

// Player 2 joins with code
Tool: ltcg_join_game
Input:
{
  "lobbyId": "private_123",
  "joinCode": "ABCD-1234"
}
Response:
{
  "success": true,
  "data": {
    "gameId": "game_private",
    "lobbyId": "private_123",
    "opponentUsername": "Player1"
  }
}
```
