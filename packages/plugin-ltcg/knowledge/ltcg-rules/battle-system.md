# LTCG Battle System

## Battle Phase Structure

The Battle Phase is where monsters engage in combat. It consists of four steps:

1. **Start Step**: Declare entering Battle Phase
2. **Battle Step**: Declare attacks
3. **Damage Step**: Calculate and apply damage
4. **End Step**: Resolve end-of-battle effects

## Declaring Attacks

### Attack Declaration Requirements
- Monster must be in face-up Attack Position
- Monster was not summoned this turn (summoning sickness)
- Monster has not already attacked this turn (unless card effect allows)
- No card effects prevent the attack

### Attack Declaration Process
1. Turn player declares which monster is attacking
2. Turn player declares attack target (specific monster or direct attack)
3. Opponent can activate response effects
4. Proceed to Damage Step if attack is not negated

## Battle Calculations

### Monster vs. Monster Battle

#### Attack Position vs. Attack Position
- Compare ATK values
- Higher ATK destroys lower ATK monster
- Difference is dealt as damage to controller of weaker monster
- Equal ATK: Both monsters destroyed, no damage

**Example:**
- Your 2000 ATK monster attacks opponent's 1500 ATK monster
- Opponent's monster is destroyed
- Opponent takes 500 damage (2000 - 1500)

#### Attack Position vs. Defense Position
- Compare attacker's ATK to defender's DEF
- If ATK > DEF: Defender destroyed, no damage to either player
- If ATK < DEF: Attacker takes damage equal to difference (attacker not destroyed)
- If ATK = DEF: No destruction, no damage

**Example:**
- Your 1800 ATK monster attacks opponent's 2000 DEF monster
- Your monster is not destroyed
- You take 200 damage (2000 - 1800)

### Direct Attacks

When opponent has no monsters in Attack Position, you can attack directly:
- Attacking monster's full ATK becomes damage to opponent's LP
- No monster destruction occurs
- Fast way to win but leaves you vulnerable

## Damage Step Timing

The Damage Step has specific timing where only certain cards can be activated:

### Damage Step Substeps
1. **Before Damage Calculation**: Stats can be modified
2. **Damage Calculation**: Determine damage amount
3. **After Damage Calculation**: Apply damage, trigger effects
4. **End of Damage Step**: Resolve destruction and "when destroyed by battle" effects

### What Can Activate in Damage Step
✅ **Allowed:**
- Counter Traps
- Cards that modify ATK/DEF
- Cards that negate activations
- Mandatory trigger effects

❌ **Not Allowed:**
- Most other effects
- Normal Spells
- Most Trap Cards
- Most monster effects

## Special Battle Mechanics

### Piercing Damage
- Some monsters have "piercing" effect
- When they attack a Defense Position monster with lower DEF
- Excess damage is dealt to opponent's LP

**Example:**
- Your 2500 ATK piercing monster attacks 1000 DEF monster
- Defender destroyed
- Opponent takes 1500 damage (2500 - 1000)

### Double Attack
- Some monsters can attack twice per Battle Phase
- Must declare each attack separately
- Can attack different targets

### Multiple Attacks
- Some effects allow unlimited attacks
- Check for attack limits each attack declaration
- Usually requires specific conditions

### Cannot Be Destroyed By Battle
- Monster survives battle even with lower stats
- Damage calculation still occurs normally
- Useful for defensive strategies

### Cannot Be Targeted For Attacks
- Opponent cannot choose this monster as attack target
- Does not prevent direct attacks if you have other monsters
- Common on support monsters

## Battle Position Changes

### During Your Turn
- Can change position once per turn per monster
- Cannot change position of monster summoned this turn
- Face-down monsters are automatically in Defense Position

### During Opponent's Turn
- Some card effects allow position changes
- Usually Quick Effects or Trap Cards
- Can dodge attacks by switching to Defense

### After Battle
- Monster remains in same position after battle
- Some effects force position changes
- "Cannot change its battle position" effects may apply

## Replay Mechanics

### When Does Replay Occur?
A replay happens when the number of available attack targets changes after attack declaration but before Damage Step:
- Opponent summons a monster
- One of opponent's monsters is removed from field
- Attack target becomes invalid

### Replay Options
When replay occurs, attacking player can:
1. Continue attack with same or different target
2. Cancel the attack entirely

**Important:** Monster is no longer considered to have attacked if replay is triggered and attack is canceled.

## Battle Damage

### Types of Battle Damage
1. **Monster Battle Damage**: From ATK/DEF comparison
2. **Direct Attack Damage**: Full ATK value
3. **Piercing Damage**: Excess ATK over DEF

### Damage Calculation
- Always round down (no partial LP)
- Damage is dealt simultaneously in mirror battles
- Effects that modify ATK/DEF apply before calculation

### Damage Prevention
- "You take no battle damage"
- "Battle damage becomes 0"
- "Halve battle damage"

### Damage Reflection
- "Opponent takes the damage instead"
- "Inflict damage equal to..."
- Can turn defensive positions into offense

## Destruction by Battle

### When is a Monster Destroyed by Battle?
- ATK/DEF comparison determines winner
- Destroyed monsters go to Graveyard
- "When destroyed by battle" effects trigger

### Destruction Prevention
- "Cannot be destroyed by battle"
- "If this card would be destroyed by battle, [alternative]"
- Monster survives but damage still calculated

### Simultaneous Destruction
- When both monsters have equal ATK
- Both destroyed at same time
- Both trigger "when destroyed by battle" effects

## Advanced Battle Concepts

### Battle Protection Chains
Opponent declares attack → Activate protection → Opponent chains negation → Chain resolves backward

### Position-Switching Strategy
- Switch to Defense before opponent's Battle Phase
- Use Quick Effects during opponent's turn
- Set monsters as defensive wall

### Attack Cost Effects
Some monsters require costs to attack:
- Discard a card
- Pay LP
- Tribute another monster

### Attack Lock Effects
- "You cannot conduct your Battle Phase"
- "Monsters cannot attack"
- "Only [type] monsters can attack"

## Battle Phase Skip Conditions

You might skip Battle Phase when:
- All your monsters are in Defense Position
- Better to set up defenses instead
- Card effects prevent battles
- Strategic timing for other effects

## Common Battle Mistakes to Avoid

❌ Attacking with Defense Position monsters (impossible)
❌ Forgetting summoning sickness
❌ Activating wrong effects during Damage Step
❌ Miscalculating ATK/DEF modifiers
❌ Attacking when replay would favor opponent
❌ Direct attacking when monsters exist in Defense Position

## Battle Phase Strategy Tips

✅ Calculate damage before attacking
✅ Consider opponent's face-down cards
✅ Save monsters for blocking counterattacks
✅ Know when to attack directly vs. clearing board
✅ Use Battle Phase as bait for opponent's Traps
✅ Position monsters strategically before ending turn

## Interaction with Other Game Mechanics

### Battle + Card Effects
- Quick Effects can be activated during Battle Phase
- Trap Cards can disrupt attacks
- Monster effects might trigger from battles

### Battle + LP Management
- Don't attack recklessly into higher DEF
- Calculate lethal damage accurately
- Consider LP thresholds for card activations

### Battle + Resource Management
- Don't overcommit monsters to attacks
- Leave defenders for opponent's turn
- Balance aggression with safety
