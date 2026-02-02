/**
 * Game State Normalizer
 *
 * Converts the new API response format to include legacy fields
 * for backward compatibility with existing actions.
 */

import type { GameStateResponse, PlayerState, MonsterCard, SpellTrapCard, BoardCard, CardInHand } from '../types/api';

/**
 * Normalized game state with both new and legacy fields
 */
export interface NormalizedGameState extends GameStateResponse {
  hostPlayer: PlayerState;
  opponentPlayer: PlayerState;
}

/**
 * Convert BoardCard to MonsterCard format
 */
function boardCardToMonsterCard(card: BoardCard, index: number): MonsterCard {
  return {
    boardIndex: index,
    cardId: card._id,
    name: card.name,
    position: card.isFaceDown ? 'facedown' : (card.position === 1 ? 'attack' : 'defense'),
    atk: card.currentAttack ?? card.attack ?? 0,
    def: card.currentDefense ?? card.defense ?? 0,
    level: card.cost ?? 0,
    canAttack: !card.hasAttacked && card.position === 1 && !card.isFaceDown,
    canChangePosition: !card.hasAttacked && !card.isFaceDown, // Simplified check
    summonedThisTurn: false, // Not tracked in API response
    faceUp: !card.isFaceDown,
  };
}

/**
 * Convert CardInHand to legacy format
 */
function normalizeCardInHand(card: CardInHand, index: number): CardInHand {
  return {
    ...card,
    handIndex: index,
    cardId: card._id,
    // Pass through cardType to type field (both now use 'creature')
    type: card.cardType,
    // Map new field names to legacy names
    level: card.cost,
    atk: card.attack,
    def: card.defense,
  };
}

/**
 * Normalize game state response to include legacy fields
 * This allows existing actions to work without modification
 */
export function normalizeGameState(state: GameStateResponse): NormalizedGameState {
  // Convert myBoard to monster zone format
  const myMonsterZone: MonsterCard[] = (state.myBoard || []).map((card, idx) =>
    boardCardToMonsterCard(card, idx)
  );

  // Convert opponentBoard to monster zone format
  const opponentMonsterZone: MonsterCard[] = (state.opponentBoard || []).map((card, idx) =>
    boardCardToMonsterCard(card, idx)
  );

  // Normalize hand cards
  const normalizedHand = (state.hand || []).map((card, idx) =>
    normalizeCardInHand(card, idx)
  );

  // Build legacy player states
  const hostPlayer: PlayerState = {
    playerId: state.currentTurnPlayer || '',
    lifePoints: state.myLifePoints,
    deckCount: state.myDeckCount,
    monsterZone: myMonsterZone,
    spellTrapZone: [], // Not returned separately in current API
    graveyard: [],
    banished: [],
    extraDeck: 0,
  };

  const opponentPlayer: PlayerState = {
    playerId: '',
    lifePoints: state.opponentLifePoints,
    deckCount: state.opponentDeckCount,
    monsterZone: opponentMonsterZone,
    spellTrapZone: [], // Not returned separately in current API
    graveyard: [],
    banished: [],
    extraDeck: 0,
  };

  return {
    ...state,
    hand: normalizedHand,
    hostPlayer,
    opponentPlayer,
    // Ensure canChangePosition exists
    canChangePosition: state.canChangePosition || myMonsterZone.map(m => m.canChangePosition),
    // Add legacy status and currentTurn fields
    status: 'active' as const, // Game state is only returned for active games
    currentTurn: state.isMyTurn ? 'host' as const : 'opponent' as const,
  };
}
