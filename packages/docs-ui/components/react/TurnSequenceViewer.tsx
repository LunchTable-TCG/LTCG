/**
 * TurnSequenceViewer Component
 * Phase-by-phase turn walkthrough for documentation
 * Use as a React island in Astro: <TurnSequenceViewer client:load />
 */

'use client';

import { useState } from 'react';
import { clsx } from 'clsx';

export type TurnPhase = 'draw' | 'main1' | 'battle' | 'main2' | 'end';

export interface PhaseDetail {
  phase: TurnPhase;
  title: string;
  description: string;
  allowedActions: string[];
  tips?: string[];
  example?: string;
}

interface TurnSequenceViewerProps {
  phases?: PhaseDetail[];
  className?: string;
}

const defaultPhases: PhaseDetail[] = [
  {
    phase: 'draw',
    title: 'Draw Phase',
    description: 'Draw one card from your deck. The first player skips this on turn 1.',
    allowedActions: [
      'Draw 1 card from deck',
      'Trigger start-of-turn abilities'
    ],
    tips: [
      'Pay attention to what you draw - it may change your strategy',
      'Some cards trigger effects during the draw phase'
    ],
    example: 'You draw "Flame Serpent" and add it to your hand.'
  },
  {
    phase: 'main1',
    title: 'Main Phase 1',
    description: 'Your first opportunity to play cards and set up your board.',
    allowedActions: [
      'Summon creatures (costs mana)',
      'Cast spell cards',
      'Set trap cards face-down',
      'Activate creature abilities',
      'Use items and equipment'
    ],
    tips: [
      'Set traps before attacking to protect yourself from counters',
      'Consider your mana carefully - don\'t overspend early',
      'Position your creatures strategically'
    ],
    example: 'You summon "Fire Drake" (3 mana) and set "Counter Trap" face-down.'
  },
  {
    phase: 'battle',
    title: 'Battle Phase',
    description: 'Declare attacks with your creatures. Combat is resolved immediately.',
    allowedActions: [
      'Declare attackers (tap creatures)',
      'Choose attack targets (creature or player)',
      'Activate combat-related abilities',
      'Respond to attacks with traps'
    ],
    tips: [
      'Creatures cannot attack the turn they are summoned (summoning sickness)',
      'Tapped creatures cannot block or use tap abilities',
      'Watch for trap cards when attacking'
    ],
    example: 'Your Fire Drake (ATK 1500) attacks the opponent\'s Stone Golem (ATK 1200). Stone Golem is destroyed.'
  },
  {
    phase: 'main2',
    title: 'Main Phase 2',
    description: 'Second opportunity to play cards after combat.',
    allowedActions: [
      'Summon additional creatures',
      'Cast spells',
      'Set more traps',
      'Activate abilities'
    ],
    tips: [
      'Good for playing cards you drew during the turn',
      'Set up defenses for your opponent\'s turn',
      'Use remaining mana before it\'s lost'
    ],
    example: 'You summon "Healing Spirit" to restore your wounded creature.'
  },
  {
    phase: 'end',
    title: 'End Phase',
    description: 'Cleanup and prepare for opponent\'s turn.',
    allowedActions: [
      'Discard down to 7 cards if over hand limit',
      'End-of-turn effects trigger',
      'Untap all your creatures'
    ],
    tips: [
      'Choose discards wisely - some cards have discard effects',
      'Remember end-of-turn triggers like poison damage',
      'Your opponent\'s turn begins after this'
    ],
    example: 'You have 8 cards, so you discard "Weak Goblin" to reach the hand limit of 7.'
  }
];

const phaseColors: Record<TurnPhase, string> = {
  draw: '#06b6d4',
  main1: '#22c55e',
  battle: '#ff6b35',
  main2: '#22c55e',
  end: '#a89f94'
};

const phaseIcons: Record<TurnPhase, string> = {
  draw: '📜',
  main1: '⚡',
  battle: '⚔️',
  main2: '🔧',
  end: '🌙'
};

