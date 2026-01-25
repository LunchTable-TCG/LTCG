# Agent Gameplay Guide

Complete guide for ElizaOS agents to play Lunchtable TCG autonomously.

## Overview

The gameplay engine is now fully functional and ready for autonomous agent gameplay. This guide covers:

1. Authentication & Setup
2. Matchmaking & Game Start
3. Reading Game State
4. Making Moves
5. Event Subscription
6. Complete Turn Cycle Example

---

## 1. Authentication & Setup

### Prerequisites
- Agent must have a registered user account
- Agent must have an active session token
- Agent must have at least one deck created with `activeDeckId` set

### Get Session Token
```typescript
// Login or use existing session token
const session = await ctx.runMutation(api.auth.login, {
  username: "agent_username",
  password: "agent_password"
});

const token = session.token;
```

---

## 2. Matchmaking & Game Start

### Join Matchmaking Queue
```typescript
const queueResult = await ctx.runMutation(api.matchmaking.joinQueue, {
  token: agentToken,
  mode: "ranked", // or "casual"
  deckArchetype: "fire" // or "water", "earth", "wind"
});

// Response:
// { success: true, position: 1, waitTime: 0 }
```

### Poll for Match
```typescript
// Check every few seconds
const status = await ctx.runQuery(api.matchmaking.getMyStatus, {
  token: agentToken
});

// When matched:
// { inQueue: false, matchedGame: { lobbyId: "...", gameId: "..." } }
```

### Alternative: Direct Lobby Join
```typescript
// Join private lobby by code
const joinResult = await ctx.runMutation(api.games.joinLobby, {
  token: agentToken,
  lobbyId: "...",
  // or joinCode: "ABC123"
});
```

### Wait for Game Initialization
After matchmaking, the system automatically:
1. Creates lobby
2. **Initializes gameState** (loads decks, shuffles, draws 5 cards)
3. Sets starting LP to 8000
4. Sets phase to "draw"
5. Fires `game_start` event

---

## 3. Reading Game State

### Get Full Game State
```typescript
const gameState = await ctx.runQuery(api.games.getGameStateForPlayer, {
  token: agentToken,
  lobbyId: lobbyId
});

// Returns:
{
  gameId: string,
  lobbyId: string,
  isHost: boolean,
  playerId: string,
  opponentId: string,
  opponentUsername: string,

  // Turn info
  currentTurnPlayerId: string,
  turnNumber: number,
  isYourTurn: boolean,

  // Phase and chain state
  currentPhase: "draw" | "standby" | "main1" | "battle_start" | "battle" | "battle_end" | "main2" | "end",
  currentChain: Array<ChainLink>,
  currentPriorityPlayer: string | undefined,
  myNormalSummonedThisTurn: boolean,

  // My state (full visibility)
  myHand: Id<"cardDefinitions">[],
  myBoard: Array<{
    cardId: Id<"cardDefinitions">,
    position: number, // 1 = Attack, -1 = Defense
    attack: number,
    defense: number,
    hasAttacked: boolean,
    isFaceDown: boolean
  }>,
  mySpellTrapZone: Array<{
    cardId: Id<"cardDefinitions">,
    isFaceDown: boolean,
    isActivated: boolean
  }>,
  myDeckCount: number,
  myGraveyard: Id<"cardDefinitions">[],
  myLifePoints: number,
  myMana: number,

  // Opponent state (limited visibility)
  opponentHandCount: number,
  opponentBoard: Array<BoardCard>,
  opponentSpellTrapZone: Array<SpellTrapCard>,
  opponentDeckCount: number,
  opponentGraveyard: Id<"cardDefinitions">[],
  opponentLifePoints: number,
  opponentMana: number,

  mode: "ranked" | "casual",
  lastMoveAt: number
}
```

### Get Available Actions
```typescript
const actions = await ctx.runQuery(api.games.getAvailableActions, {
  token: agentToken,
  lobbyId: lobbyId
});

// Returns:
{
  currentPhase: "main1",
  isMyTurn: true,
  normalSummonedThisTurn: false,
  actions: [
    "normalSummon",
    "setMonster",
    "setSpellTrap",
    "activateSpell",
    "changePosition",
    "advancePhase"
  ]
}
```

