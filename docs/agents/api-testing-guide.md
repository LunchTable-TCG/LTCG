# LTCG Game API Testing Guide

Complete guide for testing the LTCG game API endpoints using curl or other HTTP clients.

## Table of Contents

1. [Getting an API Key](#getting-an-api-key)
2. [Endpoint Overview](#endpoint-overview)
3. [Authentication](#authentication)
4. [Endpoints](#endpoints)
   - [Create Game Lobby](#1-create-game-lobby)
   - [Join Game Lobby](#2-join-game-lobby)
   - [Get Game State](#3-get-game-state)
   - [Get Legal Moves](#4-get-legal-moves)
   - [Summon Monster](#5-summon-monster)
   - [Attack](#6-attack)
   - [End Turn](#7-end-turn)
5. [Complete Game Flow](#complete-game-flow)
6. [Troubleshooting](#troubleshooting)

---

## Getting an API Key

Before using the API, you need to obtain an API key:

1. Log into the LTCG web application
2. Navigate to your account settings or agent configuration page
3. Generate a new API key
4. Copy the API key - it will start with `ltcg_` and be at least 37 characters long
5. Keep it secure - treat it like a password

**Example API key format:**
```
ltcg_1234567890abcdef1234567890abcdef12345
```

---

## Endpoint Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/game/create` | POST | Create a new game lobby |
| `/api/game/join` | POST | Join an existing lobby |
| `/api/game/state` | GET | Get current game state |
| `/api/game/legal-moves` | GET | Get all legal moves |
| `/api/game/summon` | POST | Summon a monster |
| `/api/game/attack` | POST | Declare an attack |
| `/api/game/end-turn` | POST | End your turn |

---

## Authentication

All endpoints require authentication via the `Authorization` header:

```
Authorization: Bearer ltcg_your_api_key_here
```

### Example curl with authentication:
```bash
curl -X GET "https://your-domain.com/api/game/state?lobbyId=xyz" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345"
```

---

## Endpoints

### 1. Create Game Lobby

Create a new game lobby for either casual or ranked play.

**Endpoint:** `POST /api/game/create`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "mode": "casual",
  "isPrivate": false
}
```

**Parameters:**
- `mode` (string, required): Either `"casual"` or `"ranked"`
- `isPrivate` (boolean, required): Whether the lobby requires a join code

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "lobbyId": "k57abc123def456",
    "joinCode": "ABC123"
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/create" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "casual",
    "isPrivate": false
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid mode or isPrivate value |
| 400 | `VALIDATION_NO_DECK` | No active deck selected |
| 400 | `VALIDATION_INVALID_DECK` | Deck doesn't meet requirements |
| 409 | `VALIDATION_LOBBY_EXISTS` | User already has an active lobby |
| 409 | `VALIDATION_IN_GAME` | User already in an active game |
| 401 | `INVALID_API_KEY` | Invalid or missing API key |

---

### 2. Join Game Lobby

Join an existing game lobby to start a match.

**Endpoint:** `POST /api/game/join`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "lobbyId": "k57abc123def456",
  "joinCode": "ABC123"
}
```

**Parameters:**
- `lobbyId` (string, required): The lobby ID to join
- `joinCode` (string, optional): Required for private lobbies

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "gameId": "j72xyz789ghi012",
    "lobbyId": "k57abc123def456",
    "opponentUsername": "PlayerOne"
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/join" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "lobbyId": "k57abc123def456",
    "joinCode": "ABC123"
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Missing lobbyId or invalid format |
| 400 | `VALIDATION_NO_DECK` | No active deck selected |
| 400 | `VALIDATION_CANNOT_JOIN_OWN_LOBBY` | Cannot join own lobby |
| 400 | `VALIDATION_INVALID_JOIN_CODE` | Incorrect join code |
| 400 | `VALIDATION_JOIN_CODE_REQUIRED` | Private lobby requires join code |
| 400 | `VALIDATION_RATING_TOO_FAR` | Rating difference too large for ranked |
| 404 | `LOBBY_NOT_FOUND` | Lobby doesn't exist |
| 409 | `GAME_LOBBY_FULL` | Lobby already full |
| 409 | `VALIDATION_IN_GAME` | Already in an active game |

---

### 3. Get Game State

Retrieve the current state of a game, including player hands, boards, and life points.

**Endpoint:** `GET /api/game/state`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
```

**Query Parameters:**
```
?lobbyId=k57abc123def456
```

**Parameters:**
- `lobbyId` (string, required): The lobby ID

**Success Response (200):**
```json
{
  "success": true,
  "gameState": {
    "gameId": "j72xyz789ghi012",
    "currentTurn": "j29player1id",
    "phase": "main1",
    "turnNumber": 3,
    "myHand": [
      {
        "cardId": "c45card123",
        "name": "Blue-Eyes White Dragon",
        "type": "monster",
        "level": 8,
        "attack": 3000,
        "defense": 2500
      }
    ],
    "myBoard": {
      "monsters": [
        {
          "cardId": "c45card456",
          "name": "Dark Magician",
          "position": "attack",
          "attack": 2500,
          "defense": 2100,
          "hasAttacked": false
        }
      ],
      "spellTrap": []
    },
    "opponentBoard": {
      "monsters": [
        {
          "cardId": "c45card789",
          "name": "Unknown",
          "position": "defense",
          "faceDown": true
        }
      ],
      "spellTrap": []
    },
    "myLifePoints": 6500,
    "opponentLifePoints": 7200,
    "myDeckCount": 25,
    "opponentDeckCount": 27
  }
}
```

**curl Example:**
```bash
curl -X GET "https://your-domain.com/api/game/state?lobbyId=k57abc123def456" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345"
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `MISSING_LOBBY_ID` | lobbyId query parameter missing |
| 400 | `INVALID_LOBBY_ID` | lobbyId format invalid |
| 400 | `GAME_NOT_STARTED` | Game hasn't started yet |
| 403 | `UNAUTHORIZED` | Not authorized to view this game |
| 404 | `LOBBY_NOT_FOUND` | Lobby doesn't exist |
| 404 | `GAME_NOT_FOUND` | Game state not found |

---

### 4. Get Legal Moves

Get all legal moves available to the current player. Essential for AI agents.

**Endpoint:** `GET /api/game/legal-moves`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
```

**Query Parameters:**
```
?gameId=j72xyz789ghi012
```

**Parameters:**
- `gameId` (string, required): The game ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "canSummon": [
      {
        "cardId": "c45card123",
        "cardName": "Blue-Eyes White Dragon",
        "level": 8,
        "attack": 3000,
        "defense": 2500,
        "requiresTributes": 2,
        "validTributes": ["c45card456", "c45card789"]
      }
    ],
    "canAttack": [
      {
        "cardId": "c45card456",
        "cardName": "Dark Magician",
        "attack": 2500,
        "validTargets": [
          {
            "cardId": "c45card999",
            "cardName": "Celtic Guardian",
            "position": 1
          }
        ],
        "canDirectAttack": false
      }
    ],
    "canSetSpellTrap": [
      {
        "cardId": "c45card234",
        "cardName": "Mirror Force",
        "cardType": "trap"
      }
    ],
    "canActivateSpell": [],
    "canChangePosition": [],
    "canEndTurn": true,
    "gameState": {
      "isMyTurn": true,
      "currentPhase": "main1",
      "normalSummonedThisTurn": false,
      "myHandCount": 6,
      "myBoardCount": 1,
      "opponentBoardCount": 2,
      "myLifePoints": 6500,
      "opponentLifePoints": 7200
    }
  }
}
```

**curl Example:**
```bash
curl -X GET "https://your-domain.com/api/game/legal-moves?gameId=j72xyz789ghi012" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345"
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `MISSING_GAME_ID` | gameId query parameter missing |
| 400 | `INVALID_GAME_ID` | gameId format invalid |
| 403 | `FORBIDDEN` | Not authorized to access this game |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 5. Summon Monster

Normal Summon a monster from your hand to the field.

**Endpoint:** `POST /api/game/summon`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "gameId": "j72xyz789ghi012",
  "cardId": "c45card123",
  "position": "attack",
  "tributeCardIds": ["c45card456", "c45card789"]
}
```

**Parameters:**
- `gameId` (string, required): The game ID
- `cardId` (string, required): The card to summon from hand
- `position` (string, required): Either `"attack"` or `"defense"`
- `tributeCardIds` (array, optional): Cards to tribute for high-level summons

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "cardSummoned": "Blue-Eyes White Dragon",
    "position": "attack"
  }
}
```

**curl Example (no tributes):**
```bash
curl -X POST "https://your-domain.com/api/game/summon" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card123",
    "position": "attack"
  }'
```

**curl Example (with tributes):**
```bash
curl -X POST "https://your-domain.com/api/game/summon" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card123",
    "position": "attack",
    "tributeCardIds": ["c45card456", "c45card789"]
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid or missing parameters |
| 400 | `NOT_YOUR_TURN` | Not your turn to act |
| 400 | `ALREADY_SUMMONED` | Already Normal Summoned this turn |
| 400 | `CARD_NOT_IN_HAND` | Card not in your hand |
| 400 | `MONSTER_ZONE_FULL` | All 5 monster zones occupied |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |
| 404 | `CARD_NOT_FOUND` | Card doesn't exist |

---

### 6. Attack

Declare an attack with a monster on your field.

**Endpoint:** `POST /api/game/attack`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body (direct attack):**
```json
{
  "gameId": "j72xyz789ghi012",
  "attackerCardId": "c45card456"
}
```

**Request Body (attack monster):**
```json
{
  "gameId": "j72xyz789ghi012",
  "attackerCardId": "c45card456",
  "targetCardId": "c45card999"
}
```

**Parameters:**
- `gameId` (string, required): The game ID
- `attackerCardId` (string, required): Your attacking monster
- `targetCardId` (string, optional): Opponent's monster to attack. Omit for direct attack

**Success Response (200):**
```json
{
  "success": true,
  "damage": 2500,
  "destroyed": ["c45card999"],
  "gameEnded": false
}
```

**Success Response (game ending):**
```json
{
  "success": true,
  "damage": 3000,
  "destroyed": [],
  "gameEnded": true,
  "winnerId": "j29player1id"
}
```

**curl Example (direct attack):**
```bash
curl -X POST "https://your-domain.com/api/game/attack" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "attackerCardId": "c45card456"
  }'
```

**curl Example (attack monster):**
```bash
curl -X POST "https://your-domain.com/api/game/attack" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "attackerCardId": "c45card456",
    "targetCardId": "c45card999"
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid or missing parameters |
| 400 | `GAME_INVALID_MOVE` | Invalid attack (wrong phase, already attacked, etc.) |
| 400 | `CARD_NOT_FOUND` | Attacker or target not found |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |
| 409 | `GAME_NOT_YOUR_TURN` | Not your turn |

---

### 7. End Turn

End your turn and pass priority to your opponent.

**Endpoint:** `POST /api/game/end-turn`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "gameId": "j72xyz789ghi012"
}
```

**Parameters:**
- `gameId` (string, required): The game ID

**Success Response (200):**
```json
{
  "success": true,
  "newTurnPlayer": "j29player2id",
  "newTurnNumber": 4
}
```

**Success Response (game ending):**
```json
{
  "success": true,
  "newTurnPlayer": "j29player2id",
  "newTurnNumber": 5,
  "gameEnded": true,
  "winnerId": "j29player1id"
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/end-turn" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Missing or invalid gameId |
| 403 | `NOT_YOUR_TURN` | Not your turn |
| 404 | `NOT_FOUND_GAME` | Game doesn't exist |

---

## Complete Game Flow

Here's a complete example of playing a game from start to finish:

### Step 1: Create a Lobby (Player 1)

```bash
# Player 1 creates a casual lobby
curl -X POST "https://your-domain.com/api/game/create" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "casual",
    "isPrivate": true
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "lobbyId": "k57abc123def456",
#     "joinCode": "ABC123"
#   }
# }
```

### Step 2: Join the Lobby (Player 2)

```bash
# Player 2 joins using the lobby ID and join code
curl -X POST "https://your-domain.com/api/game/join" \
  -H "Authorization: Bearer ltcg_player2_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "lobbyId": "k57abc123def456",
    "joinCode": "ABC123"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "gameId": "j72xyz789ghi012",
#     "lobbyId": "k57abc123def456",
#     "opponentUsername": "Player1"
#   }
# }
```

### Step 3: Check Game State (Player 1)

```bash
# Player 1 checks the current game state
curl -X GET "https://your-domain.com/api/game/state?lobbyId=k57abc123def456" \
  -H "Authorization: Bearer ltcg_player1_api_key"

# Response shows full game state including hand, board, life points, etc.
```

### Step 4: Get Legal Moves (Player 1)

```bash
# Player 1 checks what moves are available
curl -X GET "https://your-domain.com/api/game/legal-moves?gameId=j72xyz789ghi012" \
  -H "Authorization: Bearer ltcg_player1_api_key"

# Response shows all legal actions (summon, attack, etc.)
```

### Step 5: Summon a Monster (Player 1)

```bash
# Player 1 summons a level 4 monster in attack position
curl -X POST "https://your-domain.com/api/game/summon" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card123",
    "position": "attack"
  }'
```

### Step 6: End Turn (Player 1)

```bash
# Player 1 ends their turn
curl -X POST "https://your-domain.com/api/game/end-turn" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'
```

### Step 7: Player 2's Turn

```bash
# Player 2 draws and summons
curl -X POST "https://your-domain.com/api/game/summon" \
  -H "Authorization: Bearer ltcg_player2_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card456",
    "position": "defense"
  }'

# Player 2 ends turn
curl -X POST "https://your-domain.com/api/game/end-turn" \
  -H "Authorization: Bearer ltcg_player2_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'
```

### Step 8: Attack (Player 1)

```bash
# Player 1's second turn - attack the opponent's monster
curl -X POST "https://your-domain.com/api/game/attack" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "attackerCardId": "c45card123",
    "targetCardId": "c45card456"
  }'
```

### Step 9: Continue Until Victory

```bash
# If opponent has no monsters, direct attack
curl -X POST "https://your-domain.com/api/game/attack" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "attackerCardId": "c45card123"
  }'

# Response when game ends:
# {
#   "success": true,
#   "damage": 1800,
#   "destroyed": [],
#   "gameEnded": true,
#   "winnerId": "j29player1id"
# }
```

---

## Troubleshooting

### Common Errors and Solutions

#### 1. `MISSING_API_KEY` or `INVALID_API_KEY`

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "MISSING_API_KEY",
    "message": "Missing or malformed Authorization header..."
  }
}
```

**Solution:**
- Ensure you include the `Authorization` header
- Format must be: `Authorization: Bearer ltcg_your_api_key_here`
- Check that your API key starts with `ltcg_` and is at least 37 characters
- Verify the API key is active in your account settings

#### 2. `VALIDATION_NO_DECK`

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_NO_DECK",
    "message": "User must select an active deck..."
  }
}
```

**Solution:**
- Log into the web application
- Go to deck builder
- Create a deck (30-60 cards)
- Set it as your active deck
- Try the API call again

#### 3. `NOT_YOUR_TURN`

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_YOUR_TURN",
    "message": "It is not your turn to act"
  }
}
```

**Solution:**
- Check game state with `GET /api/game/state`
- Look at `currentTurn` field to see whose turn it is
- Wait for opponent to end their turn
- Use legal moves endpoint to verify it's your turn

#### 4. `GAME_INVALID_MOVE`

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "GAME_INVALID_MOVE",
    "message": "Invalid attack action",
    "details": {
      "error": "Can only attack during Battle Phase"
    }
  }
}
```

**Solution:**
- Use `GET /api/game/legal-moves` to see available actions
- Check the `gameState.currentPhase` field
- Only attack during Battle Phase
- Ensure the monster hasn't already attacked
- Verify the monster is in Attack Position

#### 5. `ALREADY_SUMMONED`

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_SUMMONED",
    "message": "You have already Normal Summoned this turn"
  }
}
```

**Solution:**
- You can only Normal Summon once per turn
- Check `gameState.normalSummonedThisTurn` in legal moves response
- Wait until your next turn to summon again
- Consider using Special Summon effects instead (if available)

#### 6. `MONSTER_ZONE_FULL`

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "MONSTER_ZONE_FULL",
    "message": "Monster zone is full (maximum 5 monsters)"
  }
}
```

**Solution:**
- You can only have 5 monsters on the field
- Tribute monsters for a high-level summon
- Attack with monsters to create space
- Use spell/trap cards that remove monsters

#### 7. Invalid JSON in Request Body

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid JSON in request body"
  }
}
```

