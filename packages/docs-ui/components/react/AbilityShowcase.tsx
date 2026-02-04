/**
 * AbilityShowcase Component
 * Interactive ability display with trigger visualization
 * Use as a React island in Astro: <AbilityShowcase client:load />
 */

'use client';

import { useState } from 'react';
import { clsx } from 'clsx';

export interface AbilityEffect {
  id: string;
  type: string;
  target: string;
  value?: number;
  description: string;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  type: 'triggered' | 'activated' | 'continuous' | 'static';
  trigger?: string;
  cost?: { mana?: number; tap?: boolean; discard?: number };
  effects: AbilityEffect[];
}

interface AbilityShowcaseProps {
  ability: Ability;
  showTrigger?: boolean;
  showEffects?: boolean;
  animated?: boolean;
  className?: string;
}

const abilityTypeConfig = {
  triggered: {
    color: '#f59e0b',
    label: 'Triggered',
    description: 'Activates when a specific condition is met'
  },
  activated: {
    color: '#3b82f6',
    label: 'Activated',
    description: 'Pay a cost to activate manually'
  },
  continuous: {
    color: '#22c55e',
    label: 'Continuous',
    description: 'Always active while card is on field'
  },
  static: {
    color: '#a855f7',
    label: 'Static',
    description: 'Modifies game rules'
  }
};

const triggerIcons: Record<string, string> = {
  on_attack: '⚔️',
  on_damage_dealt: '💥',
  on_death: '💀',
  on_enter: '✨',
  on_spell_cast: '📜',
  on_turn_start: '🌅',
  on_turn_end: '🌙',
  on_heal: '💚',
  on_discard: '🗑️'
};

