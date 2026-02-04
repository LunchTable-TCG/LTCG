/**
 * CardPreview Component
 * Interactive card display with flip animation, stats, and abilities
 * Use as a React island in Astro: <CardPreview client:load />
 */

'use client';

import { useState } from 'react';
import { clsx } from 'clsx';

export interface CardAbility {
  id: string;
  name: string;
  description: string;
  type: 'triggered' | 'activated' | 'continuous' | 'static';
  cost?: number;
  trigger?: string;
}

export interface CardData {
  id: string;
  name: string;
  type: 'creature' | 'spell' | 'trap';
  element: 'ember' | 'void' | 'arcane' | 'nature' | 'frost' | 'neutral';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  cost: number;
  attack?: number;
  health?: number;
  description: string;
  abilities: CardAbility[];
  flavorText?: string;
  imageUrl?: string;
}

interface CardPreviewProps {
  card: CardData;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showStats?: boolean;
  showAbilities?: boolean;
  className?: string;
}

const elementConfig = {
  ember: { icon: '🔥', color: '#ff6b35', glow: 'rgba(255, 107, 53, 0.4)' },
  void: { icon: '🌑', color: '#9333ea', glow: 'rgba(147, 51, 234, 0.4)' },
  arcane: { icon: '✨', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
  nature: { icon: '🌿', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  frost: { icon: '❄️', color: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.4)' },
  neutral: { icon: '⚪', color: '#a89f94', glow: 'rgba(168, 159, 148, 0.4)' }
};

const rarityConfig = {
  common: { color: '#9ca3af', label: 'Common' },
  uncommon: { color: '#22c55e', label: 'Uncommon' },
  rare: { color: '#3b82f6', label: 'Rare' },
  epic: { color: '#a855f7', label: 'Epic' },
  legendary: { color: '#d4af37', label: 'Legendary' }
};

const sizeClasses = {
  sm: 'w-48',
  md: 'w-64',
  lg: 'w-80'
};

export function CardPreview({
  card,
  size = 'md',
  interactive = true,
  showStats = true,
  showAbilities = true,
  className
}: CardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const element = elementConfig[card.element];
  const rarity = rarityConfig[card.rarity];

  const handleClick = () => {
    if (interactive) {
      setIsFlipped(!isFlipped);
    }
  };

  return (
    <div
      className={clsx(
        'card-preview my-6',
        sizeClasses[size],
        className
      )}
      style={{ perspective: '1000px' }}
    >
      <div
        className={clsx(
          'relative transition-transform duration-500 cursor-pointer',
          isFlipped && 'transform-gpu [transform:rotateY(180deg)]'
        )}
        style={{ transformStyle: 'preserve-3d' }}
        onClick={handleClick}
      >
        {/* Front of card */}
        <div
          className="card-front rounded-lg overflow-hidden border-2"
          style={{
            background: 'linear-gradient(180deg, #171314 0%, #0a0503 100%)',
            borderColor: rarity.color,
            boxShadow: `0 0 0 1px rgba(0,0,0,0.8), 0 0 20px ${element.glow}, 0 8px 32px rgba(0,0,0,0.8)`,
            backfaceVisibility: 'hidden'
          }}
        >
          {/* Card header with cost and element */}
          <div
            className="flex items-center justify-between p-3"
            style={{ background: `linear-gradient(180deg, ${element.glow} 0%, transparent 100%)` }}
          >
            {/* Mana cost */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #2a1f14 0%, #0a0503 100%)',
                borderColor: '#d4af37',
                color: '#d4af37',
                boxShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
              }}
            >
              {card.cost}
            </div>

            {/* Element badge */}
            <span
              className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1"
              style={{
                color: element.color,
                borderColor: element.color,
                background: `linear-gradient(180deg, ${element.glow} 0%, rgba(0,0,0,0.3) 100%)`,
                border: `1px solid ${element.color}`
              }}
            >
              <span>{element.icon}</span>
              <span className="capitalize">{card.element}</span>
            </span>
          </div>

          {/* Card image */}
          <div className="relative aspect-[4/3] bg-gray-800 mx-3">
            {card.imageUrl ? (
              <img
                src={card.imageUrl}
                alt={card.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">{element.icon}</span>
              </div>
            )}

            {/* Rarity badge */}
            <span
              className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
              style={{
                color: rarity.color,
                background: 'rgba(0,0,0,0.8)',
                border: `1px solid ${rarity.color}`,
                fontFamily: 'Cinzel, serif'
              }}
            >
              {rarity.label}
            </span>
          </div>

          {/* Card name and type */}
          <div className="px-3 py-2 border-t border-[#5c4033]">
            <h3
              className="text-lg font-bold"
              style={{
                color: '#e8e0d5',
                fontFamily: 'Cinzel, serif'
              }}
            >
              {card.name}
            </h3>
            <p className="text-xs uppercase tracking-wider text-[#a89f94]">
              {card.type}
            </p>
          </div>

          {/* Stats */}
          {showStats && card.type === 'creature' && (
            <div className="flex gap-4 px-3 py-2 bg-[#1a1311]">
              {card.attack !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-[#ff6b35]">⚔️</span>
                  <span className="font-bold text-[#e8e0d5]">{card.attack}</span>
                </div>
              )}
              {card.health !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-[#10b981]">❤️</span>
                  <span className="font-bold text-[#e8e0d5]">{card.health}</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="px-3 py-2">
            <p className="text-sm text-[#a89f94]">{card.description}</p>
          </div>

          {/* Flip hint */}
          {interactive && (
            <div className="text-center text-xs text-[#5c4033] pb-2">
              Click to flip
            </div>
          )}
        </div>

        {/* Back of card (abilities and flavor text) */}
        <div
          className="card-back absolute inset-0 rounded-lg overflow-hidden border-2"
          style={{
            background: 'linear-gradient(180deg, #171314 0%, #0a0503 100%)',
            borderColor: rarity.color,
            boxShadow: `0 0 0 1px rgba(0,0,0,0.8), 0 0 20px ${element.glow}, 0 8px 32px rgba(0,0,0,0.8)`,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {/* Header */}
          <div
            className="p-3 border-b border-[#5c4033]"
            style={{ background: `linear-gradient(180deg, ${element.glow} 0%, transparent 100%)` }}
          >
            <h3
              className="text-lg font-bold"
              style={{ color: '#e8e0d5', fontFamily: 'Cinzel, serif' }}
            >
              {card.name}
            </h3>
          </div>

          {/* Abilities */}
          {showAbilities && card.abilities.length > 0 && (
            <div className="p-3 space-y-3">
              <h4
                className="text-sm font-semibold text-[#d4af37] uppercase tracking-wider"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                Abilities
              </h4>
              {card.abilities.map((ability) => (
                <div
                  key={ability.id}
                  className="p-2 rounded border-l-2"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderColor: getAbilityTypeColor(ability.type)
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#e8e0d5] text-sm">
                      {ability.name}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        color: getAbilityTypeColor(ability.type),
                        background: `${getAbilityTypeColor(ability.type)}20`
                      }}
                    >
                      {ability.type}
                    </span>
                  </div>
                  <p className="text-xs text-[#a89f94]">{ability.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Flavor text */}
          {card.flavorText && (
            <div className="px-3 py-2 mt-auto">
              <p className="text-xs italic text-[#6b5b4f] border-t border-[#3d2b25] pt-2">
                "{card.flavorText}"
              </p>
            </div>
          )}

          {/* Flip hint */}
          {interactive && (
            <div className="text-center text-xs text-[#5c4033] pb-2">
              Click to flip back
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getAbilityTypeColor(type: CardAbility['type']) {
  const colors = {
    triggered: '#f59e0b',
    activated: '#3b82f6',
    continuous: '#22c55e',
    static: '#a855f7'
  };
  return colors[type];
}

export default CardPreview;
