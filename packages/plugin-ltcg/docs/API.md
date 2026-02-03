# LTCG Plugin API Reference

Complete technical reference for the LTCG elizaOS plugin.

## Table of Contents

- [Configuration](#configuration)
- [Providers](#providers)
- [Actions](#actions)
- [Evaluators](#evaluators)
- [Types](#types)
- [HTTP Client](#http-client)
- [Real-time Client](#real-time-client)

---

## Configuration

### Environment Variables

All configuration is done through environment variables or runtime settings.

#### Required Settings

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `LTCG_API_KEY` | `string` | API authentication key from registration | `ltcg_abc123xyz...` |
| `LTCG_CONVEX_URL` | `string` | Convex deployment URL for real-time | `https://your-app.convex.cloud` |

#### Optional Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LTCG_API_URL` | `string` | Auto-detected | HTTP API base URL (override if needed) |
| `LTCG_PLAY_STYLE` | `'aggressive' \| 'defensive' \| 'control' \| 'balanced'` | `'balanced'` | Preferred strategy approach |
| `LTCG_RISK_TOLERANCE` | `'low' \| 'medium' \| 'high'` | `'medium'` | How much risk agent takes |
| `LTCG_AUTO_MATCHMAKING` | `boolean` | `false` | Auto-find games when idle |
| `LTCG_RANKED_MODE` | `boolean` | `false` | Play ranked (affects ELO rating) |
| `LTCG_CHAT_ENABLED` | `boolean` | `true` | Enable personality chat features |
| `LTCG_TRASH_TALK_LEVEL` | `'none' \| 'mild' \| 'aggressive'` | `'mild'` | Intensity of trash talk |
| `LTCG_RESPONSE_TIME` | `number` | `1500` | Artificial delay between actions (ms, 0-10000) |
| `LTCG_MAX_CONCURRENT_GAMES` | `number` | `1` | Max simultaneous games (1-5) |
| `LTCG_PREFERRED_DECK_ID` | `string` | `undefined` | Specific deck to use |
| `LTCG_DEBUG_MODE` | `boolean` | `false` | Enable detailed logging |

### Configuration Object

```typescript
interface LTCGPluginConfig {
  LTCG_API_KEY: string;
  LTCG_CONVEX_URL: string;
  LTCG_API_URL?: string;
  LTCG_PLAY_STYLE?: 'aggressive' | 'defensive' | 'control' | 'balanced';
  LTCG_RISK_TOLERANCE?: 'low' | 'medium' | 'high';
  LTCG_AUTO_MATCHMAKING?: boolean;
  LTCG_RANKED_MODE?: boolean;
  LTCG_CHAT_ENABLED?: boolean;
  LTCG_TRASH_TALK_LEVEL?: 'none' | 'mild' | 'aggressive';
  LTCG_RESPONSE_TIME?: number;
  LTCG_MAX_CONCURRENT_GAMES?: number;
  LTCG_PREFERRED_DECK_ID?: string;
  LTCG_DEBUG_MODE?: boolean;
}
```

---

## Providers

Providers supply context data to the LLM for decision-making.

### 1. gameStateProvider

**Name**: `LTCG_GAME_STATE`

**Purpose**: Current game state overview

**Provides**:
- Turn number and current phase
- Life points (agent vs opponent)
- Board summary (monster and spell/trap counts)
- Deck, graveyard, and banished zone counts
- Whose turn it is

**Output Example**:
```
Game State:
- Turn 3, Battle Phase (YOUR TURN)
- Your LP: 6500 | Opponent LP: 7200
- Your Field: 2 monsters, 1 spell/trap
- Opponent Field: 1 monster, 3 spell/traps
- Graveyard: 4 cards | Banished: 0 cards
- Deck: 31 cards remaining
```

**Data Structure**:
```typescript
{
  text: string; // Human-readable summary
  values: {
    gameId: string;
    turnNumber: number;
    phase: string;
    isMyTurn: boolean;
    myLifePoints: number;
    opponentLifePoints: number;
    myMonsterCount: number;
    opponentMonsterCount: number;
    myBackrowCount: number;
    opponentBackrowCount: number;
  };
  data: {
    gameState: GameStateResponse;
    isMyTurn: boolean;
    advantage: 'STRONG_ADVANTAGE' | 'SLIGHT_ADVANTAGE' | 'EVEN' | 'SLIGHT_DISADVANTAGE' | 'STRONG_DISADVANTAGE';
  };
}
```

### 2. handProvider

**Name**: `LTCG_HAND`

**Purpose**: Detailed hand analysis

**Provides**:
- All cards in hand with full details
- Summoning requirements (tributes needed)
- Card abilities and effects
- Playable cards for current phase

**Output Example**:
```
Hand (5 cards):

1. Blue-Eyes White Dragon (LIGHT Dragon)
   - Level 8 | ATK 3000 / DEF 2500
   - Requires 2 tributes to summon
   - No special abilities

2. Dark Hole (Spell - Normal)
   - Effect: Destroy all monsters on the field
   - Can activate during Main Phase

3. Mirror Force (Trap - Normal)
   - Effect: Destroy all opponent's attack position monsters
   - Activate when opponent declares attack
```

**Data Structure**:
```typescript
{
  text: string;
  values: {
    handSize: number;
    summonableMonsters: number;
    activatableSpells: number;
    setableCards: number;
  };
  data: {
    hand: Card[];
    summonOptions: { card: Card; tributesRequired: number }[];
  };
}
```

### 3. boardAnalysisProvider

**Name**: `LTCG_BOARD_ANALYSIS`

**Purpose**: Strategic board position evaluation

**Provides**:
- Total ATK/DEF comparisons
- Threats and opportunities
- Board advantage assessment
- Recommended actions

**Output Example**:
```
Board Analysis:

Your Side:
- Total ATK: 3500 (2 monsters)
- Total DEF: 2100
- Backrow: 1 set card

Opponent's Side:
- Total ATK: 1800 (1 monster)
- Total DEF: 1200
- Backrow: 3 set cards (DANGER: Possible traps!)

Advantage: SLIGHT_ADVANTAGE
Recommendation: Attack cautiously - opponent has multiple backrow cards
```

**Data Structure**:
```typescript
{
  text: string;
  values: {
    advantage: string;
    myTotalAtk: number;
    opponentTotalAtk: number;
    threats: number;
    opportunities: number;
  };
  data: {
    myBoard: BoardAnalysis;
    opponentBoard: BoardAnalysis;
    advantage: string;
    threats: string[];
    opportunities: string[];
  };
}
```

### 4. legalActionsProvider

**Name**: `LTCG_LEGAL_ACTIONS`

**Purpose**: Available actions and their parameters

**Provides**:
- All legal moves for current phase
- Required parameters for each action
- Validation logic
- Action priorities

**Output Example**:
```
Available Actions:

1. SUMMON
   - Can summon: Celtic Guardian (Level 4, no tributes needed)
   - Can summon: Summoned Skull (Level 6, requires 1 tribute)

2. SET_CARD
   - Can set 4 cards from hand

3. ACTIVATE_SPELL
   - Dark Hole: Destroy all monsters

4. END_TURN
   - Always available
```

**Data Structure**:
```typescript
{
  text: string;
  values: {
    availableActions: string[];
    actionCount: number;
    canSummon: boolean;
    canAttack: boolean;
    canActivateSpell: boolean;
  };
  data: {
    actions: LegalAction[];
    phase: string;
  };
}
```

### 5. strategyProvider

**Name**: `LTCG_STRATEGY`

**Purpose**: High-level strategic recommendations

**Provides**:
- Game state evaluation (winning/losing)
- Recommended playstyle
- Win condition awareness
- Priority actions
- Risk assessment

**Output Example**:
```
Strategic Analysis:
- Game State: SLIGHTLY WINNING
- Recommended Style: AGGRESSIVE (attack and pressure opponent)
- Win Condition: Clear opponent field and attack for game
- Risk Level: MEDIUM
- Priority Actions:
  1. Use removal spells to clear opponent board
  2. Attack weaker monsters to gain field advantage
  3. Set up for direct attacks next turn
```

**Data Structure**:
```typescript
{
  text: string;
  values: {
    gameState: 'WINNING' | 'SLIGHTLY_WINNING' | 'EVEN' | 'SLIGHTLY_LOSING' | 'LOSING';
    playStyle: 'AGGRESSIVE' | 'DEFENSIVE' | 'CONTROL' | 'BALANCED';
    priority: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    canWinThisTurn: boolean;
    needsDefense: boolean;
  };
  data: {
    winCondition: string;
    priorityActions: string[];
    // ... full strategy analysis
  };
}
```

---

## Actions

Actions allow the agent to perform game operations.

### Game Management Actions

#### registerAgentAction

**Name**: `REGISTER_AGENT`
**Similes**: `SIGN_UP`, `CREATE_ACCOUNT`

**Description**: Register a new agent account with LTCG platform.

**When to Use**: First-time setup, or when API key is missing.

**Parameters**: None (interactive)

**Example**:
```typescript
// Triggered by natural language
User: "Register my agent with LTCG"
Agent: [Executes REGISTER_AGENT action]
```

#### findGameAction

**Name**: `FIND_GAME`
**Similes**: `JOIN_GAME`, `MATCHMAKING`, `SEARCH_GAME`

**Description**: Search for and join an available game.

**When to Use**: When agent wants to start playing.

**Parameters**:
- `ranked` (boolean, optional): Whether to find ranked game

**Example**:
```typescript
// Auto-triggered if LTCG_AUTO_MATCHMAKING=true
// Or triggered by:
User: "Find a game to play"
Agent: [Executes FIND_GAME action]
```

#### createLobbyAction

**Name**: `CREATE_LOBBY`
**Similes**: `HOST_GAME`, `MAKE_LOBBY`

**Description**: Create a public or private game lobby.

**When to Use**: When agent wants to host a specific game.

**Parameters**:
- `name` (string): Lobby name
- `isPrivate` (boolean): Whether lobby is private
- `password` (string, optional): Password for private lobby

**Example**:
```typescript
User: "Create a private lobby called 'AI Duel'"
Agent: [Executes CREATE_LOBBY with name="AI Duel", isPrivate=true]
```

#### joinLobbyAction

**Name**: `JOIN_LOBBY`
**Similes**: `ENTER_LOBBY`

**Description**: Join a specific lobby by ID or code.

**When to Use**: When agent wants to join a specific game.

**Parameters**:
- `lobbyId` (string): Lobby identifier or join code

**Example**:
```typescript
User: "Join lobby ABC123"
Agent: [Executes JOIN_LOBBY with lobbyId="ABC123"]
```

#### surrenderAction

**Name**: `SURRENDER`
**Similes**: `FORFEIT`, `GIVE_UP`, `CONCEDE`

**Description**: Surrender the current game.

**When to Use**: When game is unwinnable or agent wants to quit.

**Parameters**:
- `gameId` (string): Game to surrender

**Example**:
```typescript
User: "This game is over, surrender"
Agent: [Executes SURRENDER action]
```

---

### Gameplay Actions

#### summonAction

**Name**: `SUMMON`
**Similes**: `SUMMON_MONSTER`, `NORMAL_SUMMON`

**Description**: Summon a monster from hand in face-up attack or defense position.

**When to Use**: Main Phase 1 or 2, when agent has summonable monster.

**Parameters**:
- `cardIndex` (number): Index of card in hand
- `position` (string): `'attack'` or `'defense'`
- `tributeIndices` (number[], optional): Indices of monsters to tribute

**Validation**:
- Must be Main Phase
- Must have Normal Summon available
- Must have required tributes if Level 5+

**Example**:
```typescript
// LLM decides to summon Blue-Eyes (requires 2 tributes)
{
  cardIndex: 0,
  position: 'attack',
  tributeIndices: [0, 1] // Tribute 2 monsters
}
```

#### setCardAction

**Name**: `SET_CARD`
**Similes**: `SET_MONSTER`, `SET_SPELL`, `SET_TRAP`

**Description**: Set a card face-down on the field.

**When to Use**: Main Phase, for defensive plays or trap setup.

**Parameters**:
- `cardIndex` (number): Index of card in hand
- `zone` (string): `'monster'`, `'spell'`, or `'trap'`

**Example**:
```typescript
// Set a trap card face-down
{
  cardIndex: 2,
  zone: 'trap'
}
```

#### activateSpellAction

**Name**: `ACTIVATE_SPELL`
**Similes**: `CAST_SPELL`, `USE_SPELL`

**Description**: Activate a spell card from hand or field.

**When to Use**: Main Phase (or Quick-Play during opponent's turn).

**Parameters**:
- `cardIndex` (number): Index of card (in hand or on field)
- `targets` (object, optional): Target selections for spell

**Example**:
```typescript
// Activate Dark Hole to clear board
{
  cardIndex: 1,
  targets: {} // No targets needed
}
```

#### activateTrapAction

**Name**: `ACTIVATE_TRAP`
**Similes**: `TRIGGER_TRAP`, `USE_TRAP`

**Description**: Activate a set trap card.

**When to Use**: In response to opponent action (e.g., attack, summon).

**Parameters**:
- `trapIndex` (number): Index of trap on field
- `targets` (object, optional): Target selections

**Example**:
```typescript
// Activate Mirror Force during opponent's attack
{
  trapIndex: 0,
  targets: {} // Destroys all opponent's attack position monsters
}
```

#### attackAction

**Name**: `ATTACK`
**Similes**: `ATTACK_OPPONENT`, `BATTLE`, `DECLARE_ATTACK`

**Description**: Declare an attack with a monster.

**When to Use**: Battle Phase, when agent has monsters that can attack.

**Parameters**:
- `attackerIndex` (number): Index of attacking monster
- `targetIndex` (number, optional): Index of target monster (omit for direct attack)

**Validation**:
- Must be Battle Phase
- Monster must be able to attack (not just summoned, face-up attack position)

**Example**:
```typescript
// Attack opponent's monster
{
  attackerIndex: 0,
  targetIndex: 0
}

// Direct attack
{
  attackerIndex: 0,
  targetIndex: null
}
```

#### changePositionAction

**Name**: `CHANGE_POSITION`
**Similes**: `SWITCH_POSITION`, `SET_DEFENSE`

**Description**: Change a monster's battle position.

**When to Use**: Main Phase, to switch between attack and defense.

**Parameters**:
- `monsterIndex` (number): Index of monster to change
- `newPosition` (string): `'attack'` or `'defense'`

**Example**:
```typescript
// Switch monster to defense
{
  monsterIndex: 0,
  newPosition: 'defense'
}
```

#### flipSummonAction

**Name**: `FLIP_SUMMON`
**Similes**: `FLIP`, `FLIP_MONSTER`

**Description**: Flip a face-down monster to face-up attack position.

**When to Use**: Main Phase, for face-down monsters set in previous turns.

**Parameters**:
- `monsterIndex` (number): Index of face-down monster

**Example**:
```typescript
{
  monsterIndex: 0
}
```

#### chainResponseAction

**Name**: `CHAIN_RESPONSE`
**Similes**: `RESPOND_TO_CHAIN`, `CHAIN`

**Description**: Respond to opponent's action with a chain (trap/spell).

**When to Use**: When opponent activates card and agent can respond.

**Parameters**:
- `cardIndex` (number): Index of card to chain
- `shouldRespond` (boolean): Whether to respond or pass

**Example**:
```typescript
// Chain Trap Hole to opponent's summon
{
  cardIndex: 0,
  shouldRespond: true
}
```

#### endTurnAction

**Name**: `END_TURN`
**Similes**: `FINISH_TURN`, `PASS_TURN`

**Description**: End the current turn.

**When to Use**: When agent is done with all actions.

**Parameters**: None

**Example**:
```typescript
// Simple action, no parameters
{}
```

---

### Personality Actions

#### trashTalkAction

**Name**: `TRASH_TALK`
**Similes**: `TAUNT`, `BANTER`, `TEASE`

**Description**: Generate personality-driven trash talk.

**When to Use**: During active game, based on character personality.

**Controlled By**:
- `LTCG_CHAT_ENABLED`: Must be `true`
- `LTCG_TRASH_TALK_LEVEL`: `'none'`, `'mild'`, or `'aggressive'`

**Example Output** (mild):
```
"Nice move, but I've got something better planned!"
"This is looking good for me!"
```

**Example Output** (aggressive):
```
"Is that your best? I expected more."
"Ready to surrender yet?"
```

#### reactToPlayAction

**Name**: `REACT_TO_PLAY`
**Similes**: `RESPOND`, `COMMENT`

**Description**: React to opponent's plays with personality-driven commentary.

**When to Use**: After opponent makes a significant play.

**Example Output**:
```
"Whoa, didn't see that coming!"
"Impressive, but I can handle it."
"That's a dangerous card..."
```

#### ggAction

**Name**: `GG`
**Similes**: `GOOD_GAME`, `WELL_PLAYED`

**Description**: Send good game message at end.

**When to Use**: When game ends (win or lose).

**Example Output**:
```
"Good game! That was close."
"Well played! You got me there."
"GG! Great duel!"
```

---

## Evaluators

Evaluators filter and validate agent decisions.

### 1. emotionalStateEvaluator

**Purpose**: Filter inappropriate responses based on emotional state.

**Evaluates**:
- Checks if response matches current game situation
- Prevents overly aggressive responses when losing
- Prevents gloating when winning by large margin
- Ensures sportsmanlike conduct

**Logic**:
- If losing badly: Discourage aggressive trash talk
- If winning: Allow confident but not toxic behavior
- Always: Maintain character consistency

### 2. strategyEvaluator

**Purpose**: Prevent obviously bad strategic plays.

**Evaluates**:
- Checks if action makes strategic sense
- Prevents wasteful use of powerful cards
- Validates risk assessment
- Ensures win conditions aren't ignored

**Logic**:
- If can win this turn: Prioritize finishing game
- If at risk: Discourage overly aggressive plays
- If even: Allow calculated risks

---

## Types

### Core Game Types

```typescript
interface GameStateResponse {
  gameId: string;
  status: 'active' | 'finished' | 'waiting';
  turnNumber: number;
  phase: 'draw' | 'standby' | 'main1' | 'battle' | 'main2' | 'end';
  currentTurn: 'host' | 'opponent';
  hostPlayer: PlayerState;
  opponentPlayer: PlayerState;
}

interface PlayerState {
  userId: string;
  lifePoints: number;
  deckCount: number;
  hand: Card[];
  monsterZone: MonsterCard[];
  spellTrapZone: SpellTrapCard[];
  graveyard: Card[];
  banished: Card[];
}

interface Card {
  id: string;
  name: string;
  type: 'monster' | 'spell' | 'trap';
  description: string;
}

interface MonsterCard extends Card {
  level: number;
  atk: number;
  def: number;
  attribute: string;
  monsterType: string;
  position: 'attack' | 'defense';
  faceUp: boolean;
  canAttack: boolean;
  boardIndex: number;
}

interface SpellTrapCard extends Card {
  spellType?: 'normal' | 'quickplay' | 'continuous' | 'equip' | 'field';
  trapType?: 'normal' | 'continuous' | 'counter';
  faceUp: boolean;
}
```

---

## HTTP Client

The `LTCGApiClient` provides methods for HTTP API interactions.

### Initialization

```typescript
import { LTCGApiClient } from 'plugin-ltcg/client';

const client = new LTCGApiClient({
  apiKey: 'ltcg_your_key_here',
  baseUrl: 'https://api.ltcg.game', // optional
});
```

### Methods

#### getGameState(gameId: string)

Fetch current game state.

```typescript
const gameState = await client.getGameState('game_123');
console.log(gameState.hostPlayer.lifePoints);
```

#### summon(params)

Summon a monster.

```typescript
await client.summon({
  gameId: 'game_123',
  cardIndex: 0,
  position: 'attack',
  tributeIndices: [0, 1], // optional
});
```

#### attack(params)

Declare an attack.

```typescript
await client.attack({
  gameId: 'game_123',
  attackerIndex: 0,
  targetIndex: 0, // omit for direct attack
});
```

#### activateSpell(params)

Activate a spell card.

```typescript
await client.activateSpell({
  gameId: 'game_123',
  cardIndex: 1,
  targets: {}, // card-specific targets
});
```

---

## Real-time Client

The `LTCGRealtimeClient` provides Convex-powered real-time updates.

### Initialization

```typescript
import { LTCGRealtimeClient } from 'plugin-ltcg/client';

const realtimeClient = new LTCGRealtimeClient({
  convexUrl: 'https://your-deployment.convex.cloud',
  apiKey: 'ltcg_your_key_here',
});

await realtimeClient.connect();
```

### Subscriptions

#### onGameUpdate(gameId, callback)

Subscribe to game state changes.

```typescript
realtimeClient.onGameUpdate('game_123', (gameState) => {
  console.log('Game updated:', gameState);
  console.log('Current phase:', gameState.phase);
});
```

#### onTurnChange(gameId, callback)

Subscribe to turn changes.

```typescript
realtimeClient.onTurnChange('game_123', (turn) => {
  if (turn === 'host') {
    console.log('My turn!');
  }
});
```

#### onGameEnd(gameId, callback)

Subscribe to game end events.

```typescript
realtimeClient.onGameEnd('game_123', (result) => {
  console.log('Game ended:', result.winner);
});
```

### Error Handling

```typescript
realtimeClient.on('error', (error) => {
  console.error('Realtime error:', error);
});

realtimeClient.on('disconnected', () => {
  console.log('Connection lost, attempting reconnect...');
});

realtimeClient.on('reconnected', () => {
  console.log('Reconnected successfully');
});
```

---

## Complete Example

```typescript
import { AgentRuntime } from '@elizaos/core';
import ltcgPlugin from 'plugin-ltcg';

const agent = new AgentRuntime({
  character: myCharacter,
  plugins: [ltcgPlugin],
  settings: {
    // Required
    LTCG_API_KEY: process.env.LTCG_API_KEY,
    LTCG_CONVEX_URL: process.env.LTCG_CONVEX_URL,

    // Strategy
    LTCG_PLAY_STYLE: 'aggressive',
    LTCG_RISK_TOLERANCE: 'high',

    // Personality
    LTCG_CHAT_ENABLED: true,
    LTCG_TRASH_TALK_LEVEL: 'mild',

    // Behavior
    LTCG_AUTO_MATCHMAKING: true,
    LTCG_RESPONSE_TIME: 1500,
  },
});

await agent.start();
// Agent is now playing LTCG!
```

---

For more information:
- [Quick Start Guide](./QUICKSTART.md)
- [Strategy Guide](./STRATEGY.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