export function AbilityShowcase({
  ability,
  showTrigger = true,
  showEffects = true,
  animated = true,
  className
}: AbilityShowcaseProps) {
  const [isTriggered, setIsTriggered] = useState(false);
  const [activeEffectIndex, setActiveEffectIndex] = useState(-1);

  const typeConfig = abilityTypeConfig[ability.type];

  const handleTriggerDemo = () => {
    setIsTriggered(true);
    setActiveEffectIndex(0);

    // Animate through effects
    if (animated && ability.effects.length > 0) {
      ability.effects.forEach((_, idx) => {
        setTimeout(() => {
          setActiveEffectIndex(idx);
        }, (idx + 1) * 600);
      });

      setTimeout(() => {
        setIsTriggered(false);
        setActiveEffectIndex(-1);
      }, ability.effects.length * 600 + 800);
    } else {
      setTimeout(() => {
        setIsTriggered(false);
        setActiveEffectIndex(-1);
      }, 1500);
    }
  };

  return (
    <div
      className={clsx(
        'ability-showcase rounded-lg overflow-hidden my-6',
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
          background: `linear-gradient(180deg, ${typeConfig.color}20 0%, transparent 100%)`,
          borderBottom: '1px solid #3d2b25'
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3
              className="text-xl font-bold text-[#e8e0d5] mb-2"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {ability.name}
            </h3>
            <p className="text-sm text-[#a89f94]">{ability.description}</p>
          </div>

          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: `${typeConfig.color}20`,
              color: typeConfig.color,
              border: `1px solid ${typeConfig.color}40`
            }}
          >
            {typeConfig.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Trigger condition */}
        {showTrigger && ability.trigger && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#d4af37]" style={{ fontFamily: 'Cinzel, serif' }}>
                Trigger Condition
              </h4>
              <button
                onClick={handleTriggerDemo}
                disabled={isTriggered}
                className="text-xs px-3 py-1 rounded font-medium transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#fff'
                }}
              >
                {isTriggered ? 'Triggering...' : 'Demo Trigger'}
              </button>
            </div>

            <div
              className={clsx(
                'p-3 rounded transition-all duration-300',
                isTriggered && 'ring-2 ring-[#f59e0b]'
              )}
              style={{
                background: isTriggered
                  ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.2) 0%, rgba(0,0,0,0.3) 100%)'
                  : 'rgba(0,0,0,0.3)',
                border: '1px solid #3d2b25'
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {triggerIcons[ability.trigger] || '⚡'}
                </span>
                <div>
                  <div className="text-sm font-medium text-[#e8e0d5]">
                    {formatTriggerName(ability.trigger)}
                  </div>
                  <div className="text-xs text-[#6b5b4f]">
                    {getTriggerDescription(ability.trigger)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cost (for activated abilities) */}
        {ability.type === 'activated' && ability.cost && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[#d4af37]" style={{ fontFamily: 'Cinzel, serif' }}>
              Activation Cost
            </h4>
            <div className="flex flex-wrap gap-2">
              {ability.cost.mana && (
                <span
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    background: 'rgba(6, 182, 212, 0.2)',
                    color: '#06b6d4',
                    border: '1px solid rgba(6, 182, 212, 0.4)'
                  }}
                >
                  💧 {ability.cost.mana} Mana
                </span>
              )}
              {ability.cost.tap && (
                <span
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    background: 'rgba(168, 159, 148, 0.2)',
                    color: '#a89f94',
                    border: '1px solid rgba(168, 159, 148, 0.4)'
                  }}
                >
                  ↩️ Tap
                </span>
              )}
              {ability.cost.discard && (
                <span
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)'
                  }}
                >
                  🗑️ Discard {ability.cost.discard}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Effects timeline */}
        {showEffects && ability.effects.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[#d4af37]" style={{ fontFamily: 'Cinzel, serif' }}>
              Effect Execution
            </h4>
            <div className="space-y-2">
              {ability.effects.map((effect, idx) => (
                <div
                  key={effect.id}
                  className={clsx(
                    'relative p-3 rounded transition-all duration-300',
                    activeEffectIndex === idx && 'ring-2 ring-[#22c55e] scale-[1.02]'
                  )}
                  style={{
                    background: activeEffectIndex === idx
                      ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.2) 0%, rgba(0,0,0,0.3) 100%)'
                      : 'rgba(0,0,0,0.3)',
                    border: '1px solid #3d2b25'
                  }}
                >
                  {/* Step number */}
                  <div
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: activeEffectIndex === idx
                        ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)'
                        : '#3d2b25',
                      color: activeEffectIndex === idx ? '#0f0c0a' : '#a89f94'
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div className="ml-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#e8e0d5] capitalize">
                        {effect.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-[#6b5b4f]">→</span>
                      <span className="text-sm text-[#a89f94]">{effect.target}</span>
                      {effect.value !== undefined && (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            background: 'rgba(212, 175, 55, 0.2)',
                            color: '#d4af37'
                          }}
                        >
                          {effect.value > 0 ? `+${effect.value}` : effect.value}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6b5b4f]">{effect.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JSON format (collapsible) */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-[#5c4033] hover:text-[#d4af37] transition-colors">
            View JSON Format
          </summary>
          <div className="mt-2 p-3 rounded bg-[#0f0c0a] border border-[#3d2b25] overflow-x-auto">
            <pre className="text-xs text-[#a89f94] font-mono">
              {JSON.stringify(ability, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}

function formatTriggerName(trigger: string) {
  return trigger
    .replace(/^on_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTriggerDescription(trigger: string) {
  const descriptions: Record<string, string> = {
    on_attack: 'When this creature declares an attack',
    on_damage_dealt: 'When this creature deals damage',
    on_death: 'When this creature is destroyed',
    on_enter: 'When this creature enters the battlefield',
    on_spell_cast: 'When a spell is cast',
    on_turn_start: 'At the start of your turn',
    on_turn_end: 'At the end of your turn',
    on_heal: 'When a creature is healed',
    on_discard: 'When a card is discarded'
  };
  return descriptions[trigger] || 'When the condition is met';
}

export default AbilityShowcase;