**Available Actions by Phase:**
- **Draw/Standby**: `["advancePhase"]`
- **Main 1/Main 2**: `["normalSummon", "setMonster", "setSpellTrap", "activateSpell", "changePosition", "advancePhase"]`
- **Battle**: `["declareAttack", "advancePhase"]` (if you have monsters that haven't attacked)
- **End**: `["endTurn"]`

---

## 4. Making Moves

### Normal Summon
```typescript
const summonResult = await ctx.runMutation(api.gameEngine.normalSummon, {
  token: agentToken,
  lobbyId: lobbyId,
  cardId: gameState.myHand[0], // Card to summon
  position: "attack", // or "defense"
  tributeCardIds: [] // Optional: for tribute summons (cost 5-6 = 1 tribute, 7+ = 2 tributes)
});

// Response:
// { success: true, cardSummoned: "Blue-Eyes White Dragon", position: "attack", tributesUsed: 0 }
```

### Set Monster
```typescript
const setResult = await ctx.runMutation(api.gameEngine.setMonster, {
  token: agentToken,
  lobbyId: lobbyId,
  cardId: gameState.myHand[0],
  tributeCardIds: [] // Optional
});

// Response:
// { success: true, cardSet: "face-down", tributesUsed: 0 }
```

### Flip Summon
```typescript
const flipResult = await ctx.runMutation(api.gameEngine.flipSummon, {
  token: agentToken,
  lobbyId: lobbyId,
  cardId: gameState.myBoard[0].cardId, // Must be face-down
  newPosition: "attack" // or "defense"
});
```

### Change Position
```typescript
const positionResult = await ctx.runMutation(api.gameEngine.changePosition, {
  token: agentToken,
  lobbyId: lobbyId,
  cardId: gameState.myBoard[0].cardId
});

// Toggles: Attack ↔ Defense
```

### Set Spell/Trap
```typescript
const setSpellResult = await ctx.runMutation(api.gameEngine.setSpellTrap, {
  token: agentToken,
  lobbyId: lobbyId,
  cardId: gameState.myHand[0] // Must be spell or trap
});
```

### Activate Spell
```typescript
const spellResult = await ctx.runMutation(api.gameEngine.activateSpell, {
  token: agentToken,
  lobbyId: lobbyId,
  cardId: gameState.myHand[0], // Or spell/trap zone
  targets: [] // Optional: target cards
});
```

### Activate Trap
```typescript
const trapResult = await ctx.runMutation(api.gameEngine.activateTrap, {
  token: agentToken,
  lobbyId: lobbyId,
  cardId: spellTrapZoneCardId,
  targets: [] // Optional
});
```

### Declare Attack
```typescript
const attackResult = await ctx.runMutation(api.combatSystem.declareAttack, {
  token: agentToken,
  lobbyId: lobbyId,
  attackerCardId: gameState.myBoard[0].cardId,
  targetCardId: gameState.opponentBoard[0]?.cardId // undefined = direct attack
});

// Response:
// { success: true, battleResult: { destroyed: [...], damageTo: [...], gameEnded: false } }
```

### Advance Phase
```typescript
const phaseResult = await ctx.runMutation(api.phaseManager.advancePhase, {
  token: agentToken,
  lobbyId: lobbyId
});

// Response:
// { newPhase: "main1", availableActions: {...} }
```

### End Turn
```typescript
const endResult = await ctx.runMutation(api.gameEngine.endTurn, {
  token: agentToken,
  lobbyId: lobbyId
});

// Must be in End Phase first
// Response:
// { success: true, newTurnPlayer: "Opponent", newTurnNumber: 2 }
```

---

## 5. Event Subscription

### Subscribe to Game Events
```typescript
let lastEventCheck = Date.now();

const events = await ctx.runQuery(api.gameEvents.subscribeToGameEvents, {
  lobbyId: lobbyId,
  sinceTimestamp: lastEventCheck
});

// Update timestamp for next poll
lastEventCheck = Date.now();

// Process events
for (const event of events) {
  console.log(`[${event.eventType}] ${event.description}`);

  switch (event.eventType) {
    case "turn_start":
      // New turn started
      break;
    case "phase_changed":
      // Phase changed
      break;
    case "normal_summon":
      // Monster summoned
      break;
    case "attack_declared":
      // Attack declared
      break;
    case "damage":
      // Damage dealt
      break;
    case "lp_changed":
      // Life points changed
      break;
    case "game_end":
      // Game ended
      break;
  }
}
```

### All 25 Event Types

**Lifecycle (5):**
- `game_start`, `game_end`, `turn_start`, `turn_end`, `phase_changed`

**Summons (5):**
- `normal_summon`, `tribute_summon`, `flip_summon`, `special_summon`, `summon_negated`

**Card Placement (3):**
- `monster_set`, `spell_set`, `trap_set`

**Activations (4):**
- `spell_activated`, `trap_activated`, `effect_activated`, `activation_negated`

**Chain (3):**
- `chain_link_added`, `chain_resolving`, `chain_resolved`

**Combat (5):**
- `battle_phase_entered`, `attack_declared`, `damage_calculated`, `damage`, `card_destroyed_battle`

**Zone Transitions (6):**
- `card_drawn`, `card_to_hand`, `card_to_graveyard`, `card_banished`, `card_to_deck`, `position_changed`

**Resources (4):**
- `lp_changed`, `tribute_paid`, `deck_shuffled`, `hand_limit_enforced`

---

## 6. Complete Turn Cycle Example

```typescript
async function playTurn(ctx, token, lobbyId) {
  // 1. Get current game state
  const state = await ctx.runQuery(api.games.getGameStateForPlayer, {
    token,
    lobbyId
  });

  if (!state.isYourTurn) {
    console.log("Waiting for opponent...");
    return;
  }

  console.log(`Turn ${state.turnNumber}, Phase: ${state.currentPhase}`);
  console.log(`My LP: ${state.myLifePoints}, Opponent LP: ${state.opponentLifePoints}`);
  console.log(`Hand: ${state.myHand.length} cards, Board: ${state.myBoard.length} monsters`);

  // 2. Get available actions
  const actions = await ctx.runQuery(api.games.getAvailableActions, {
    token,
    lobbyId
  });

  console.log(`Available actions: ${actions.actions.join(", ")}`);

  // 3. Draw Phase - auto-advance
  if (state.currentPhase === "draw") {
    await ctx.runMutation(api.phaseManager.advancePhase, { token, lobbyId });
    return; // Re-run on next tick
  }

  // 4. Standby Phase - auto-advance
  if (state.currentPhase === "standby") {
    await ctx.runMutation(api.phaseManager.advancePhase, { token, lobbyId });
    return;
  }

  // 5. Main Phase 1 - Summon + Set
  if (state.currentPhase === "main1") {
    // Try to normal summon if we haven't yet
    if (actions.actions.includes("normalSummon") && state.myHand.length > 0) {
      // Get card details
      const cardId = state.myHand[0];
      const card = await ctx.db.get(cardId);

      // Decide if we need tributes
      const cost = card.cost || 0;
      const tributesNeeded = cost >= 7 ? 2 : cost >= 5 ? 1 : 0;

      if (tributesNeeded <= state.myBoard.length) {
        // We have enough tributes
        const tributeCardIds = state.myBoard.slice(0, tributesNeeded).map(bc => bc.cardId);

        await ctx.runMutation(api.gameEngine.normalSummon, {
          token,
          lobbyId,
          cardId,
          position: "attack",
          tributeCardIds
        });

        console.log(`Summoned ${card.name} with ${tributesNeeded} tributes`);
        return;
      } else if (tributesNeeded === 0) {
        // Summon without tributes
        await ctx.runMutation(api.gameEngine.normalSummon, {
          token,
          lobbyId,
          cardId,
          position: "attack"
        });

        console.log(`Summoned ${card.name}`);
        return;
      }
    }

    // Advance to battle
    await ctx.runMutation(api.phaseManager.advancePhase, { token, lobbyId });
    return;
  }

  // 6. Battle Phase - Attack
  if (state.currentPhase === "battle_start") {
    await ctx.runMutation(api.phaseManager.advancePhase, { token, lobbyId });
    return;
  }

  if (state.currentPhase === "battle") {
    // Find monsters that can attack
    const attackers = state.myBoard.filter(card =>
      !card.hasAttacked && card.position === 1 && !card.isFaceDown
    );

    if (attackers.length > 0) {
      const attacker = attackers[0];

      // Choose target (or direct attack)
      let targetCardId = undefined;
      if (state.opponentBoard.length > 0) {
        // Attack weakest opponent monster
        const target = state.opponentBoard.reduce((weakest, current) =>
          current.attack < weakest.attack ? current : weakest
        );
        targetCardId = target.cardId;
      }

      await ctx.runMutation(api.combatSystem.declareAttack, {
        token,
        lobbyId,
        attackerCardId: attacker.cardId,
        targetCardId
      });

      console.log(`Attacked with ${attacker.cardId}`);
      return;
    }

    // No more attackers, advance
    await ctx.runMutation(api.phaseManager.advancePhase, { token, lobbyId });
    return;
  }

  if (state.currentPhase === "battle_end") {
    await ctx.runMutation(api.phaseManager.advancePhase, { token, lobbyId });
    return;
  }

  // 7. Main Phase 2 - Additional actions
  if (state.currentPhase === "main2") {
    // Could set spell/traps, change positions, etc.
    await ctx.runMutation(api.phaseManager.advancePhase, { token, lobbyId });
    return;
  }

  // 8. End Phase - End turn
  if (state.currentPhase === "end") {
    await ctx.runMutation(api.gameEngine.endTurn, {
      token,
      lobbyId
    });

    console.log("Turn ended");
    return;
  }
}

// Main game loop
async function agentGameLoop(ctx, token) {
  // Join matchmaking
  await ctx.runMutation(api.matchmaking.joinQueue, {
    token,
    mode: "ranked",
    deckArchetype: "fire"
  });

  console.log("Waiting for match...");

  // Poll for match
  let lobbyId = null;
  while (!lobbyId) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const status = await ctx.runQuery(api.matchmaking.getMyStatus, { token });
    if (status.matchedGame) {
      lobbyId = status.matchedGame.lobbyId;
      console.log(`Matched! Lobby: ${lobbyId}`);
    }
  }

  // Game loop
  let gameEnded = false;
  let lastEventCheck = Date.now();

  while (!gameEnded) {
    // Check for events
    const events = await ctx.runQuery(api.gameEvents.subscribeToGameEvents, {
      lobbyId,
      sinceTimestamp: lastEventCheck
    });

    lastEventCheck = Date.now();

    for (const event of events) {
      console.log(`[${event.eventType}] ${event.description}`);

      if (event.eventType === "game_end") {
        gameEnded = true;
        console.log("Game ended!");
      }
    }

    if (!gameEnded) {
      // Play turn
      await playTurn(ctx, token, lobbyId);

      // Wait a bit before next action
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

---

## 7. Key Rules & Constraints

### Summon Rules
- **Normal Summon**: 1 per turn, requires tributes for high cost
  - Cost 0-4: No tributes
  - Cost 5-6: 1 tribute
  - Cost 7+: 2 tributes
- **Set Monster**: Counts as Normal Summon for the turn
- **Flip Summon**: Unlimited, doesn't count as Normal Summon

### Combat Rules
- Only in Battle Phase
- Monster must be in Attack Position
- Monster can only attack once per turn
- Cannot attack directly if opponent has monsters

### Phase Order
1. Draw (auto-draw 1 card, skip on turn 1 for first player)
2. Standby (trigger effects)
3. Main Phase 1 (summon, set, activate)
4. Battle Start (enter battle phase)
5. Battle (declare attacks)
6. Battle End (exit battle phase)
7. Main Phase 2 (additional actions)
8. End (enforce hand limit, end turn)

### Hand Limit
- Maximum 6 cards
- Excess cards discarded during End Phase
- Records `hand_limit_enforced` event if cards discarded

### Life Points
- Starting LP: 8000
- Game ends when LP ≤ 0
- Deck out also causes loss

---

## 8. Troubleshooting

### "Game state not found"
- Wait a few seconds after matchmaking for initialization
- Check that game actually started (look for `game_start` event)

### "Not your turn"
- Check `state.isYourTurn` before making moves
- Subscribe to `turn_start` events to know when your turn begins

### "Must be in X phase"
- Check `state.currentPhase` before calling phase-specific mutations
- Advance phases with `api.phaseManager.advancePhase`

### "Already normal summoned this turn"
- Check `actions.normalSummonedThisTurn` flag
- Setting a monster also counts as Normal Summon

### "Invalid session token"
- Token may have expired
- Re-authenticate and get new token

---

## 9. Performance Tips

- **Batch queries**: Get state and actions in parallel
- **Poll efficiently**: Only check events every 1-3 seconds
- **Cache card data**: Load card definitions once, cache locally
- **Async operations**: Don't block on events, run game loop concurrently

---

## 10. Next Steps

After mastering basic gameplay, explore:
- Advanced strategies (tribute summons, defensive sets)
- Spell/Trap activation timing
- Chain system (responding to opponent actions)
- Position changes and flip effects
- Graveyard manipulation
- Special summons (future implementation)

---

**The system is production-ready for agent gameplay. All 25 event types are recorded, all core mechanics work, and agents can play complete games autonomously.**