export function TurnSequenceViewer({
  phases = defaultPhases,
  className
}: TurnSequenceViewerProps) {
  const [activePhase, setActivePhase] = useState<TurnPhase>('draw');
  const currentPhase = phases.find((p) => p.phase === activePhase);

  return (
    <div
      className={clsx(
        'turn-sequence-viewer rounded-lg overflow-hidden my-6',
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
        <h3
          className="text-xl font-bold text-[#e8e0d5]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Turn Structure
        </h3>
        <p className="text-sm text-[#a89f94]">
          Click each phase to learn what actions are available
        </p>
      </div>

      {/* Phase timeline */}
      <div className="p-4 border-b border-[#3d2b25]">
        <div className="flex items-center justify-between">
          {phases.map((phase, idx) => {
            const isActive = phase.phase === activePhase;
            const color = phaseColors[phase.phase];
            const isLast = idx === phases.length - 1;

            return (
              <div key={phase.phase} className="flex items-center flex-1">
                <button
                  onClick={() => setActivePhase(phase.phase)}
                  className={clsx(
                    'relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all',
                    isActive && 'scale-110'
                  )}
                  style={{
                    background: isActive ? `${color}20` : 'transparent',
                    border: `2px solid ${isActive ? color : 'transparent'}`
                  }}
                >
                  {/* Phase icon */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                    style={{
                      background: isActive
                        ? `linear-gradient(180deg, ${color} 0%, ${color}80 100%)`
                        : '#261f1c',
                      boxShadow: isActive ? `0 0 20px ${color}40` : 'none'
                    }}
                  >
                    {phaseIcons[phase.phase]}
                  </div>

                  {/* Phase name */}
                  <span
                    className={clsx(
                      'text-xs font-semibold uppercase tracking-wider',
                      isActive ? 'text-[#e8e0d5]' : 'text-[#6b5b4f]'
                    )}
                  >
                    {phase.phase === 'main1' ? 'Main 1' :
                     phase.phase === 'main2' ? 'Main 2' :
                     phase.phase.charAt(0).toUpperCase() + phase.phase.slice(1)}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                      style={{ background: color }}
                    />
                  )}
                </button>

                {/* Connector arrow */}
                {!isLast && (
                  <div className="flex-1 flex items-center justify-center">
                    <div
                      className="h-0.5 w-full"
                      style={{
                        background: `linear-gradient(90deg, ${phaseColors[phases[idx].phase]}40 0%, ${phaseColors[phases[idx + 1].phase]}40 100%)`
                      }}
                    />
                    <span className="text-[#3d2b25] mx-1">→</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase details */}
      {currentPhase && (
        <div className="p-4">
          {/* Title and description */}
          <div className="mb-4">
            <h4
              className="text-lg font-bold mb-2"
              style={{
                color: phaseColors[currentPhase.phase],
                fontFamily: 'Cinzel, serif'
              }}
            >
              {phaseIcons[currentPhase.phase]} {currentPhase.title}
            </h4>
            <p className="text-sm text-[#a89f94]">{currentPhase.description}</p>
          </div>

          {/* Allowed actions */}
          <div className="mb-4">
            <h5 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider mb-2">
              Allowed Actions
            </h5>
            <ul className="space-y-1">
              {currentPhase.allowedActions.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-sm text-[#e8e0d5]"
                >
                  <span style={{ color: phaseColors[currentPhase.phase] }}>✓</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          {currentPhase.tips && currentPhase.tips.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider mb-2">
                Tips
              </h5>
              <div
                className="p-3 rounded-lg"
                style={{
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.3)'
                }}
              >
                <ul className="space-y-2">
                  {currentPhase.tips.map((tip, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-[#a89f94]"
                    >
                      <span className="text-[#d4af37]">💡</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Example */}
          {currentPhase.example && (
            <div>
              <h5 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider mb-2">
                Example
              </h5>
              <div
                className="p-3 rounded-lg"
                style={{
                  background: `${phaseColors[currentPhase.phase]}10`,
                  border: `1px solid ${phaseColors[currentPhase.phase]}30`
                }}
              >
                <p className="text-sm italic text-[#e8e0d5]">
                  "{currentPhase.example}"
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick reference footer */}
      <div
        className="p-4"
        style={{
          background: 'rgba(0,0,0,0.3)',
          borderTop: '1px solid #3d2b25'
        }}
      >
        <p className="text-xs text-center text-[#6b5b4f]">
          Turn flow: <span className="text-[#06b6d4]">Draw</span> →{' '}
          <span className="text-[#22c55e]">Main 1</span> →{' '}
          <span className="text-[#ff6b35]">Battle</span> →{' '}
          <span className="text-[#22c55e]">Main 2</span> →{' '}
          <span className="text-[#a89f94]">End</span>
        </p>
      </div>
    </div>
  );
}

export default TurnSequenceViewer;
