/**
 * CardPreview Component
 * Interactive card display for documentation
 */

'use client';

import { useState } from 'react';
import { getCardData, type Card } from '../../../lib/cardData';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';

interface CardPreviewProps {
  cardId: string;
  variant?: 'normal' | 'foil' | 'alt-art';
  showStats?: boolean;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  context?: 'docs' | 'game' | 'deck-builder';
}

export function CardPreview({
  cardId,
  variant = 'normal',
  showStats = true,
  interactive = true,
  size = 'md',
  context = 'docs'
}: CardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const card = getCardData(cardId);

  if (!card) {
    return (
      <div className="card-preview-error border-2 border-red-500 rounded-lg p-4">
        <p className="text-red-600 font-semibold">Card not found: {cardId}</p>
        <p className="text-sm text-gray-600">This card may not exist or is not yet documented.</p>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'w-48',
    md: 'w-64',
    lg: 'w-80'
  };

  return (
    <div className={`card-preview ${sizeClasses[size]} my-6 border rounded-lg overflow-hidden shadow-lg`}>
      {/* Card Image */}
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-4">
        <div
          className={`card-image bg-gray-700 rounded aspect-[2/3] flex items-center justify-center ${
            interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''
          }`}
          onClick={() => interactive && setIsFlipped(!isFlipped)}
        >
          {card.imageUrl ? (
            <ImageZoom>
              <img
                src={card.imageUrl}
                alt={card.name}
                className="w-full h-full object-cover rounded"
              />
            </ImageZoom>
          ) : (
            <div className="text-center p-4">
              <div className={`text-4xl mb-2 ${getElementEmoji(card.element)}`}>
                {getElementEmoji(card.element)}
              </div>
              <p className="text-white font-bold">{card.name}</p>
              <p className="text-gray-400 text-sm">{card.type}</p>
            </div>
          )}
        </div>

        {/* Card cost badge */}
        <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg">
          {card.cost}
        </div>
      </div>

      {/* Card Info */}
      <div className="bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900">{card.name}</h3>
          <span className={`text-xs px-2 py-1 rounded ${getRarityColor(card.rarity)}`}>
            {card.rarity}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-3">{card.description}</p>

        {/* Stats */}
        {showStats && (card.attack !== undefined || card.health !== undefined) && (
          <div className="flex gap-4 mb-3 p-2 bg-gray-100 rounded">
            {card.attack !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-red-600 font-bold">⚔️</span>
                <span className="font-bold">{card.attack}</span>
              </div>
            )}
            {card.health !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-green-600 font-bold">❤️</span>
                <span className="font-bold">{card.health}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span>{getElementEmoji(card.element)}</span>
              <span className="text-sm capitalize">{card.element}</span>
            </div>
          </div>
        )}

        {/* Abilities */}
        {card.abilities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Abilities:</h4>
            {card.abilities.map((ability) => (
              <div key={ability.id} className="text-xs border-l-2 border-blue-500 pl-2">
                <span className="font-semibold">{ability.name}:</span>{' '}
                <span className="text-gray-600">{ability.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Flavor text */}
        {card.flavorText && (
          <p className="text-xs italic text-gray-500 mt-3 border-t pt-2">
            "{card.flavorText}"
          </p>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getElementEmoji(element: string): string {
  const emojis: Record<string, string> = {
    fire: '🔥',
    water: '💧',
    earth: '🌍',
    wind: '💨',
    neutral: '⚪'
  };
  return emojis[element] || '⚪';
}

function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: 'bg-gray-300 text-gray-800',
    uncommon: 'bg-green-200 text-green-800',
    rare: 'bg-blue-200 text-blue-800',
    epic: 'bg-purple-200 text-purple-800',
    legendary: 'bg-orange-200 text-orange-800'
  };
  return colors[rarity] || colors.common;
}