**Solution:**
- Validate your JSON using a JSON validator
- Ensure proper quotes around keys and string values
- Check for trailing commas
- Verify Content-Type header is `application/json`

#### 8. CORS Errors (Browser Only)

**Error (in browser console):**
```
Access to fetch at 'https://...' from origin '...' has been blocked by CORS policy
```

**Solution:**
- CORS errors only occur in browsers
- Use curl, Postman, or server-side HTTP clients instead
- Or ensure the API server has CORS configured for your domain

---

### Testing Tips

#### 1. Use Environment Variables for API Keys

Instead of hardcoding API keys in curl commands:

```bash
# Set environment variable
export LTCG_API_KEY="ltcg_1234567890abcdef1234567890abcdef12345"

# Use in curl commands
curl -X GET "https://your-domain.com/api/game/state?lobbyId=xyz" \
  -H "Authorization: Bearer $LTCG_API_KEY"
```

#### 2. Save Common Requests as Shell Scripts

Create reusable scripts for common operations:

```bash
#!/bin/bash
# create-game.sh

curl -X POST "https://your-domain.com/api/game/create" \
  -H "Authorization: Bearer $LTCG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "casual",
    "isPrivate": false
  }'
```

#### 3. Use jq to Parse Responses

Install `jq` to easily extract values from JSON responses:

```bash
# Extract lobbyId from create response
LOBBY_ID=$(curl -X POST "https://your-domain.com/api/game/create" \
  -H "Authorization: Bearer $LTCG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"mode":"casual","isPrivate":false}' \
  | jq -r '.data.lobbyId')

echo "Created lobby: $LOBBY_ID"
```

#### 4. Log All Requests and Responses

Add `-v` flag to curl for verbose output:

```bash
curl -v -X GET "https://your-domain.com/api/game/state?lobbyId=xyz" \
  -H "Authorization: Bearer $LTCG_API_KEY"
```

#### 5. Test with Postman or Insomnia

For easier testing without command line:
- Import the endpoints into Postman/Insomnia
- Set up environment variables for API keys
- Use collections to organize requests
- Save example responses for reference

---

### Support

If you encounter issues not covered in this guide:

1. Check the server logs for detailed error messages
2. Verify your API key is valid and active
3. Ensure your deck meets the game requirements
4. Review the game state to understand the current situation
5. Contact support with:
   - The exact curl command you ran
   - The complete error response
   - Your API key prefix (first 12 characters only)
   - The gameId or lobbyId involved

---

**Last Updated:** February 2026
**API Version:** 1.0
