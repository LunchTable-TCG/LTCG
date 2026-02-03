/**
 * AbilityShowcase Component
 * Interactive ability display for documentation with trigger visualization and effect timeline
 */

'use client';

import { useState } from 'react';
import { getCardData, type Ability } from '../../../lib/cardData';
import { TriggerVisualizer, type TriggerCondition } from './TriggerVisualizer';
import { EffectTimeline } from './EffectTimeline';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';

interface AbilityShowcaseProps {
  abilityId: string;
  showTrigger?: boolean;
  showEffect?: boolean;
  animated?: boolean;
  example?: {
    attacker: string;
    defender: string;
    boardState?: any;
  };
}

export function AbilityShowcase({
  abilityId,
  showTrigger = true,
  showEffect = true,
  animated = true,
  example
}: AbilityShowcaseProps) {
  const [isTriggered, setIsTriggered] = useState(false);

  // Find the ability from card data
  const ability = findAbility(abilityId);

  if (!ability) {
    return (
      <div className="ability-showcase-error border-2 border-red-500 rounded-lg p-4">
        <p className="text-red-600 font-semibold">Ability not found: {abilityId}</p>
        <p className="text-sm text-gray-600">This ability may not exist or is not yet documented.</p>
      </div>
    );
  }

  const handleTriggerDemo = () => {
    setIsTriggered(true);
    setTimeout(() => setIsTriggered(false), 1500);
  };

  const abilityTypeColors: Record<string, string> = {
    triggered: 'bg-orange-100 text-orange-800 border-orange-300',
    activated: 'bg-blue-100 text-blue-800 border-blue-300',
    continuous: 'bg-green-100 text-green-800 border-green-300',
    static: 'bg-purple-100 text-purple-800 border-purple-300'
  };

  return (
    <div className="ability-showcase border rounded-lg overflow-hidden shadow-lg my-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">{ability.name}</h3>
            <p className="text-gray-300 text-sm">{ability.description}</p>
          </div>
          <span
            className={`
              px-3 py-1 rounded-full text-xs font-semibold border
              ${abilityTypeColors[ability.type] || 'bg-gray-100 text-gray-800 border-gray-300'}
            `}
          >
            {ability.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white p-4 space-y-4">
        {/* Trigger Condition */}
        {showTrigger && ability.trigger && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">Trigger Condition:</h4>
              <button
                onClick={handleTriggerDemo}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Demo Trigger
              </button>
            </div>
            <TriggerVisualizer
              trigger={convertTriggerToCondition(ability.trigger, ability.description)}
              isActive={isTriggered}
            />
          </div>
        )}

        {/* Effect Timeline */}
        {showEffect && ability.effects && ability.effects.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Effect Execution:</h4>
            <EffectTimeline
              effects={ability.effects}
              animated={animated}
              speed={1200}
            />
          </div>
        )}

        {/* Battle Example */}
        {example && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Example Scenario:</h4>
            <div className="bg-gray-100 rounded-lg p-4 border">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Attacker:</p>
                  <p className="text-sm text-gray-800">{example.attacker}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Defender:</p>
                  <p className="text-sm text-gray-800">{example.defender}</p>
                </div>
              </div>
              {example.boardState && (
                <div className="text-xs text-gray-600 border-t pt-2">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(example.boardState, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* JSON Format (Collapsible) */}
        <Accordions type="single" collapsible>
          <Accordion title="View JSON Format" id="json-format">
            <div className="bg-gray-900 rounded p-4 overflow-x-auto">
              <pre className="text-xs text-gray-100">
                {JSON.stringify(ability, null, 2)}
              </pre>
            </div>
          </Accordion>
        </Accordions>
      </div>
    </div>
  );
}

// Helper functions

function findAbility(abilityId: string): Ability | null {
  // Search through all cards to find the ability
  const allCards = [
    getCardData('fire-drake-001'),
    getCardData('healing-spell-012'),
    getCardData('poison-serpent-045')
  ].filter(Boolean);

  for (const card of allCards) {
    if (!card) continue;
    const ability = card.abilities.find(a => a.id === abilityId);
    if (ability) return ability;
  }

  return null;
}

function convertTriggerToCondition(trigger: string, description: string): TriggerCondition {
  const triggerMap: Record<string, TriggerCondition['type']> = {
    on_attack: 'on_attack',
    on_damage_dealt: 'on_damage_dealt',
    on_death: 'on_death',
    on_enter: 'on_enter',
    on_spell_cast: 'on_spell_cast'
  };

  return {
    type: triggerMap[trigger] || 'continuous',
    description,
    requirements: []
  };
}
