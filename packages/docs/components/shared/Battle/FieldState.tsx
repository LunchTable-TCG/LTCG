/**
 * FieldState Component
 * Displays the battle field state for a player
 */

'use client';

export interface PlayerFieldState {
  playerName: string;
  hand: string[];
  field: string[];
  graveyard: string[];
  health?: number;
  mana?: number;
  maxMana?: number;
}

interface FieldStateProps {
  state: PlayerFieldState;
  compact?: boolean;
  highlightZone?: 'hand' | 'field' | 'graveyard';
}

export function FieldState({
  state,
  compact = false,
  highlightZone
}: FieldStateProps) {
  const renderCards = (cards: string[], zone: 'hand' | 'field' | 'graveyard') => {
    if (cards.length === 0) {
      return (
        <div className="text-xs text-gray-400 italic text-center py-2">
          No cards
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`
              px-2 py-1 rounded text-xs font-medium border
              ${zone === 'hand' ? 'bg-blue-50 border-blue-300 text-blue-800' : ''}
              ${zone === 'field' ? 'bg-green-50 border-green-300 text-green-800' : ''}
              ${zone === 'graveyard' ? 'bg-purple-50 border-purple-300 text-purple-800' : ''}
            `}
            title={card}
          >
            {card}
          </div>
        ))}
      </div>
    );
  };

  const getZoneClasses = (zone: 'hand' | 'field' | 'graveyard') => {
    const isHighlighted = highlightZone === zone;
    return `
      border rounded-lg p-3 transition-all duration-300
      ${isHighlighted ? 'border-yellow-500 bg-yellow-50 shadow-lg' : 'border-gray-300 bg-gray-50'}
    `;
  };

  if (compact) {
    return (
      <div className="field-state-compact bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm text-gray-800">{state.playerName}</h4>
          {state.health !== undefined && (
            <div className="flex items-center gap-3 text-xs">
              {state.mana !== undefined && (
                <span className="text-blue-600 font-semibold">
                  💎 {state.mana}/{state.maxMana || state.mana}
                </span>
              )}
              <span className="text-red-600 font-semibold">
                ❤️ {state.health}
              </span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-semibold text-gray-600">Hand</div>
            <div className="text-blue-600 font-bold">{state.hand.length}</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-600">Field</div>
            <div className="text-green-600 font-bold">{state.field.length}</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-600">Grave</div>
            <div className="text-purple-600 font-bold">{state.graveyard.length}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="field-state bg-white border rounded-lg p-4">
      {/* Player Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <h3 className="text-lg font-bold text-gray-800">{state.playerName}</h3>
        {state.health !== undefined && (
          <div className="flex items-center gap-4">
            {state.mana !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-xl">💎</span>
                <span className="font-bold text-blue-600">
                  {state.mana}/{state.maxMana || state.mana}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xl">❤️</span>
              <span className="font-bold text-red-600">{state.health}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Hand */}
        <div className={getZoneClasses('hand')}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🃏</span>
            <h4 className="text-sm font-semibold text-gray-700">
              Hand ({state.hand.length})
            </h4>
          </div>
          {renderCards(state.hand, 'hand')}
        </div>

        {/* Field */}
        <div className={getZoneClasses('field')}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🎴</span>
            <h4 className="text-sm font-semibold text-gray-700">
              Field ({state.field.length})
            </h4>
          </div>
          {renderCards(state.field, 'field')}
        </div>

        {/* Graveyard */}
        <div className={getZoneClasses('graveyard')}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💀</span>
            <h4 className="text-sm font-semibold text-gray-700">
              Graveyard ({state.graveyard.length})
            </h4>
          </div>
          {renderCards(state.graveyard, 'graveyard')}
        </div>
      </div>
    </div>
  );
}
