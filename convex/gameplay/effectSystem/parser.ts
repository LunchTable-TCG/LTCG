/**
 * Effect System Parser
 *
 * Parses ability text strings into structured effect data.
 * Handles triggers, costs, protection, and multiple effect types.
 */

import type { ParsedAbility, ParsedEffect, TriggerCondition } from "./types";

// Type guard for target types
type TargetType = "monster" | "spell" | "trap" | "any";
function normalizeTargetType(input: string): TargetType {
  const normalized = input.toLowerCase();
  if (normalized === "card") return "any";
  if (normalized === "monster" || normalized === "spell" || normalized === "trap") {
    return normalized;
  }
  return "any";
}

/**
 * Parse ability string into structured effect data
 *
 * Examples:
 * - "Draw 2 cards" -> { type: "draw", value: 2, trigger: "manual" }
 * - "Destroy 1 target monster" -> { type: "destroy", targetCount: 1, targetType: "monster" }
 * - "When summoned: Draw 1 card" -> { type: "draw", value: 1, trigger: "on_summon" }
 * - "Gain 500 LP" -> { type: "gainLP", value: 500 }
 */
export function parseAbility(abilityText: string): ParsedEffect | null {
  if (!abilityText || abilityText.trim() === "") {
    return null;
  }

  const text = abilityText.toLowerCase().trim();
  let trigger: TriggerCondition = "manual";

  // Detect Once Per Turn (OPT) restriction
  const isOPT = text.includes("once per turn");

  // Detect protection effects
  const protection: {
    cannotBeDestroyedByBattle?: boolean;
    cannotBeDestroyedByEffects?: boolean;
    cannotBeTargeted?: boolean;
  } = {};

  // Check for combined protection: "cannot be destroyed by battle or card effects"
  if (
    text.includes("cannot be destroyed by battle or card effects") ||
    text.includes("cannot be destroyed by battle or effect")
  ) {
    protection.cannotBeDestroyedByBattle = true;
    protection.cannotBeDestroyedByEffects = true;
  } else {
    // Check individual protections
    if (text.includes("cannot be destroyed by battle")) {
      protection.cannotBeDestroyedByBattle = true;
    }
    if (
      text.includes("cannot be destroyed by card effects") ||
      text.includes("cannot be destroyed by effect")
    ) {
      protection.cannotBeDestroyedByEffects = true;
    }
  }

  if (text.includes("cannot be targeted by") && text.includes("opponent")) {
    protection.cannotBeTargeted = true;
  }
  const hasProtection = Object.keys(protection).length > 0;

  // Detect continuous effects
  const isContinuous =
    text.startsWith("all ") ||
    text.includes("as long as") ||
    text.includes("while this card is on the field") ||
    (!text.includes("when") &&
      !text.includes("if") &&
      text.includes("gain") &&
      text.includes("atk")) ||
    (text.includes("lose") && text.includes("atk"));

  // Detect trigger condition
  // Check more specific patterns first to avoid false matches
  if (
    text.includes("when") ||
    text.includes("if") ||
    text.includes("during") ||
    text.includes("at the start") ||
    text.includes("each time")
  ) {
    // Check for opponent-triggered events
    if ((text.includes("opponent") || text.includes("they")) && text.includes("summon"))
      trigger = "on_opponent_summon";
    else if (text.includes("summon")) trigger = "on_summon";
    else if (text.includes("flip")) trigger = "on_flip";
    // Battle-specific triggers (check before generic destroy)
    else if (text.includes("inflicts battle damage") || text.includes("inflict battle damage"))
      trigger = "on_battle_damage";
    else if (
      text.includes("destroys a monster by battle") ||
      (text.includes("destroy") && text.includes("by battle"))
    )
      trigger = "on_battle_destroy";
    else if (text.includes("is attacked") || text.includes("this card is attacked"))
      trigger = "on_battle_attacked";
    // Generic destroy (after battle-specific checks)
    else if (text.includes("destroy") && !text.includes("battle")) trigger = "on_destroy";
    // Phase triggers
    else if (
      text.includes("start of the battle phase") ||
      (text.includes("battle phase") && text.includes("start"))
    )
      trigger = "on_battle_start";
    else if (text.includes("draw phase")) trigger = "on_draw";
    else if (text.includes("end phase") || text.includes("during each end phase"))
      trigger = "on_end";
  }

  // Detect cost patterns on original text BEFORE stripping
  // Costs typically appear before the effect: "Discard 1 card, then Draw 2 cards"
  // Or with a colon: "Pay 1000 LP: Draw 1 card"
  let cost:
    | {
        type: "discard" | "pay_lp" | "tribute" | "banish";
        value?: number;
        targetType?: "monster" | "spell" | "trap" | "any";
      }
    | undefined;
  let costStrippedText = text;

  // Pattern: "Discard X card(s)" or "Discard X monster(s)"
  const discardMatch = text.match(/discard (\d+) (monster|spell|trap|card)s?/i);
  if (discardMatch && discardMatch[1] && discardMatch[2]) {
    cost = {
      type: "discard",
      value: Number.parseInt(discardMatch[1]),
      targetType: normalizeTargetType(discardMatch[2]),
    };
    // Remove cost from text (everything before "then" or ":")
    costStrippedText = text.replace(/^.*?(?:,?\s*then\s*|:\s*)/i, "").trim();
  }

  // Pattern: "Pay X LP"
  const payLPMatch = text.match(/pay (\d+) lp/i);
  if (payLPMatch && payLPMatch[1]) {
    cost = {
      type: "pay_lp",
      value: Number.parseInt(payLPMatch[1]),
    };
    costStrippedText = text.replace(/^.*?(?:,?\s*then\s*|:\s*)/i, "").trim();
  }

  // Pattern: "Tribute X monster(s)"
  const tributeMatch = text.match(/tribute (\d+) (monster|card)s?/i);
  if (tributeMatch && tributeMatch[1] && tributeMatch[2]) {
    cost = {
      type: "tribute",
      value: Number.parseInt(tributeMatch[1]),
      targetType: tributeMatch[2].toLowerCase() === "card" ? "any" : "monster",
    };
    costStrippedText = text.replace(/^.*?(?:,?\s*then\s*|:\s*)/i, "").trim();
  }

  // Pattern: "Banish X card(s)" (only if followed by "then" or ":")
  const banishCostMatch = text.match(/banish (\d+) (monster|spell|trap|card)s?/i);
  if (
    banishCostMatch &&
    banishCostMatch[1] &&
    banishCostMatch[2] &&
    (text.includes(", then") || text.match(/banish.*:/))
  ) {
    cost = {
      type: "banish",
      value: Number.parseInt(banishCostMatch[1]),
      targetType: normalizeTargetType(banishCostMatch[2]),
    };
    costStrippedText = text.replace(/^.*?(?:,?\s*then\s*|:\s*)/i, "").trim();
  }

  // Extract effect text (remove trigger prefix and OPT prefix) from cost-stripped text
  let effectText = costStrippedText.split(":").pop()?.trim() || costStrippedText;
  // Remove "once per turn" from effect text
  effectText = effectText.replace(/once per turn[,:]?\s*/g, "").trim();

  // If only protection effects (no other parseable effects), return protection-only effect
  // Use more precise patterns to avoid matching "destroyed" in "cannot be destroyed"
  const hasActionEffect = effectText.match(
    /\bdraw \d+|\bdestroy \d+|\bdeal \d+|\binflict \d+|\bgain \d+|\blose \d+|special summon|search .*deck|add .*(?:deck|graveyard)|banish/
  );
  if (hasProtection && !hasActionEffect) {
    return {
      type: "modifyATK", // Use modifyATK as a dummy type for protection-only
      trigger: "manual",
      value: 0,
      continuous: true, // Protection is always active
      isOPT: false,
      protection,
    };
  }

  // Parse Continuous Stat Modifier effects
  // Example: "All Dragon-Type monsters you control gain 300 ATK"
  // Example: "All monsters your opponent controls lose 200 ATK"
  // Example: "All Dragon-Type monsters gain an additional 200 ATK"
  if (isContinuous) {
    // Enhanced pattern with optional modifier words (additional, extra, bonus, etc.)
    const continuousAtkMatch = effectText.match(
      /all\s+(\w+(?:-type)?)\s+monsters?\s+(?:you control|your opponent controls)\s+(gains?|loses?)\s+(?:an?\s+)?(?:additional|extra|bonus)?\s*(\d+)\s+atk/i
    );
    if (
      continuousAtkMatch &&
      continuousAtkMatch[1] &&
      continuousAtkMatch[2] &&
      continuousAtkMatch[3]
    ) {
      const archetype = continuousAtkMatch[1].toLowerCase();
      const gainOrLose = continuousAtkMatch[2].toLowerCase();
      const value = Number.parseInt(continuousAtkMatch[3]);
      const isOpponent = effectText.includes("opponent");

      return {
        type: "modifyATK",
        trigger: "manual",
        value: gainOrLose.startsWith("lose") ? -value : value,
        continuous: true,
        isOPT: false,
        condition: isOpponent ? "opponent_monsters" : `${archetype}_monsters`,
      };
    }

    // Simpler pattern: "All X monsters gain Y ATK" with optional modifiers
    const simpleAtkMatch = effectText.match(
      /all\s+(\w+(?:-type)?)\s+monsters?\s+(gains?|loses?)\s+(?:an?\s+)?(?:additional|extra|bonus)?\s*(\d+)\s+atk/i
    );
    if (simpleAtkMatch && simpleAtkMatch[1] && simpleAtkMatch[2] && simpleAtkMatch[3]) {
      const archetype = simpleAtkMatch[1].toLowerCase();
      const gainOrLose = simpleAtkMatch[2].toLowerCase();
      const value = Number.parseInt(simpleAtkMatch[3]);

      return {
        type: "modifyATK",
        trigger: "manual",
        value: gainOrLose.startsWith("lose") ? -value : value,
        continuous: true,
        isOPT: false,
        condition: `${archetype}_monsters`,
      };
    }
  }

  // Parse Direct Attack ability
  // Example: "This card can attack directly if your opponent controls no monsters in Attack Position"
  if (
    (text.includes("can attack directly") || text.includes("attack directly")) &&
    text.includes("if")
  ) {
    // Detect the condition after "if"
    let condition = "no_opponent_monsters"; // Default condition

    if (text.includes("no monsters") || text.includes("controls no monsters")) {
      condition = "no_opponent_attack_monsters";
    }

    return {
      type: "directAttack",
      trigger: "manual",
      condition,
      continuous: true, // This is a passive continuous ability
      isOPT: false,
    };
  }

  // Parse continuous triggered damage
  // Example: "Your opponent takes 200 damage each time they Normal Summon a monster"
  const continuousDamageMatch = effectText.match(
    /(?:your opponent takes|opponent takes|inflict)\s+(\d+)\s+damage\s+(?:each time|when)/i
  );
  if (continuousDamageMatch && continuousDamageMatch[1]) {
    return {
      type: "damage",
      trigger,
      value: Number.parseInt(continuousDamageMatch[1]),
      continuous: true,
      isOPT: false,
    };
  }

  // Parse Draw effects
  const drawMatch = effectText.match(/draw (\d+) card/);
  if (drawMatch && drawMatch[1]) {
    return {
      type: "draw",
      trigger,
      value: Number.parseInt(drawMatch[1]),
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse Negation (check before destroy to avoid false matches)
  // Examples: "Negate the activation of a spell card"
  //           "Negate the effect of a trap card"
  //           "Negate the activation and destroy it"
  if (effectText.includes("negate")) {
    let targetType: "monster" | "spell" | "trap" | "any" = "any";

    // Detect target type
    if (effectText.includes("spell")) {
      targetType = "spell";
    } else if (effectText.includes("trap")) {
      targetType = "trap";
    } else if (effectText.includes("monster") || effectText.includes("effect")) {
      targetType = "monster";
    }

    // Detect if it's activation negation or effect negation
    const isActivationNegate = effectText.includes("activation");

    return {
      type: "negate",
      trigger,
      targetCount: 1,
      targetType,
      condition: isActivationNegate ? "activation" : "effect",
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse Destroy effects
  const destroyMatch = effectText.match(/destroy (\d+)?\s*(target)?\s*(monster|spell|trap|card)?/);
  if (destroyMatch || effectText.includes("destroy")) {
    const targetCount = destroyMatch?.[1] ? Number.parseInt(destroyMatch[1]) : 1;
    const targetType = destroyMatch?.[3] ? normalizeTargetType(destroyMatch[3]) : "monster";

    return {
      type: "destroy",
      trigger,
      targetCount,
      targetType,
      targetLocation: "board",
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse Damage effects
  const damageMatch = effectText.match(/(?:deal|inflict)\s*(\d+)\s*(?:damage|lp)?/);
  if (damageMatch && damageMatch[1]) {
    return {
      type: "damage",
      trigger,
      value: Number.parseInt(damageMatch[1]),
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse ATK modification (check before LP to avoid false matches)
  // Supports: "gains 500 ATK", "gains an additional 500 ATK", "gains an extra 500 ATK"
  const atkMatch = effectText.match(
    /(gains?|loses?)\s+(?:an?\s+)?(?:additional|extra|bonus)?\s*(\d+)\s*atk/
  );
  if (atkMatch && atkMatch[1] && atkMatch[2]) {
    const value = Number.parseInt(atkMatch[2]);
    return {
      type: "modifyATK",
      trigger,
      value: atkMatch[1].startsWith("lose") ? -value : value,
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse DEF modification
  // Supports: "gains 500 DEF", "gains an additional 500 DEF", "loses 300 DEF"
  const defMatch = effectText.match(
    /(gains?|loses?)\s+(?:an?\s+)?(?:additional|extra|bonus)?\s*(\d+)\s*def(?:ense)?/
  );
  if (defMatch && defMatch[1] && defMatch[2]) {
    const value = Number.parseInt(defMatch[2]);
    return {
      type: "modifyDEF",
      trigger,
      value: defMatch[1].startsWith("lose") ? -value : value,
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse Gain LP effects
  const gainLPMatch = effectText.match(/(?:gains?|recovers?)\s*(\d+)\s*(?:lp|life points)?/);
  if (gainLPMatch && gainLPMatch[1]) {
    return {
      type: "gainLP",
      trigger,
      value: Number.parseInt(gainLPMatch[1]),
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse Add from Graveyard to Hand
  // Example: "Add 1 Dragon monster from your graveyard to your hand"
  if (
    (effectText.includes("add") || effectText.includes("return")) &&
    (effectText.includes("graveyard") || effectText.includes("gy")) &&
    effectText.includes("hand")
  ) {
    const countMatch = effectText.match(/(\d+)/);
    const targetCount = countMatch && countMatch[1] ? Number.parseInt(countMatch[1]) : 1;

    // Detect target type from text
    let targetType: "monster" | "spell" | "trap" | "any" = "any";
    if (effectText.includes("monster")) targetType = "monster";
    else if (effectText.includes("spell")) targetType = "spell";
    else if (effectText.includes("trap")) targetType = "trap";

    return {
      type: "toHand",
      trigger,
      targetLocation: "graveyard",
      targetCount,
      targetType,
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse Special Summon
  if (effectText.includes("special summon")) {
    const fromGY = effectText.includes("from") && effectText.includes("graveyard");
    return {
      type: "summon",
      trigger,
      targetLocation: fromGY ? "graveyard" : "hand",
      targetCount: 1,
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse Return to Hand effects
  // Example: "Return 1 card to their hand"
  if (
    effectText.includes("return") &&
    effectText.includes("hand") &&
    !effectText.includes("graveyard")
  ) {
    const countMatch = effectText.match(/(\d+)/);
    const targetCount = countMatch && countMatch[1] ? Number.parseInt(countMatch[1]) : 1;

    return {
      type: "toHand",
      trigger,
      targetLocation: "board",
      targetCount,
      targetType: "any",
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse Return to Deck effects
  // Example: "Return 1 card to their deck"
  if (effectText.includes("return") && effectText.includes("deck")) {
    const countMatch = effectText.match(/(\d+)/);
    const targetCount = countMatch && countMatch[1] ? Number.parseInt(countMatch[1]) : 1;

    return {
      type: "toGraveyard", // Using toGraveyard type temporarily for deck returns
      trigger,
      targetLocation: "deck",
      targetCount,
      targetType: "any",
      isOPT,
    };
  }

  // Parse Search effects
  // Examples: "Add 1 Dragon monster from your deck to your hand"
  //           "Search your deck for 1 Spell card and add it to your hand"
  if (
    effectText.includes("search") ||
    (effectText.includes("add") && effectText.includes("deck"))
  ) {
    const countMatch = effectText.match(/(\d+)/);
    const targetCount = countMatch && countMatch[1] ? Number.parseInt(countMatch[1]) : 1;

    // Detect target type
    let targetType: "monster" | "spell" | "trap" | "any" = "any";
    if (effectText.includes("monster")) targetType = "monster";
    else if (effectText.includes("spell")) targetType = "spell";
    else if (effectText.includes("trap")) targetType = "trap";

    // Detect archetype (e.g., "Dragon monster", "Fire-Type", etc.)
    let condition: string | undefined;
    const archetypePatterns = [/(\w+(?:-type)?)\s+monster/i, /(\w+)\s+(?:spell|trap)/i];

    for (const pattern of archetypePatterns) {
      const match = effectText.match(pattern);
      if (match && match[1]) {
        const archetype = match[1].toLowerCase();
        // Filter out generic words
        if (!["a", "an", "the", "any", "target"].includes(archetype)) {
          condition = `${archetype}_search`;
          break;
        }
      }
    }

    return {
      type: "search",
      trigger,
      targetCount,
      targetType,
      targetLocation: "deck",
      condition,
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse Banish
  if (effectText.includes("banish") || effectText.includes("remove from play")) {
    return {
      type: "banish",
      trigger,
      targetCount: 1,
      targetLocation: "board",
      isOPT,
    };
  }

  // Parse Mill effects
  // Examples: "Mill 3 cards", "Send 5 cards from the top of your deck to the graveyard"
  const millMatch = effectText.match(/(?:mill|send)\s+(\d+)\s+card/i);
  if (
    millMatch &&
    millMatch[1] &&
    (effectText.includes("mill") ||
      (effectText.includes("deck") && effectText.includes("graveyard")))
  ) {
    return {
      type: "mill",
      trigger,
      value: Number.parseInt(millMatch[1]),
      isOPT,
      ...(cost && { cost }),
    };
  }

  // Parse Discard effects
  // Examples: "Discard 2 cards", "Discard your entire hand"
  const discardEffectMatch = effectText.match(/discard\s+(\d+)\s+card/i);
  if (
    discardEffectMatch &&
    discardEffectMatch[1] &&
    !text.includes("then") &&
    !text.includes(":")
  ) {
    // Make sure this is not a cost (costs have "then" or ":")
    return {
      type: "discard",
      trigger,
      value: Number.parseInt(discardEffectMatch[1]),
      isOPT,
    };
  }

  // Parse Multiple Attack ability
  // Examples: "Can attack twice per turn", "This card can attack twice"
  if (
    (text.includes("attack twice") ||
      text.includes("attack two times") ||
      text.includes("attacks twice")) &&
    !text.includes("when") &&
    !text.includes("if")
  ) {
    return {
      type: "multipleAttack",
      trigger: "manual",
      value: 2, // Number of attacks allowed
      continuous: true, // Passive continuous ability
      isOPT: false,
    };
  }

  // Couldn't parse - return null
  console.warn(`Could not parse ability: ${abilityText}`);
  return null;
}

/**
 * Parse multi-part ability into array of effects
 *
 * Handles complex abilities like:
 * - "Cannot be destroyed by battle. All Dragon-Type monsters gain 500 ATK. Once per turn: Draw 1 card."
 * - "Gain 500 ATK until end of turn. When this card destroys a monster by battle: Draw 1 card."
 *
 * Splits ability into clauses and parses each separately.
 */
export function parseMultiPartAbility(abilityText: string): ParsedAbility {
  if (!abilityText || abilityText.trim() === "") {
    return { effects: [], hasMultiPart: false };
  }

  const text = abilityText.trim();

  // Split by periods, but preserve trigger patterns (e.g., "When X: Do Y.")
  // Use a more sophisticated split that respects sentence structure
  const clauses: string[] = [];
  let currentClause = "";
  let depth = 0; // Track nesting level for colons

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    currentClause += char;

    if (char === ":") {
      depth++;
    } else if (char === "." && depth === 0) {
      // Period outside of a trigger clause - this is a real separator
      if (currentClause.trim().length > 0) {
        clauses.push(currentClause.trim());
        currentClause = "";
      }
    } else if (char === "." && depth > 0) {
      // Period inside trigger clause - reset depth after completing the triggered effect
      depth = 0;
      if (currentClause.trim().length > 0) {
        clauses.push(currentClause.trim());
        currentClause = "";
      }
    }
  }

  // Add remaining clause
  if (currentClause.trim().length > 0) {
    clauses.push(currentClause.trim());
  }

  // Parse each clause
  const effects: ParsedEffect[] = [];
  for (const clause of clauses) {
    const parsed = parseAbility(clause);
    if (parsed) {
      effects.push(parsed);
    }
  }

  return {
    effects,
    hasMultiPart: effects.length > 1,
  };
}

/**
 * Backwards-compatible wrapper for parseAbility that returns first effect from multi-part parse
 * This maintains compatibility with existing code while enabling multi-part parsing
 */
export function parseSingleAbility(abilityText: string): ParsedEffect | null {
  const parsed = parseMultiPartAbility(abilityText);
  return parsed.effects.length > 0 ? (parsed.effects[0] ?? null) : null;
}
