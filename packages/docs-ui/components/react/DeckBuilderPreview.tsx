/**
 * DeckBuilderPreview Component
 * Mini deck composition viewer for documentation
 * Use as a React island in Astro: <DeckBuilderPreview client:load />
 */

'use client';

import { useMemo } from 'react';
import { clsx } from 'clsx';

export interface DeckCard {
  id: string;
  name: string;
  type: 'creature' | 'spell' | 'trap';
  element: 'ember' | 'void' | 'arcane' | 'nature' | 'frost' | 'neutral';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  cost: number;
  count: number;
}

export interface DeckData {
  name: string;
  description?: string;
  archetype?: string;
  cards: DeckCard[];
}

interface DeckBuilderPreviewProps {
  deck: DeckData;
  showStats?: boolean;
  showManaChart?: boolean;
  className?: string;
}

const elementConfig = {
  ember: { icon: '🔥', color: '#ff6b35' },
  void: { icon: '🌑', color: '#9333ea' },
  arcane: { icon: '✨', color: '#06b6d4' },
  nature: { icon: '🌿', color: '#10b981' },
  frost: { icon: '❄️', color: '#0ea5e9' },
  neutral: { icon: '⚪', color: '#a89f94' }
};

const rarityConfig = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#d4af37'
};

export function DeckBuilderPreview({
  deck,
  showStats = true,
  showManaChart = true,
  className
}: DeckBuilderPreviewProps) {
  const stats = useMemo(() => {
    const totalCards = deck.cards.reduce((sum, c) => sum + c.count, 0);

    const byType = {
      creature: deck.cards.filter(c => c.type === 'creature').reduce((sum, c) => sum + c.count, 0),
      spell: deck.cards.filter(c => c.type === 'spell').reduce((sum, c) => sum + c.count, 0),
      trap: deck.cards.filter(c => c.type === 'trap').reduce((sum, c) => sum + c.count, 0)
    };

    const byElement = Object.keys(elementConfig).reduce((acc, el) => {
      acc[el] = deck.cards.filter(c => c.element === el).reduce((sum, c) => sum + c.count, 0);
      return acc;
    }, {} as Record<string, number>);

    const manaCurve = deck.cards.reduce((acc, card) => {
      const cost = Math.min(card.cost, 7); // Cap at 7+
      acc[cost] = (acc[cost] || 0) + card.count;
      return acc;
    }, {} as Record<number, number>);

    const avgCost = deck.cards.reduce((sum, c) => sum + c.cost * c.count, 0) / totalCards;

    return { totalCards, byType, byElement, manaCurve, avgCost };
  }, [deck.cards]);

  const maxManaCount = Math.max(...Object.values(stats.manaCurve), 1);

  return (
    <div
      className={clsx(
        'deck-builder-preview rounded-lg overflow-hidden my-6',
        className
      )}
      style={{
        background: 'linear-gradient(180deg, #171314 0%, #0a0503 100%)',
        border: '2px solid #5c4033',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.1) 0%, transparent 100%)',
          borderBottom: '1px solid #3d2b25'
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              className="text-xl font-bold text-[#e8e0d5] mb-1"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {deck.name}
            </h3>
            {deck.archetype && (
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  background: 'rgba(212, 175, 55, 0.2)',
                  color: '#d4af37'
                }}
              >
                {deck.archetype}
              </span>
            )}
          </div>
          <div
            className="text-2xl font-bold"
            style={{
              color: stats.totalCards >= 40 && stats.totalCards <= 60 ? '#22c55e' : '#ef4444'
            }}
          >
            {stats.totalCards}
            <span className="text-sm text-[#6b5b4f]">/40-60</span>
          </div>
        </div>
        {deck.description && (
          <p className="text-sm text-[#a89f94] mt-2">{deck.description}</p>
        )}
      </div>

      {/* Stats */}
      {showStats && (
        <div className="p-4 border-b border-[#3d2b25]">
          <div className="grid grid-cols-2 gap-4">
            {/* Type breakdown */}
            <div>
              <h4 className="text-xs font-semibold text-[#6b5b4f] uppercase tracking-wider mb-2">
                Card Types
              </h4>
              <div className="space-y-1">
                <TypeBar label="Creatures" count={stats.byType.creature} total={stats.totalCards} color="#ff6b35" />
                <TypeBar label="Spells" count={stats.byType.spell} total={stats.totalCards} color="#06b6d4" />
                <TypeBar label="Traps" count={stats.byType.trap} total={stats.totalCards} color="#a855f7" />
              </div>
            </div>

            {/* Element breakdown */}
            <div>
              <h4 className="text-xs font-semibold text-[#6b5b4f] uppercase tracking-wider mb-2">
                Elements
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byElement)
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([element, count]) => {
                    const config = elementConfig[element as keyof typeof elementConfig];
                    return (
                      <span
                        key={element}
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: `${config.color}20`,
                          color: config.color,
                          border: `1px solid ${config.color}40`
                        }}
                      >
                        {config.icon} {count}
                      </span>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mana curve */}
      {showManaChart && (
        <div className="p-4 border-b border-[#3d2b25]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-[#6b5b4f] uppercase tracking-wider">
              Mana Curve
            </h4>
            <span className="text-xs text-[#a89f94]">
              Avg: <span className="font-bold text-[#d4af37]">{stats.avgCost.toFixed(1)}</span>
            </span>
          </div>
          <div className="flex items-end gap-1 h-24">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((cost) => {
              const count = stats.manaCurve[cost] || 0;
              const height = (count / maxManaCount) * 100;
              return (
                <div key={cost} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full rounded-t transition-all duration-300 relative group"
                    style={{
                      height: `${Math.max(height, 4)}%`,
                      background: count > 0
                        ? 'linear-gradient(180deg, #d4af37 0%, #8b6914 100%)'
                        : '#261f1c'
                    }}
                  >
                    {count > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-[#d4af37]">
                        {count}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#6b5b4f] mt-1">
                    {cost === 7 ? '7+' : cost}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card list */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-[#6b5b4f] uppercase tracking-wider mb-2">
          Cards ({deck.cards.length} unique)
        </h4>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {deck.cards
            .sort((a, b) => a.cost - b.cost)
            .map((card) => {
              const element = elementConfig[card.element];
              const rarityColor = rarityConfig[card.rarity];
              return (
                <div
                  key={card.id}
                  className="flex items-center gap-2 p-2 rounded"
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                >
                  {/* Cost */}
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: '#261f1c',
                      color: '#d4af37',
                      border: '1px solid #5c4033'
                    }}
                  >
                    {card.cost}
                  </span>

                  {/* Element */}
                  <span title={card.element}>{element.icon}</span>

                  {/* Name */}
                  <span
                    className="flex-1 text-sm font-medium"
                    style={{ color: rarityColor }}
                  >
                    {card.name}
                  </span>

                  {/* Type */}
                  <span className="text-xs text-[#6b5b4f] capitalize">
                    {card.type}
                  </span>

                  {/* Count */}
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                    style={{
                      background: card.count > 1 ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                      color: '#e8e0d5'
                    }}
                  >
                    ×{card.count}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

interface TypeBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function TypeBar({ label, count, total, color }: TypeBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#a89f94] w-16">{label}</span>
      <div className="flex-1 h-2 bg-[#261f1c] rounded overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background: color
          }}
        />
      </div>
      <span className="text-xs font-medium text-[#e8e0d5] w-6 text-right">{count}</span>
    </div>
  );
}

export default DeckBuilderPreview;
