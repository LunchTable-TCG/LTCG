# JSON Ability Format Guide

**Complete reference for defining card abilities in JSON format**

---

## Overview

All card abilities in LTCG are defined using structured JSON format. This ensures type safety, validation at the schema level, and reliable effect execution.

**Current Status:**
- ✅ 178 cards loaded with JSON abilities
- ✅ All gameplay systems using JSON format
- ✅ 16 effect types implemented
- ✅ 11 trigger conditions working

---

## Basic Structure

Every card ability follows this structure:

```typescript
{
  "ability": {
    "effects": [
      {
        "type": "effectType",
        "trigger": "triggerCondition",
        "value": 0,
        // ... additional fields
      }
    ],
    "spellSpeed": 1,  // 1, 2, or 3
    "isContinuous": false
  }
}
```

---

## Effect Types

### 1. Stat Modification

**modifyATK** - Change a monster's ATK

```json
{
  "type": "modifyATK",
  "trigger": "continuous",
  "value": 500,
  "isContinuous": true,
  "description": "This card gains 500 ATK"
}
```

**modifyDEF** - Change a monster's DEF

```json
{
  "type": "modifyDEF",
  "trigger": "manual",
  "value": 400,
  "duration": { "type": "until_end_of_turn" },
  "description": "Gain 400 DEF until end of turn"
}
```

### 2. Damage & Healing

**damage** - Inflict damage to opponent

```json
{
  "type": "damage",
  "trigger": "on_summon",
  "value": 800,
  "targetOwner": "opponent",
  "description": "When Summoned: Inflict 800 damage"
}
```

**gainLP** - Heal life points

```json
{
  "type": "gainLP",
  "trigger": "on_battle_destroy",
  "value": 1000,
  "description": "When this destroys a monster: Gain 1000 LP"
}
```

### 3. Card Movement

**draw** - Draw cards

```json
{
  "type": "draw",
  "trigger": "manual",
  "value": 2,
  "description": "Draw 2 cards"
}
```

**search** - Search deck for a card

```json
{
  "type": "search",
  "trigger": "on_summon",
  "targetLocation": "deck",
  "sendTo": "hand",
  "searchCondition": {
    "archetype": "infernal_dragons"
  },
  "description": "When Summoned: Add 1 Infernal Dragons card from deck to hand"
}
```

**toHand** - Return card to hand

```json
{
  "type": "toHand",
  "trigger": "manual",
  "target": {
    "owner": "self",
    "location": "graveyard",
    "count": 1
  },
  "description": "Add 1 monster from GY to hand"
}
```

**toGraveyard** - Send card to graveyard

```json
{
  "type": "toGraveyard",
  "trigger": "manual",
  "target": {
    "owner": "opponent",
    "location": "hand",
    "count": 1
  },
  "description": "Your opponent discards 1 card"
}
```

**banish** - Banish cards

```json
{
  "type": "banish",
  "trigger": "manual",
  "target": {
    "owner": "self",
    "location": "graveyard",
    "count": 3
  },
  "description": "Banish 3 cards from your GY"
}
```

### 4. Monster Effects

**destroy** - Destroy cards

```json
{
  "type": "destroy",
  "trigger": "manual",
  "target": {
    "owner": "opponent",
    "location": "board",
    "count": 1,
    "selection": "player_choice"
  },
  "isOPT": true,
  "description": "Once per turn: Destroy 1 card your opponent controls"
}
```

**summon** - Special summon

```json
{
  "type": "summon",
  "trigger": "on_destroy",
  "summonFrom": "graveyard",
  "target": {
    "owner": "self",
    "archetype": "infernal_dragons",
    "count": 1
  },
  "description": "If destroyed: Special Summon 1 Infernal Dragons monster from GY"
}
```

**negate** - Negate activation

```json
{
  "type": "negate",
  "trigger": "manual",
  "negateType": "activation",
  "negateAndDestroy": true,
  "description": "Negate the activation and destroy that card"
}
```

---

## Trigger Conditions

| Trigger | When It Fires | Use Case |
|---------|---------------|----------|
| `manual` | Player activates | Normal spells, ignition effects |
| `continuous` | Always active | Continuous stat boosts |
| `on_summon` | When you summon this card | Summon triggers |
| `on_opponent_summon` | When opponent summons | Reactive effects |
| `on_destroy` | When destroyed | Float effects |
| `on_flip` | When flipped face-up | Flip effects |
| `on_battle_damage` | After dealing damage | Battle rewards |
| `on_battle_destroy` | After destroying in battle | Battle rewards |
| `on_attacked` | When attacked | Defensive triggers |
| `on_end_phase` | At end phase | End of turn effects |
| `on_draw` | When you draw | Draw punishment |

---

## Spell Speed

Determines chain ordering and when effects can be activated:

- **1**: Normal Spell, Trap (activation)
- **2**: Quick Spell, Trap (once set)
- **3**: Counter Trap

