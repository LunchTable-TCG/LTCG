/**
 * MatchupCalculator Component
 * Element/archetype win rate calculator
 * Use as a React island in Astro: <MatchupCalculator client:load />
 */

'use client';

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';

export type Element = 'ember' | 'void' | 'arcane' | 'nature' | 'frost' | 'neutral';

export interface MatchupData {
  attacker: Element;
  defender: Element;
  advantagePercent: number;
  description: string;
}

interface MatchupCalculatorProps {
  matchups?: MatchupData[];
  showMatrix?: boolean;
  className?: string;
}

const elementConfig: Record<Element, { icon: string; color: string; name: string }> = {
  ember: { icon: '🔥', color: '#ff6b35', name: 'Ember' },
  void: { icon: '🌑', color: '#9333ea', name: 'Void' },
  arcane: { icon: '✨', color: '#06b6d4', name: 'Arcane' },
  nature: { icon: '🌿', color: '#10b981', name: 'Nature' },
  frost: { icon: '❄️', color: '#0ea5e9', name: 'Frost' },
  neutral: { icon: '⚪', color: '#a89f94', name: 'Neutral' }
};

// Default element advantage matrix (percentage advantage for attacker)
const defaultMatchups: MatchupData[] = [
  // Ember matchups
  { attacker: 'ember', defender: 'nature', advantagePercent: 65, description: 'Ember burns Nature' },
  { attacker: 'ember', defender: 'frost', advantagePercent: 35, description: 'Frost extinguishes Ember' },
  { attacker: 'ember', defender: 'arcane', advantagePercent: 45, description: 'Slight disadvantage' },
  { attacker: 'ember', defender: 'void', advantagePercent: 55, description: 'Slight advantage' },
  { attacker: 'ember', defender: 'ember', advantagePercent: 50, description: 'Mirror match' },
  { attacker: 'ember', defender: 'neutral', advantagePercent: 55, description: 'Elemental advantage' },

  // Frost matchups
  { attacker: 'frost', defender: 'ember', advantagePercent: 65, description: 'Frost extinguishes Ember' },
  { attacker: 'frost', defender: 'nature', advantagePercent: 35, description: 'Nature resists Frost' },
  { attacker: 'frost', defender: 'void', advantagePercent: 45, description: 'Slight disadvantage' },
  { attacker: 'frost', defender: 'arcane', advantagePercent: 55, description: 'Slight advantage' },
  { attacker: 'frost', defender: 'frost', advantagePercent: 50, description: 'Mirror match' },
  { attacker: 'frost', defender: 'neutral', advantagePercent: 55, description: 'Elemental advantage' },

  // Nature matchups
  { attacker: 'nature', defender: 'frost', advantagePercent: 65, description: 'Nature thrives in cold' },
  { attacker: 'nature', defender: 'ember', advantagePercent: 35, description: 'Ember burns Nature' },
  { attacker: 'nature', defender: 'arcane', advantagePercent: 45, description: 'Slight disadvantage' },
  { attacker: 'nature', defender: 'void', advantagePercent: 55, description: 'Life resists Void' },
  { attacker: 'nature', defender: 'nature', advantagePercent: 50, description: 'Mirror match' },
  { attacker: 'nature', defender: 'neutral', advantagePercent: 55, description: 'Elemental advantage' },

  // Arcane matchups
  { attacker: 'arcane', defender: 'ember', advantagePercent: 55, description: 'Magic controls fire' },
  { attacker: 'arcane', defender: 'frost', advantagePercent: 45, description: 'Slight disadvantage' },
  { attacker: 'arcane', defender: 'void', advantagePercent: 65, description: 'Light pierces darkness' },
  { attacker: 'arcane', defender: 'nature', advantagePercent: 55, description: 'Slight advantage' },
  { attacker: 'arcane', defender: 'arcane', advantagePercent: 50, description: 'Mirror match' },
  { attacker: 'arcane', defender: 'neutral', advantagePercent: 55, description: 'Elemental advantage' },

  // Void matchups
  { attacker: 'void', defender: 'arcane', advantagePercent: 35, description: 'Light banishes darkness' },
  { attacker: 'void', defender: 'ember', advantagePercent: 45, description: 'Slight disadvantage' },
  { attacker: 'void', defender: 'frost', advantagePercent: 55, description: 'Slight advantage' },
  { attacker: 'void', defender: 'nature', advantagePercent: 45, description: 'Life resists Void' },
  { attacker: 'void', defender: 'void', advantagePercent: 50, description: 'Mirror match' },
  { attacker: 'void', defender: 'neutral', advantagePercent: 60, description: 'Strong elemental advantage' },

  // Neutral matchups
  { attacker: 'neutral', defender: 'ember', advantagePercent: 45, description: 'Elemental disadvantage' },
  { attacker: 'neutral', defender: 'frost', advantagePercent: 45, description: 'Elemental disadvantage' },
  { attacker: 'neutral', defender: 'nature', advantagePercent: 45, description: 'Elemental disadvantage' },
  { attacker: 'neutral', defender: 'arcane', advantagePercent: 45, description: 'Elemental disadvantage' },
  { attacker: 'neutral', defender: 'void', advantagePercent: 40, description: 'Void dominates neutral' },
  { attacker: 'neutral', defender: 'neutral', advantagePercent: 50, description: 'Mirror match' }
];

const elements: Element[] = ['ember', 'frost', 'nature', 'arcane', 'void', 'neutral'];

