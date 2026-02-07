# LTCG Core Mechanics

## Game Overview

LunchTable Card Game (LTCG) is a strategic trading card game where two players battle using decks of 30 cards. The objective is to reduce your opponent's Life Points (LP) from 4000 to 0.

## Game Phases

Each turn consists of the following phases in order:

1. **Draw Phase**: Draw 1 card from your deck
2. **Standby Phase**: Resolve beginning-of-turn effects
3. **Main Phase 1**: Summon monsters, set spells/traps, activate effects
4. **Battle Phase**: Declare attacks with your monsters
5. **Main Phase 2**: Summon monsters, set spells/traps, activate effects (if available)
6. **End Phase**: Resolve end-of-turn effects, discard if hand size exceeds limit

## Win Conditions

A player wins when:
- Opponent's LP reaches 0
- Opponent cannot draw a card when required (deck-out)
- Special card effects declare victory (rare)

A draw occurs when:
- Both players reach 0 LP simultaneously
- Both players deck out simultaneously
- Game state becomes impossible to resolve

## Card Zones

### Field Zones
- **Monster Zone**: Up to 5 monster cards (face-up attack, face-up defense, or face-down)
- **Spell & Trap Zone**: Up to 5 spell/trap cards (face-up or face-down set)
- **Field Spell Zone**: 1 field spell card (optional)
- **Graveyard**: Discarded and destroyed cards (public knowledge)
- **Banished Zone**: Removed from play cards (public knowledge)

### Private Zones
- **Deck**: Face-down cards to draw from
- **Hand**: Cards held by player (hidden from opponent)
- **Extra Deck**: Special summoning pool (15 cards max)

## Summoning Mechanics

### Normal Summon
- Once per turn
- Monsters Level 1-4: Summon directly
- Monsters Level 5-6: Tribute 1 monster
- Monsters Level 7+: Tribute 2 monsters

### Special Summon
- Via card effects
- Does not count as Normal Summon
- Multiple special summons possible per turn

### Set
- Place monster face-down in defense position
- Counts as Normal Summon
- Opponent cannot see card

## Monster Positions

### Attack Position
- Monster stands vertically
- Uses ATK stat in battle
- Takes battle damage to LP if destroyed

### Defense Position
- Monster is horizontal
- Uses DEF stat in battle
- No battle damage to LP (except with piercing)

### Face-Down Defense
- Set position
- Flip when attacked or manually during Main Phase
- Flip effects activate when revealed

## Turn Player Priority

- Turn player has priority to activate effects first
- After activation, priority passes to opponent
- Chain builds in reverse order (last in, first out)

## Resource Management

### Hand Size
- No maximum during turn
- Must discard to 6 cards at End Phase

### Deck Construction
- Exactly 30 cards in Main Deck
- 0-15 cards in Extra Deck
- Max 3 copies of any single card

## LP (Life Points)

- Start at 4000 LP
- Decreased by battle damage and card effects
- Increased by card effects
- Reaching 0 or below = loss

## Timing Rules

### Fast Effects
- Can be activated during opponent's turn
- Quick-Play Spells and Trap cards
- Monster quick effects

### Slow Effects
- Only during your Main Phase
- Normal Spells and monster ignition effects

### Trigger Effects
- Activate automatically when condition is met
- Must resolve before game continues

## Card Advantage

### +1 (Plus One)
- Gaining more cards than spent
- Example: Draw 2 cards, discard 1

### -1 (Minus One)
- Losing more cards than gained
- Example: Tribute 2 monsters, summon 1

### Even Trade
- Equal exchange
- Example: Destroy opponent's card with your spell

## Game State Knowledge

### Public Knowledge
- Face-up cards on field
- Graveyard contents
- Banished cards
- Number of cards in hand
- LP totals

### Hidden Information
- Cards in hand
- Face-down cards on field
- Deck order
- Cards in deck (unless revealed)

## Fundamental Strategy Principles

1. **Card Advantage**: Aim to have more resources than opponent
2. **Tempo**: Control the pace of the game
3. **Board Control**: Maintain field presence
4. **Resource Management**: Use cards efficiently
5. **Win Condition**: Always play toward winning, not just surviving
