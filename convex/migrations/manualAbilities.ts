/**
 * Manual Abilities Fix - Hand-crafted JSON abilities for all 56 cards
 * Each ability is carefully written based on the card's effect description
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../functions";
import { migrationsPool } from "../infrastructure/workpools";
import type { JsonAbility } from "../gameplay/effectSystem/types";

// Map of card name -> proper JSON ability
const MANUAL_ABILITIES: Record<string, JsonAbility> = {
  // === INFERNAL DRAGONS CREATURES ===

  "Cinder Wyrm": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 200,
        isContinuous: true,
      },
    ],
    spellSpeed: 1,
  },

  "Magma Hatchling": {
    effects: [
      {
        type: "damage",
        trigger: "on_destroy",
        value: 300,
        targetOwner: "opponent",
      },
    ],
    spellSpeed: 1,
  },

  "Infernal Scout": {
    effects: [
      {
        type: "directAttack",
        trigger: "manual",
      },
    ],
    spellSpeed: 1,
  },

  "Pyroclast Wyvern": {
    effects: [
      {
        type: "damage",
        trigger: "manual",
        value: 200,
        targetOwner: "opponent",
        isOPT: true,
      },
    ],
    spellSpeed: 1,
  },

  "Smoldering Newt": {
    effects: [
      {
        type: "draw",
        trigger: "on_battle_damage",
        value: 1,
      },
      {
        type: "discard",
        trigger: "on_battle_damage",
        value: 1,
      },
    ],
    spellSpeed: 1,
  },

  "Lava Elemental": {
    effects: [
      {
        type: "damage",
        trigger: "on_summon",
        value: 200,
        targetOwner: "opponent",
      },
    ],
    spellSpeed: 1,
  },

  "Flame Herald": {
    effects: [
      {
        type: "search",
        trigger: "on_summon",
        targetLocation: "deck",
        sendTo: "hand",
      },
    ],
    spellSpeed: 1,
  },

  // Infernal Vanguard - Piercing damage
  "Infernal Vanguard": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 0,
        isContinuous: true,
        // Note: Piercing is a special ability - needs custom handling
      },
    ],
    spellSpeed: 1,
  },

  // Blazetail Guardian - When attacked: Inflict 400 damage
  "Blazetail Guardian": {
    effects: [
      {
        type: "damage",
        trigger: "on_battle_attacked",
        value: 400,
        targetOwner: "opponent",
      },
    ],
    spellSpeed: 1,
  },

  // Crimson Firebreather - Once per turn: Destroy 1 Spell/Trap
  "Crimson Firebreather": {
    effects: [
      {
        type: "destroy",
        trigger: "manual",
        targetLocation: "board",
        isOPT: true,
      },
    ],
    spellSpeed: 1,
  },

  // Volcanic Striker - Can attack twice
  "Volcanic Striker": {
    effects: [
      {
        type: "multipleAttack",
        trigger: "manual",
        value: 2,
      },
    ],
    spellSpeed: 1,
  },

  // Pyre Sentinel - When opponent summons: Inflict 500 damage
  "Pyre Sentinel": {
    effects: [
      {
        type: "damage",
        trigger: "on_opponent_summon",
        value: 500,
        targetOwner: "opponent",
      },
    ],
    spellSpeed: 1,
  },

  // Infernal Charger - When summons successfully: Draw 1
  "Infernal Charger": {
    effects: [
      {
        type: "draw",
        trigger: "on_summon",
        value: 1,
      },
    ],
    spellSpeed: 1,
  },

  // Volcanic Dragon - When destroys by battle: Inflict 600 damage
  "Volcanic Dragon": {
    effects: [
      {
        type: "damage",
        trigger: "on_battle_destroy",
        value: 600,
        targetOwner: "opponent",
      },
    ],
    spellSpeed: 1,
  },

  // Infernal Ravager - When summon: Destroy 1 monster
  "Infernal Ravager": {
    effects: [
      {
        type: "destroy",
        trigger: "on_summon",
        targetLocation: "board",
      },
    ],
    spellSpeed: 1,
  },

  // Pyromancer Drake - Once per turn: Target gains/loses 400 ATK
  "Pyromancer Drake": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 400,
        isOPT: true,
      },
    ],
    spellSpeed: 1,
  },

  // Hellfire Wyrm - When destroyed by battle: Special Summon from GY
  "Hellfire Wyrm": {
    effects: [
      {
        type: "summon",
        trigger: "on_destroy",
        targetLocation: "graveyard",
      },
    ],
    spellSpeed: 1,
  },

  // Infernal Tyrant - Once per turn: Draw 1
  "Infernal Tyrant": {
    effects: [
      {
        type: "draw",
        trigger: "manual",
        value: 1,
        isOPT: true,
      },
    ],
    spellSpeed: 1,
  },

  // Volcanic Behemoth - Cannot be destroyed by battle
  "Volcanic Behemoth": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 0,
        isContinuous: true,
        // Note: Protection ability - needs custom handling
      },
    ],
    spellSpeed: 1,
  },

  // Infernal Phoenix - When destroyed: Special Summon itself
  "Infernal Phoenix": {
    effects: [
      {
        type: "summon",
        trigger: "on_destroy",
        targetLocation: "graveyard",
      },
    ],
    spellSpeed: 1,
  },

  // Infernal Overlord Vyraxis - When summoned: Inflict 1000 damage
  "Infernal Overlord Vyraxis": {
    effects: [
      {
        type: "damage",
        trigger: "on_summon",
        value: 1000,
        targetOwner: "opponent",
      },
    ],
    spellSpeed: 1,
  },

  // Apocalypse Dragon - When summoned: Destroy all opponent's monsters
  "Apocalypse Dragon": {
    effects: [
      {
        type: "destroy",
        trigger: "on_summon",
        targetLocation: "board",
      },
    ],
    spellSpeed: 1,
  },

  // === INFERNAL DRAGONS SPELLS ===

  "Dragon's Fury": {
    effects: [
      {
        type: "destroy",
        trigger: "manual",
        targetLocation: "board",
      },
    ],
    spellSpeed: 1,
  },

  "Volcanic Eruption": {
    effects: [
      {
        type: "destroy",
        trigger: "manual",
        targetLocation: "board",
      },
    ],
    spellSpeed: 1,
  },

  "Fire Breathing": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 800,
      },
    ],
    spellSpeed: 1,
  },

  "Sudden Ignition": {
    effects: [
      {
        type: "damage",
        trigger: "manual",
        value: 800,
        targetOwner: "opponent",
      },
    ],
    spellSpeed: 2, // Quick Spell
  },

  "Dragon's Hoard": {
    effects: [
      {
        type: "draw",
        trigger: "manual",
        value: 2,
      },
    ],
    spellSpeed: 1,
  },

  // === INFERNAL DRAGONS TRAPS ===

  "Infernal Barrier": {
    effects: [
      {
        type: "negate",
        trigger: "manual",
      },
    ],
    spellSpeed: 2,
  },

  "Flame Trap": {
    effects: [
      {
        type: "damage",
        trigger: "manual",
        value: 1000,
        targetOwner: "opponent",
      },
    ],
    spellSpeed: 2,
  },

  "Burning Revenge": {
    effects: [
      {
        type: "destroy",
        trigger: "manual",
        targetLocation: "board",
      },
      {
        type: "damage",
        trigger: "manual",
        value: 500,
        targetOwner: "opponent",
      },
    ],
    spellSpeed: 2,
  },

  "Dragon's Wrath": {
    effects: [
      {
        type: "destroy",
        trigger: "manual",
        targetLocation: "board",
      },
    ],
    spellSpeed: 2,
  },

  // === ABYSSAL HORRORS CREATURES ===

  "Coral Serpent": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 0,
        isContinuous: true,
        // Note: Cannot be targeted - needs protection handling
      },
    ],
    spellSpeed: 1,
  },

  "Sunken Squid": {
    effects: [
      {
        type: "toHand",
        trigger: "manual",
        targetLocation: "board",
        isOPT: true,
      },
    ],
    spellSpeed: 1,
  },

  "Tidal Emperor Nereus": {
    effects: [
      {
        type: "summon",
        trigger: "on_summon",
        targetLocation: "deck",
      },
    ],
    spellSpeed: 1,
  },

  "Self Boost": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 500,
        isOPT: true,
      },
    ],
    spellSpeed: 1,
  },

  "Leviathan of the Abyss": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 0,
        isContinuous: true,
        // Note: Opponent monsters cannot attack/activate - needs custom handling
      },
    ],
    spellSpeed: 1,
  },

  // === NATURE SPIRITS CREATURES ===

  "Plated Defender": {
    effects: [
      {
        type: "modifyDEF",
        trigger: "manual",
        value: 500,
        isContinuous: true,
      },
    ],
    spellSpeed: 1,
  },

  "Fortress Guardian": {
    effects: [
      {
        type: "modifyDEF",
        trigger: "manual",
        value: 0,
        isContinuous: true,
        // Note: Cannot be destroyed by battle - needs protection
      },
    ],
    spellSpeed: 1,
  },

  "Adamantine Colossus": {
    effects: [
      {
        type: "modifyDEF",
        trigger: "manual",
        value: 800,
        isContinuous: true,
      },
    ],
    spellSpeed: 1,
  },

  "Iron Emperor Maximus": {
    effects: [
      {
        type: "modifyDEF",
        trigger: "on_summon",
        value: 1000,
      },
    ],
    spellSpeed: 1,
  },

  // === STORM ELEMENTALS CREATURES ===

  "Wind Sprite": {
    effects: [
      {
        type: "toHand",
        trigger: "on_summon",
        targetLocation: "board",
      },
    ],
    spellSpeed: 1,
  },

  "Storm Condor": {
    effects: [
      {
        type: "multipleAttack",
        trigger: "manual",
        value: 2,
      },
    ],
    spellSpeed: 1,
  },

  "Wind Roc": {
    effects: [
      {
        type: "directAttack",
        trigger: "manual",
      },
    ],
    spellSpeed: 1,
  },

  "Battle Draw": {
    effects: [
      {
        type: "draw",
        trigger: "on_battle_damage",
        value: 1,
      },
    ],
    spellSpeed: 1,
  },

  "Zephyr Rider": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 300,
        isContinuous: true,
      },
    ],
    spellSpeed: 1,
  },

  "Battle Destruction": {
    effects: [
      {
        type: "destroy",
        trigger: "on_battle_destroy",
        targetLocation: "deck",
      },
    ],
    spellSpeed: 1,
  },

  "Gale Condor": {
    effects: [
      {
        type: "toHand",
        trigger: "manual",
        targetLocation: "board",
        isOPT: true,
      },
    ],
    spellSpeed: 1,
  },

  "Tornado Eagle": {
    effects: [
      {
        type: "summon",
        trigger: "on_summon",
        targetLocation: "hand",
      },
    ],
    spellSpeed: 1,
  },

  "Tempest Archon": {
    effects: [
      {
        type: "destroy",
        trigger: "on_summon",
        targetLocation: "board",
      },
    ],
    spellSpeed: 1,
  },

  // === SPELLS/TRAPS (Various Archetypes) ===

  "Tidal Wave": {
    effects: [
      {
        type: "toHand",
        trigger: "manual",
        targetLocation: "board",
      },
    ],
    spellSpeed: 1,
  },

  "Frozen Ambush": {
    effects: [
      {
        type: "negate",
        trigger: "manual",
      },
    ],
    spellSpeed: 2,
  },

  "Abyssal Trench": {
    effects: [
      {
        type: "summon",
        trigger: "manual",
        targetLocation: "graveyard",
      },
    ],
    spellSpeed: 1,
  },

  "Gale Blast": {
    effects: [
      {
        type: "toHand",
        trigger: "manual",
        targetLocation: "board",
      },
    ],
    spellSpeed: 2,
  },

  "Cyclone Zone": {
    effects: [
      {
        type: "destroy",
        trigger: "manual",
        targetLocation: "board",
      },
    ],
    spellSpeed: 1,
  },

  "Wind Walker": {
    effects: [
      {
        type: "directAttack",
        trigger: "manual",
      },
    ],
    spellSpeed: 1,
  },

  "Armored Surprise": {
    effects: [
      {
        type: "negate",
        trigger: "manual",
      },
    ],
    spellSpeed: 2,
  },

  "Legion's Strength": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 800,
      },
    ],
    spellSpeed: 1,
  },

  "Iron Fortress": {
    effects: [
      {
        type: "modifyDEF",
        trigger: "manual",
        value: 1000,
      },
    ],
    spellSpeed: 1,
  },

  "Fortified Field": {
    effects: [
      {
        type: "modifyDEF",
        trigger: "manual",
        value: 500,
      },
    ],
    spellSpeed: 1,
  },

  "Legion's Stand": {
    effects: [
      {
        type: "negate",
        trigger: "manual",
      },
    ],
    spellSpeed: 2,
  },

  "Armored Aura": {
    effects: [
      {
        type: "modifyDEF",
        trigger: "manual",
        value: 800,
      },
    ],
    spellSpeed: 1,
  },

  "Storm Barrier": {
    effects: [
      {
        type: "negate",
        trigger: "manual",
      },
    ],
    spellSpeed: 2,
  },

  "Undying Flame": {
    effects: [
      {
        type: "summon",
        trigger: "manual",
        targetLocation: "graveyard",
      },
    ],
    spellSpeed: 2,
  },

  // === CONTINUOUS FIELD EFFECTS ===

  "Magma Carrier": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 300,
        isContinuous: true,
      },
    ],
    spellSpeed: 1,
  },

  "Infernal Warlord": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 400,
        isContinuous: true,
      },
    ],
    spellSpeed: 1,
  },

  "Volcanic Lair": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 300,
        isContinuous: true,
      },
    ],
    spellSpeed: 1,
  },

  "Infernal Presence": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 0,
        isContinuous: true,
        // Note: Protection from spell targeting
      },
    ],
    spellSpeed: 1,
  },

  "Glacial Blessing": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: 400,
        isContinuous: true,
      },
    ],
    spellSpeed: 1,
  },

  "Infernal Recovery": {
    effects: [
      {
        type: "toHand",
        trigger: "manual",
        targetLocation: "graveyard",
      },
    ],
    spellSpeed: 1,
  },

  "Scorching Wind": {
    effects: [
      {
        type: "modifyATK",
        trigger: "manual",
        value: -600,
      },
    ],
    spellSpeed: 2,
  },

  "Infernal Furnace": {
    effects: [
      {
        type: "damage",
        trigger: "manual",
        value: 200,
        targetOwner: "opponent",
        isContinuous: true,
      },
    ],
    spellSpeed: 1,
  },

  "Ring of Fire": {
    effects: [
      {
        type: "damage",
        trigger: "on_opponent_summon",
        value: 200,
        targetOwner: "opponent",
      },
    ],
    spellSpeed: 1,
  },
};

// Update cards with manual abilities
export const applyManualAbilities = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting migration: applyManualAbilities");

    let enqueuedCount = 0;
    let notFoundCount = 0;

    // Enqueue update jobs for each card
    for (const [cardName, ability] of Object.entries(MANUAL_ABILITIES)) {
      // Find card by name
      const card = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_name", (q) => q.eq("name", cardName))
        .first();

      if (!card) {
        notFoundCount++;
        console.warn(`[Migration] Card not found: ${cardName}`);
        continue;
      }

      await migrationsPool.enqueueMutation(
        ctx,
        internal.migrations.manualAbilities.updateCardAbility,
        {
          cardId: card._id,
          cardName,
          ability,
        }
      );

      enqueuedCount++;
    }

    console.log(
      `Migration jobs enqueued: ${enqueuedCount} cards to update, ${notFoundCount} cards not found`
    );

    return {
      success: true,
      total: Object.keys(MANUAL_ABILITIES).length,
      enqueued: enqueuedCount,
      notFound: notFoundCount,
      message: `Enqueued ${enqueuedCount} ability update jobs. Check workpool status for progress.`,
    };
  },
});

/**
 * Worker mutation: Update a single card's ability
 */
export const updateCardAbility = internalMutation({
  args: {
    cardId: v.id("cardDefinitions"),
    cardName: v.string(),
    ability: v.any(),
  },
  handler: async (ctx, { cardId, cardName, ability }) => {
    try {
      const card = await ctx.db.get(cardId);

      if (!card) {
        console.error(`[Migration Worker] Card not found: ${cardId}`);
        return { success: false, error: "Card not found" };
      }

      // Update with proper ability
      await ctx.db.patch(cardId, {
        ability,
      });

      console.log(`[Migration Worker] Updated ability for card: ${cardName}`);
      return { success: true, updated: true };
    } catch (error) {
      console.error(`[Migration Worker] Failed to update card ${cardName}:`, error);
      return { success: false, error: String(error) };
    }
  },
});