export function MatchupCalculator({
  matchups = defaultMatchups,
  showMatrix = true,
  className
}: MatchupCalculatorProps) {
  const [selectedAttacker, setSelectedAttacker] = useState<Element>('ember');
  const [selectedDefender, setSelectedDefender] = useState<Element>('frost');

  const matchupMap = useMemo(() => {
    const map = new Map<string, MatchupData>();
    matchups.forEach((m) => {
      map.set(`${m.attacker}-${m.defender}`, m);
    });
    return map;
  }, [matchups]);

  const currentMatchup = matchupMap.get(`${selectedAttacker}-${selectedDefender}`);

  const getAdvantageColor = (percent: number) => {
    if (percent >= 60) return '#22c55e';
    if (percent >= 55) return '#84cc16';
    if (percent > 50) return '#a3e635';
    if (percent === 50) return '#a89f94';
    if (percent >= 45) return '#fbbf24';
    if (percent >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div
      className={clsx(
        'matchup-calculator rounded-lg overflow-hidden my-6',
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
          background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)',
          borderBottom: '1px solid #3d2b25'
        }}
      >
        <h3
          className="text-xl font-bold text-[#e8e0d5]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Element Matchup Calculator
        </h3>
        <p className="text-sm text-[#a89f94]">
          Compare elemental advantages and plan your strategy
        </p>
      </div>

      {/* Selector */}
      <div className="p-4 border-b border-[#3d2b25]">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* Attacker selector */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-[#6b5b4f] uppercase tracking-wider">
              Your Element
            </span>
            <div className="flex gap-2">
              {elements.map((el) => {
                const config = elementConfig[el];
                const isSelected = selectedAttacker === el;
                return (
                  <button
                    key={el}
                    onClick={() => setSelectedAttacker(el)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all"
                    style={{
                      background: isSelected ? config.color : '#261f1c',
                      border: `2px solid ${isSelected ? config.color : '#3d2b25'}`,
                      boxShadow: isSelected ? `0 0 15px ${config.color}40` : 'none'
                    }}
                    title={config.name}
                  >
                    {config.icon}
                  </button>
                );
              })}
            </div>
          </div>

          <span className="text-2xl text-[#5c4033]">⚔️</span>

          {/* Defender selector */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-[#6b5b4f] uppercase tracking-wider">
              Opponent Element
            </span>
            <div className="flex gap-2">
              {elements.map((el) => {
                const config = elementConfig[el];
                const isSelected = selectedDefender === el;
                return (
                  <button
                    key={el}
                    onClick={() => setSelectedDefender(el)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all"
                    style={{
                      background: isSelected ? config.color : '#261f1c',
                      border: `2px solid ${isSelected ? config.color : '#3d2b25'}`,
                      boxShadow: isSelected ? `0 0 15px ${config.color}40` : 'none'
                    }}
                    title={config.name}
                  >
                    {config.icon}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Result */}
        {currentMatchup && (
          <div className="mt-4 p-4 rounded-lg text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="flex items-center justify-center gap-4 mb-2">
              <span className="text-2xl">{elementConfig[selectedAttacker].icon}</span>
              <span className="text-[#5c4033]">vs</span>
              <span className="text-2xl">{elementConfig[selectedDefender].icon}</span>
            </div>

            <div
              className="text-4xl font-bold mb-1"
              style={{ color: getAdvantageColor(currentMatchup.advantagePercent) }}
            >
              {currentMatchup.advantagePercent}%
            </div>

            <p className="text-sm text-[#a89f94]">{currentMatchup.description}</p>

            <div className="mt-3 h-3 bg-[#261f1c] rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${currentMatchup.advantagePercent}%`,
                  background: `linear-gradient(90deg, ${elementConfig[selectedAttacker].color} 0%, ${getAdvantageColor(currentMatchup.advantagePercent)} 100%)`
                }}
              />
            </div>

            <div className="flex justify-between text-xs text-[#6b5b4f] mt-1">
              <span>Disadvantage</span>
              <span>Even</span>
              <span>Advantage</span>
            </div>
          </div>
        )}
      </div>

      {/* Matrix view */}
      {showMatrix && (
        <div className="p-4">
          <h4 className="text-xs font-semibold text-[#6b5b4f] uppercase tracking-wider mb-3">
            Full Matchup Matrix
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  {elements.map((el) => (
                    <th key={el} className="p-2 text-center">
                      <span title={elementConfig[el].name}>{elementConfig[el].icon}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {elements.map((attacker) => (
                  <tr key={attacker}>
                    <td className="p-2 text-center">
                      <span title={elementConfig[attacker].name}>{elementConfig[attacker].icon}</span>
                    </td>
                    {elements.map((defender) => {
                      const matchup = matchupMap.get(`${attacker}-${defender}`);
                      const percent = matchup?.advantagePercent || 50;
                      const isSelected = attacker === selectedAttacker && defender === selectedDefender;
                      return (
                        <td key={defender} className="p-1">
                          <button
                            onClick={() => {
                              setSelectedAttacker(attacker);
                              setSelectedDefender(defender);
                            }}
                            className={clsx(
                              'w-full p-2 rounded text-center font-medium transition-all',
                              isSelected && 'ring-2 ring-[#d4af37]'
                            )}
                            style={{
                              background: `${getAdvantageColor(percent)}20`,
                              color: getAdvantageColor(percent)
                            }}
                          >
                            {percent}%
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[#6b5b4f]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: '#ef4444' }} />
              &lt;40%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: '#fbbf24' }} />
              40-50%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: '#a89f94' }} />
              50%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: '#84cc16' }} />
              50-60%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: '#22c55e' }} />
              &gt;60%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchupCalculator;