```json
{
  "ability": {
    "effects": [...],
    "spellSpeed": 2  // Quick Spell
  }
}
```

---

## Complete Card Examples

### Example 1: ATK Boost Monster

```json
{
  "name": "Cinder Wyrm",
  "rarity": "common",
  "cardType": "creature",
  "archetype": "infernal_dragons",
  "cost": 3,
  "attack": 1100,
  "defense": 700,
  "ability": {
    "effects": [
      {
        "type": "modifyATK",
        "trigger": "continuous",
        "value": 200,
        "isContinuous": true,
        "description": "This card gains 200 ATK during your Battle Phase"
      }
    ],
    "spellSpeed": 1,
    "isContinuous": true
  },
  "isActive": true
}
```

### Example 2: Damage Trigger

```json
{
  "name": "Magma Hatchling",
  "rarity": "common",
  "cardType": "creature",
  "archetype": "infernal_dragons",
  "cost": 2,
  "attack": 900,
  "defense": 500,
  "ability": {
    "effects": [
      {
        "type": "damage",
        "trigger": "on_destroy",
        "value": 300,
        "targetOwner": "opponent",
        "description": "When destroyed: Inflict 300 damage to your opponent"
      }
    ],
    "spellSpeed": 1,
    "isContinuous": false
  },
  "isActive": true
}
```

### Example 3: Search Effect

```json
{
  "name": "Flame Herald",
  "rarity": "uncommon",
  "cardType": "creature",
  "archetype": "infernal_dragons",
  "cost": 3,
  "attack": 1200,
  "defense": 1000,
  "ability": {
    "effects": [
      {
        "type": "search",
        "trigger": "on_summon",
        "targetLocation": "deck",
        "sendTo": "hand",
        "searchCondition": {
          "cardType": "spell",
          "archetype": "infernal_dragons"
        },
        "description": "When Summoned: Add 1 Infernal Dragons Spell from deck to hand"
      }
    ],
    "spellSpeed": 1,
    "isContinuous": false
  },
  "isActive": true
}
```

### Example 4: Quick Spell

```json
{
  "name": "Sudden Ignition",
  "rarity": "uncommon",
  "cardType": "spell",
  "archetype": "infernal_dragons",
  "cost": 0,
  "ability": {
    "effects": [
      {
        "type": "modifyATK",
        "trigger": "manual",
        "value": 800,
        "duration": { "type": "until_end_of_turn" },
        "target": {
          "owner": "self",
          "archetype": "infernal_dragons",
          "count": 1,
          "selection": "player_choice"
        },
        "description": "Target 1 Infernal Dragons monster: It gains 800 ATK until end of turn"
      }
    ],
    "spellSpeed": 2,
    "isContinuous": false
  },
  "isActive": true
}
```

### Example 5: Counter Trap

```json
{
  "name": "Dragon's Wrath",
  "rarity": "epic",
  "cardType": "trap",
  "archetype": "infernal_dragons",
  "cost": 0,
  "ability": {
    "effects": [
      {
        "type": "negate",
        "trigger": "manual",
        "negateType": "activation",
        "negateAndDestroy": true,
        "description": "Negate activation and destroy that card"
      }
    ],
    "spellSpeed": 3,
    "isContinuous": false
  },
  "isActive": true
}
```

---

## Advanced Features

### Multiple Effects

Cards can have multiple effects:

```json
{
  "ability": {
    "effects": [
      {
        "type": "modifyATK",
        "trigger": "continuous",
        "value": 400,
        "description": "All your dragons gain 400 ATK"
      },
      {
        "type": "destroy",
        "trigger": "on_destroy",
        "target": { "owner": "opponent", "count": 1 },
        "description": "When destroyed: Destroy 1 card"
      }
    ],
    "spellSpeed": 1
  }
}
```

### Once Per Turn (OPT)

```json
{
  "type": "draw",
  "trigger": "manual",
  "value": 1,
  "isOPT": true,
  "description": "Once per turn: Draw 1 card"
}
```

### Protection Effects

```json
{
  "type": "modifyATK",
  "trigger": "continuous",
  "value": 0,
  "isContinuous": true,
  "protection": {
    "cannotBeTargeted": true
  },
  "description": "Cannot be targeted by card effects"
}
```

### Duration Modifiers

```json
{
  "type": "modifyATK",
  "trigger": "manual",
  "value": 500,
  "duration": { "type": "until_end_of_turn" },
  "description": "Gain 500 ATK until end of turn"
}
```

---

## Schema Reference

See `convex/schema.ts` for the complete card definition schema and `convex/gameplay/effectSystem/jsonEffectValidators.ts` for the JSON ability validators.

---

## See Also

- [Effect System Guide](./EFFECT_SYSTEM_GUIDE.md) - Gameplay mechanics
- [Schema Documentation](../schema.md) - Database schema
