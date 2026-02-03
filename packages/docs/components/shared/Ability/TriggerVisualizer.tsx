/**
 * TriggerVisualizer Component
 * Shows when and how abilities trigger in the game
 */

'use client';

import { useState, useEffect } from 'react';

export interface TriggerCondition {
  type: 'on_attack' | 'on_damage_dealt' | 'on_death' | 'on_enter' | 'on_spell_cast' | 'continuous';
  description: string;
  requirements?: string[];
}

interface TriggerVisualizerProps {
  trigger: TriggerCondition;
  isActive?: boolean;
  showIcon?: boolean;
}

export function TriggerVisualizer({
  trigger,
  isActive = false,
  showIcon = true
}: TriggerVisualizerProps) {
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    setHighlighted(true);
    const timer = setTimeout(() => setHighlighted(false), 1000);
    return () => clearTimeout(timer);
  }, [isActive]);

  const triggerIcons: Record<string, string> = {
    on_attack: '⚔️',
    on_damage_dealt: '💥',
    on_death: '💀',
    on_enter: '🚪',
    on_spell_cast: '✨',
    continuous: '🔄'
  };

  const triggerColors: Record<string, string> = {
    on_attack: 'border-red-500 bg-red-50',
    on_damage_dealt: 'border-orange-500 bg-orange-50',
    on_death: 'border-purple-500 bg-purple-50',
    on_enter: 'border-blue-500 bg-blue-50',
    on_spell_cast: 'border-cyan-500 bg-cyan-50',
    continuous: 'border-green-500 bg-green-50'
  };

  return (
    <div
      className={`
        trigger-visualizer border-l-4 rounded-r p-3 transition-all duration-300
        ${triggerColors[trigger.type] || 'border-gray-500 bg-gray-50'}
        ${highlighted ? 'shadow-lg scale-105' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <span className="text-2xl flex-shrink-0">
            {triggerIcons[trigger.type] || '❓'}
          </span>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              {trigger.type.replace(/_/g, ' ')}
            </span>
            {isActive && (
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                TRIGGERED
              </span>
            )}
          </div>

          <p className="text-sm text-gray-700 mb-2">
            {trigger.description}
          </p>

          {trigger.requirements && trigger.requirements.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-600">Requirements:</p>
              <ul className="space-y-0.5">
                {trigger.requirements.map((req, idx) => (
                  <li key={idx} className="text-xs text-gray-600 pl-3 relative">
                    <span className="absolute left-0">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
