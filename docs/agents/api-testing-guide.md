# LTCG Game API Testing Guide

Complete guide for testing the LTCG game API endpoints using curl or other HTTP clients.

## Table of Contents

1. [Getting an API Key](#getting-an-api-key)
2. [Endpoint Overview](#endpoint-overview)
3. [Authentication](#authentication)
4. [Endpoints](#endpoints)
   - [Game Management](#game-management)
     - [Create Game Lobby](#1-create-game-lobby)
     - [Join Game Lobby](#2-join-game-lobby)
     - [Surrender](#3-surrender)
   - [Game State & Moves](#game-state--moves)
     - [Get Game State](#4-get-game-state)
     - [Get Legal Moves](#5-get-legal-moves)
   - [Monster Actions](#monster-actions)
     - [Summon Monster](#6-summon-monster)
     - [Set Monster](#7-set-monster)
     - [Flip Summon](#8-flip-summon)
     - [Change Position](#9-change-position)
   - [Spell/Trap Actions](#spelltrap-actions)
     - [Set Spell/Trap](#10-set-spelltrap)
     - [Activate Spell](#11-activate-spell)
     - [Activate Trap](#12-activate-trap)
     - [Activate Monster Effect](#13-activate-monster-effect)
   - [Battle & Chain System](#battle--chain-system)
     - [Attack](#14-attack)
     - [Add to Chain](#15-add-to-chain)
     - [Pass Priority](#16-pass-priority)
     - [Resolve Chain](#17-resolve-chain)
     - [Get Chain State](#18-get-chain-state)
   - [Phase Management](#phase-management)
     - [Advance Phase](#19-advance-phase)
     - [Skip Battle Phase](#20-skip-battle-phase)
     - [Skip to End Phase](#21-skip-to-end-phase)
   - [End Turn](#22-end-turn)
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
| **Game Management** |
| `/api/game/create` | POST | Create a new game lobby |
| `/api/game/join` | POST | Join an existing lobby |
| `/api/game/surrender` | POST | Surrender the game |
| **Game State & Moves** |
| `/api/game/state` | GET | Get current game state |
| `/api/game/legal-moves` | GET | Get all legal moves |
| **Monster Actions** |
| `/api/game/summon` | POST | Normal Summon a monster |
| `/api/game/monster/set` | POST | Set a monster in defense position |
| `/api/game/monster/flip-summon` | POST | Flip Summon a face-down monster |
| `/api/game/monster/change-position` | POST | Change monster position (ATK ↔ DEF) |
| **Spell/Trap Actions** |
| `/api/game/spell-trap/set` | POST | Set a spell or trap card |
| `/api/game/spell-trap/activate` | POST | Activate a spell card |
| `/api/game/spell-trap/activate-trap` | POST | Activate a trap card |
| `/api/game/monster/activate-effect` | POST | Activate a monster's effect |
| **Battle & Chain System** |
| `/api/game/attack` | POST | Declare an attack |
| `/api/game/chain/add` | POST | Add a card to the chain |
| `/api/game/chain/pass` | POST | Pass priority without chaining |
| `/api/game/chain/resolve` | POST | Resolve the current chain |
| `/api/game/chain/state` | GET | Get current chain state |
| **Phase Management** |
| `/api/game/phase/advance` | POST | Advance to the next phase |
| `/api/game/phase/skip-battle` | POST | Skip the Battle Phase |
| `/api/game/phase/skip-end` | POST | Skip to End Phase |
| **Turn Management** |
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

### 7. Set Monster

Set a monster from your hand in face-down Defense Position (cannot attack while face-down).

**Endpoint:** `POST /api/game/monster/set`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "gameId": "j72xyz789ghi012",
  "cardId": "c45card234",
  "faceDown": true
}
```

**Parameters:**
- `gameId` (string, required): The game ID
- `cardId` (string, required): The monster card to set from hand
- `faceDown` (boolean, required): Always `true` for Set Monster

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "cardSet": "Goblin Attack Force",
    "position": "defense",
    "faceDown": true
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/monster/set" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card234",
    "faceDown": true
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid or missing parameters |
| 400 | `NOT_YOUR_TURN` | Not your turn |
| 400 | `CARD_NOT_IN_HAND` | Card not in your hand |
| 400 | `MONSTER_ZONE_FULL` | All 5 monster zones occupied |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 8. Flip Summon

Flip Summon a face-down monster to face-up Attack Position (uses your Normal Summon for turn if first summon).

**Endpoint:** `POST /api/game/monster/flip-summon`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "gameId": "j72xyz789ghi012",
  "cardId": "c45card234"
}
```

**Parameters:**
- `gameId` (string, required): The game ID
- `cardId` (string, required): The face-down monster to flip summon

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "cardFlipped": "Goblin Attack Force",
    "position": "attack",
    "attack": 2300,
    "defense": 1800,
    "effectTriggered": false
  }
}
```

**Success Response (with effect trigger):**
```json
{
  "success": true,
  "data": {
    "cardFlipped": "Man-Eater Bug",
    "position": "attack",
    "attack": 2000,
    "defense": 2000,
    "effectTriggered": true,
    "effect": "Destroy one monster on the field"
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/monster/flip-summon" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card234"
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid or missing parameters |
| 400 | `NOT_YOUR_TURN` | Not your turn |
| 400 | `CARD_NOT_FACE_DOWN` | Card is not face-down |
| 400 | `NOT_OWNED_BY_PLAYER` | Card not owned by player |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 9. Change Position

Change a monster's battle position (Attack ↔ Defense) - can be done once per monster per turn.

**Endpoint:** `POST /api/game/monster/change-position`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "gameId": "j72xyz789ghi012",
  "cardId": "c45card456",
  "newPosition": "defense"
}
```

**Parameters:**
- `gameId` (string, required): The game ID
- `cardId` (string, required): The monster card to rotate
- `newPosition` (string, required): Either `"attack"` or `"defense"`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "cardName": "Dark Magician",
    "previousPosition": "attack",
    "newPosition": "defense",
    "attack": 2500,
    "defense": 2100
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/monster/change-position" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card456",
    "newPosition": "defense"
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid position value |
| 400 | `NOT_YOUR_TURN` | Not your turn |
| 400 | `POSITION_ALREADY_CHANGED` | Monster position already changed this turn |
| 400 | `CANNOT_CHANGE_FACE_DOWN` | Cannot change position of face-down monsters |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 10. Set Spell/Trap

Set a spell or trap card in a spell/trap zone (face-down for traps, or face-up for continuous spells).

**Endpoint:** `POST /api/game/spell-trap/set`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "gameId": "j72xyz789ghi012",
  "cardId": "c45card567",
  "faceDown": true
}
```

**Parameters:**
- `gameId` (string, required): The game ID
- `cardId` (string, required): The spell/trap card from hand
- `faceDown` (boolean, required): `true` for traps, `false` for continuous spells

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "cardSet": "Mirror Force",
    "cardType": "trap",
    "zonePosition": 3,
    "faceDown": true
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/spell-trap/set" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card567",
    "faceDown": true
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid or missing parameters |
| 400 | `NOT_YOUR_TURN` | Not your turn |
| 400 | `CARD_NOT_IN_HAND` | Card not in your hand |
| 400 | `SPELL_TRAP_ZONE_FULL` | All 5 spell/trap zones occupied |
| 400 | `CANNOT_SET_QUICK_PLAY` | Quick-Play spells must be activated |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 11. Activate Spell

Activate a spell card (from hand or field). Some spells can only be activated during specific phases.

**Endpoint:** `POST /api/game/spell-trap/activate`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "gameId": "j72xyz789ghi012",
  "cardId": "c45card678",
  "targetCardIds": ["c45card999"]
}
```

**Parameters:**
- `gameId` (string, required): The game ID
- `cardId` (string, required): The spell card to activate
- `targetCardIds` (array, optional): Cards targeted by the spell effect

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "cardActivated": "Pot of Greed",
    "cardType": "spell",
    "spellType": "normal",
    "cardsDrawn": 2,
    "chainPosition": 0
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/spell-trap/activate" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card678",
    "targetCardIds": ["c45card999"]
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid or missing parameters |
| 400 | `NOT_YOUR_TURN` | Not your turn to activate |
| 400 | `INVALID_ACTIVATION_PHASE` | Spell cannot be activated this phase |
| 400 | `INVALID_TARGETS` | Target cards invalid or missing |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 12. Activate Trap

Activate a trap card. Trap cards activate in response to game events and can create chains.

**Endpoint:** `POST /api/game/spell-trap/activate-trap`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "gameId": "j72xyz789ghi012",
  "cardId": "c45card789",
  "targetCardIds": ["c45card111"]
}
```

**Parameters:**
- `gameId` (string, required): The game ID
- `cardId` (string, required): The trap card to activate
- `targetCardIds` (array, optional): Cards targeted by the trap effect

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "cardActivated": "Mirror Force",
    "cardType": "trap",
    "trapType": "normal",
    "chainPosition": 1,
    "targetDestroyed": ["c45card111"]
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/spell-trap/activate-trap" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card789",
    "targetCardIds": ["c45card111"]
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid or missing parameters |
| 400 | `TRAP_NOT_ACTIVE` | Trap was just set this turn (cannot activate) |
| 400 | `INVALID_ACTIVATION_CONDITIONS` | Conditions to activate trap not met |
| 400 | `INVALID_TARGETS` | Target cards invalid or missing |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 13. Activate Monster Effect

Activate an activated monster's effect (Ignition, Trigger, or Quick Effect).

**Endpoint:** `POST /api/game/monster/activate-effect`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "gameId": "j72xyz789ghi012",
  "cardId": "c45card222",
  "targetCardIds": ["c45card333"]
}
```

**Parameters:**
- `gameId` (string, required): The game ID
- `cardId` (string, required): The monster with the effect
- `targetCardIds` (array, optional): Cards targeted by the effect

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "cardName": "Blue-Eyes White Dragon",
    "effectActivated": "Draw 1 card",
    "chainPosition": 0,
    "targetCount": 0
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/monster/activate-effect" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card222",
    "targetCardIds": ["c45card333"]
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid or missing parameters |
| 400 | `NOT_YOUR_TURN` | Not your turn for Ignition effects |
| 400 | `EFFECT_NOT_AVAILABLE` | Monster has no available effects |
| 400 | `EFFECT_ALREADY_USED` | Effect already used this turn/game |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 14. Attack

Declare an attack with a monster on your field (covered in earlier section, repeated for completeness).

**Endpoint:** `POST /api/game/attack`

[See Section 6 for full Attack endpoint documentation]

---

### 15. Add to Chain

Add a card to an existing chain (in response to an opponent's activation).

**Endpoint:** `POST /api/game/chain/add`

**Request Headers:**
```
Authorization: Bearer ltcg_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "gameId": "j72xyz789ghi012",
  "cardId": "c45card444",
  "targetCardIds": ["c45card555"]
}
```

**Parameters:**
- `gameId` (string, required): The game ID
- `cardId` (string, required): The card to chain (spell, trap, or monster effect)
- `targetCardIds` (array, optional): Cards targeted by the chained card

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "cardChained": "Dark Bribe",
    "chainNumber": 2,
    "previousChain": {
      "chainNumber": 1,
      "card": "Mirror Force",
      "chainedBy": "opponent"
    }
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/chain/add" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card444",
    "targetCardIds": ["c45card555"]
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Invalid or missing parameters |
| 400 | `NO_CHAIN_TO_RESPOND_TO` | No chain has been started |
| 400 | `INVALID_CHAIN_TIMING` | Card cannot be chained at this time |
| 400 | `CHAIN_FULL` | Chain already has maximum links |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 16. Pass Priority

Pass priority to opponent without adding anything to the chain.

**Endpoint:** `POST /api/game/chain/pass`

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
  "data": {
    "passed": true,
    "priorityPlayer": "opponent",
    "canOpponentChain": true
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/chain/pass" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Missing gameId |
| 400 | `NOT_YOUR_TURN` | Not your turn |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 17. Resolve Chain

Resolve the current chain (all links resolve in reverse order).

**Endpoint:** `POST /api/game/chain/resolve`

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
  "data": {
    "chainLength": 2,
    "resolutionOrder": [
      {
        "chainNumber": 2,
        "card": "Dark Bribe",
        "effect": "Negate and draw 1 card"
      },
      {
        "chainNumber": 1,
        "card": "Mirror Force",
        "negated": true,
        "effect": "Destroyed by Dark Bribe"
      }
    ],
    "boardState": {
      "destroyed": [],
      "lifePointsChanged": false
    }
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/chain/resolve" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Missing gameId |
| 400 | `NO_CHAIN_TO_RESOLVE` | No chain is currently active |
| 400 | `NOT_YOUR_TURN` | Not your turn to resolve |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 18. Get Chain State

Get the current state of the chain stack (all links and responses).

**Endpoint:** `GET /api/game/chain/state`

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
    "chainActive": true,
    "chainLength": 2,
    "chainLinks": [
      {
        "chainNumber": 1,
        "card": "Mirror Force",
        "cardType": "trap",
        "owner": "opponent",
        "targets": [],
        "negated": false
      },
      {
        "chainNumber": 2,
        "card": "Dark Bribe",
        "cardType": "trap",
        "owner": "self",
        "targets": ["c45card666"],
        "negated": false
      }
    ],
    "nextToResolve": 2,
    "currentPriority": "opponent",
    "canAddToChain": true
  }
}
```

**curl Example:**
```bash
curl -X GET "https://your-domain.com/api/game/chain/state?gameId=j72xyz789ghi012" \
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

### 19. Advance Phase

Advance to the next phase in the turn sequence.

**Endpoint:** `POST /api/game/phase/advance`

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
  "data": {
    "previousPhase": "draw",
    "newPhase": "main1",
    "turnNumber": 5
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/phase/advance" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Missing gameId |
| 400 | `NOT_YOUR_TURN` | Not your turn |
| 400 | `CANNOT_ADVANCE_PHASE` | Current phase has mandatory actions |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 20. Skip Battle Phase

Skip directly to the End Phase (bypasses Battle Phase).

**Endpoint:** `POST /api/game/phase/skip-battle`

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
  "data": {
    "skipped": true,
    "previousPhase": "main1",
    "newPhase": "end",
    "reason": "Manually skipped"
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/phase/skip-battle" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Missing gameId |
| 400 | `NOT_YOUR_TURN` | Not your turn |
| 400 | `INVALID_PHASE` | Not in Main Phase 1 or Main Phase 2 |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 21. Skip to End Phase

Skip directly to the End Phase from any Main Phase.

**Endpoint:** `POST /api/game/phase/skip-end`

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
  "data": {
    "skipped": true,
    "previousPhase": "main2",
    "newPhase": "end",
    "battlePhaseSkipped": false
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/phase/skip-end" \
  -H "Authorization: Bearer ltcg_1234567890abcdef1234567890abcdef12345" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'
```

**Error Responses:**

| Status | Code | Reason |
|--------|------|--------|
| 400 | `INVALID_REQUEST` | Missing gameId |
| 400 | `NOT_YOUR_TURN` | Not your turn |
| 400 | `INVALID_PHASE` | Not in a Main Phase |
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |

---

### 22. End Turn

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

### 3. Surrender

Surrender the game immediately (opponent wins).

**Endpoint:** `POST /api/game/surrender`

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
  "data": {
    "surrendered": true,
    "winnerId": "opponent_player_id",
    "winnerUsername": "OpponentName",
    "gameEnded": true
  }
}
```

**curl Example:**
```bash
curl -X POST "https://your-domain.com/api/game/surrender" \
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
| 404 | `GAME_NOT_FOUND` | Game doesn't exist |
| 409 | `GAME_ALREADY_ENDED` | Game has already ended |

---

## Complete Game Flow

Here's a complete example of a realistic game with spell/trap activation and chains:

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

# Response shows available actions: summon, set, activate spells, etc.
```

### Step 5: Summon a Monster (Player 1)

```bash
# Player 1 summons Blue-Eyes White Dragon in attack position
curl -X POST "https://your-domain.com/api/game/summon" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card123",
    "position": "attack"
  }'

# Response: Monster summoned successfully
```

### Step 6: Set a Trap (Player 1)

```bash
# Player 1 sets Mirror Force trap face-down
curl -X POST "https://your-domain.com/api/game/spell-trap/set" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card567",
    "faceDown": true
  }'

# Response: Trap set in spell/trap zone
```

### Step 7: End Turn (Player 1)

```bash
# Player 1 ends their turn
curl -X POST "https://your-domain.com/api/game/end-turn" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'

# Response: Turn ended, Player 2's turn begins
```

### Step 8: Player 2's Turn - Set Monster

```bash
# Player 2 sets a face-down monster in defense position
curl -X POST "https://your-domain.com/api/game/monster/set" \
  -H "Authorization: Bearer ltcg_player2_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card456",
    "faceDown": true
  }'

# Response: Monster set face-down
```

### Step 9: Player 2 Activates a Spell

```bash
# Player 2 activates Pot of Greed to draw 2 cards
curl -X POST "https://your-domain.com/api/game/spell-trap/activate" \
  -H "Authorization: Bearer ltcg_player2_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card678"
  }'

# Response: Spell activated, cards drawn
```

### Step 10: Player 2 Ends Turn

```bash
# Player 2 ends their turn
curl -X POST "https://your-domain.com/api/game/end-turn" \
  -H "Authorization: Bearer ltcg_player2_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'
```

### Step 11: Player 1's Second Turn - Attack

```bash
# Player 1 advances to Battle Phase
curl -X POST "https://your-domain.com/api/game/phase/advance" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'

# Player 1 attacks the set monster
curl -X POST "https://your-domain.com/api/game/attack" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "attackerCardId": "c45card123",
    "targetCardId": "c45card456"
  }'

# Response: Set monster flips, takes damage, may trigger flip effect
```

### Step 12: Player 2's Trap Response (Chain)

```bash
# Player 2 sees the attack and activates Trap Hole in response
curl -X POST "https://your-domain.com/api/game/spell-trap/activate-trap" \
  -H "Authorization: Bearer ltcg_player2_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card789",
    "targetCardIds": ["c45card123"]
  }'

# Response: Trap activated, added to chain as link 1
```

### Step 13: Player 1 Chains a Response

```bash
# Player 1 activates Dark Bribe to negate the Trap Hole
curl -X POST "https://your-domain.com/api/game/chain/add" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card890",
    "targetCardIds": ["c45card789"]
  }'

# Response: Dark Bribe added as chain link 2
```

### Step 14: Get Chain State

```bash
# Check the current chain state
curl -X GET "https://your-domain.com/api/game/chain/state?gameId=j72xyz789ghi012" \
  -H "Authorization: Bearer ltcg_player1_api_key"

# Response shows:
# - Chain link 1: Trap Hole (Player 2)
# - Chain link 2: Dark Bribe (Player 1)
# - Ready to resolve in reverse order
```

### Step 15: Resolve the Chain

```bash
# Both players pass priority, resolve the chain
curl -X POST "https://your-domain.com/api/game/chain/resolve" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'

# Response shows:
# - Chain link 2 (Dark Bribe) resolves first, negates Trap Hole
# - Chain link 1 (Trap Hole) is negated and sent to graveyard
# - Player 1 draws 1 card from Dark Bribe
# - Attack continues
```

### Step 16: Attack Damage Calculation

```bash
# After chain resolves, attack damage is applied
# Blue-Eyes White Dragon (3000 ATK) vs set monster (assume ~1500 DEF)
# Response shows monster destroyed, 1500 damage dealt to Player 2

# Player 2 life points: 8000 - 1500 = 6500
```

### Step 17: Player 1 Skips to End Phase

```bash
# Player 1 has no more attacks, skip to End Phase
curl -X POST "https://your-domain.com/api/game/phase/skip-end" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'

# Response: Battle Phase skipped, now in End Phase
```

### Step 18: End Turn

```bash
# Player 1 ends turn
curl -X POST "https://your-domain.com/api/game/end-turn" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'

# Response: Turn ends, Player 2's turn begins
# Player 2 draws their card for turn
```

### Step 19: Player 2's Counter - Flip Summon

```bash
# Player 2 flips a face-down monster (Sangan) to attack mode
curl -X POST "https://your-domain.com/api/game/monster/flip-summon" \
  -H "Authorization: Bearer ltcg_player2_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "cardId": "c45card456"
  }'

# Response: Monster flipped, flip effect triggers (searches deck)
```

### Step 20: Continue Play

```bash
# Game continues with players summoning, setting, activating spells/traps
# and building chains. Eventually one player defeats the other.

# Final attack that wins:
curl -X POST "https://your-domain.com/api/game/attack" \
  -H "Authorization: Bearer ltcg_player2_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012",
    "attackerCardId": "c45card111"
  }'

# Response when game ends:
# {
#   "success": true,
#   "damage": 3200,
#   "destroyed": [],
#   "gameEnded": true,
#   "winnerId": "j29player2id",
#   "loserLifePoints": 0
# }
```

### Alternative: Surrender

```bash
# If a player wants to give up at any time
curl -X POST "https://your-domain.com/api/game/surrender" \
  -H "Authorization: Bearer ltcg_player1_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "j72xyz789ghi012"
  }'

# Response: Game ends immediately, opponent wins
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
