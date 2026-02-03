/**
 * Card data utilities for documentation components
 * Provides access to card information for interactive examples
 */

export interface Card {
  id: string;
  name: string;
  type: 'creature' | 'spell' | 'artifact' | 'land';
  element: 'fire' | 'water' | 'earth' | 'wind' | 'neutral';
  cost: number;
  attack?: number;
  health?: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  imageUrl: string;
  description: string;
  abilities: Ability[];
  flavorText?: string;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  type: 'triggered' | 'activated' | 'continuous' | 'static';
  trigger?: string;
  effects: Effect[];
}

export interface Effect {
  type: string;
  target?: string;
  value?: number;
  duration?: number;
}

// Mock data for documentation examples
// TODO: Replace with actual data source (Convex or static JSON)
export const mockCards: Record<string, Card> = {
  'fire-drake-001': {
    id: 'fire-drake-001',
    name: 'Fire Drake',
    type: 'creature',
    element: 'fire',
    cost: 4,
    attack: 4,
    health: 3,
    rarity: 'uncommon',
    imageUrl: '/cards/fire-drake-001.png',
    description: 'A powerful mid-game dragon with burning attacks',
    abilities: [
      {
        id: 'dragons-breath',
        name: "Dragon's Breath",
        description: 'When this creature attacks, deal 2 damage to the defending player',
        type: 'triggered',
        trigger: 'on_attack',
        effects: [
          { type: 'damage', target: 'opponent', value: 2 }
        ]
      }
    ],
    flavorText: 'Born from volcanic fury, raised in flame.'
  },
  'healing-spell-012': {
    id: 'healing-spell-012',
    name: 'Healing Light',
    type: 'spell',
    element: 'neutral',
    cost: 2,
    rarity: 'common',
    imageUrl: '/cards/healing-spell-012.png',
    description: 'Restore health to a target creature or player',
    abilities: [
      {
        id: 'heal-effect',
        name: 'Heal',
        description: 'Restore 4 health to target',
        type: 'activated',
        effects: [
          { type: 'heal', value: 4 }
        ]
      }
    ]
  },
  'poison-serpent-045': {
    id: 'poison-serpent-045',
    name: 'Poison Serpent',
    type: 'creature',
    element: 'earth',
    cost: 3,
    attack: 2,
    health: 3,
    rarity: 'uncommon',
    imageUrl: '/cards/poison-serpent-045.png',
    description: 'A venomous creature that poisons enemies',
    abilities: [
      {
        id: 'poison-bite',
        name: 'Poison Bite',
        description: 'When this creature deals damage, apply poison (2 damage per turn) to the target',
        type: 'triggered',
        trigger: 'on_damage_dealt',
        effects: [
          { type: 'status_effect', target: 'damaged_creature', value: 2, duration: 3 }
        ]
      }
    ],
    flavorText: 'Its bite is worse than its hiss.'
  }
};

/**
 * Get card data by ID
 * In production, this would query Convex or load from static JSON
 */
export function getCardData(cardId: string): Card | null {
  return mockCards[cardId] || null;
}

/**
 * Get all cards
 */
export function getAllCards(): Card[] {
  return Object.values(mockCards);
}

/**
 * Search cards by criteria
 */
export function searchCards(criteria: {
  element?: string[];
  rarity?: string[];
  type?: string[];
  costRange?: [number, number];
  search?: string;
}): Card[] {
  let results = getAllCards();

  if (criteria.element) {
    results = results.filter(c => criteria.element!.includes(c.element));
  }

  if (criteria.rarity) {
    results = results.filter(c => criteria.rarity!.includes(c.rarity));
  }

  if (criteria.type) {
    results = results.filter(c => criteria.type!.includes(c.type));
  }

  if (criteria.costRange) {
    const [min, max] = criteria.costRange;
    results = results.filter(c => c.cost >= min && c.cost <= max);
  }

  if (criteria.search) {
    const query = criteria.search.toLowerCase();
    results = results.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
    );
  }

  return results;
}
