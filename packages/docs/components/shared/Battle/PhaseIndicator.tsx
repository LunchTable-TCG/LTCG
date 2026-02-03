/**
 * PhaseIndicator Component
 * Shows the current phase of battle
 */

'use client';

export type BattlePhase = 'draw' | 'main' | 'attack' | 'defense' | 'resolution' | 'end';

interface PhaseIndicatorProps {
  currentPhase: BattlePhase;
  availablePhases?: BattlePhase[];
  compact?: boolean;
}

export function PhaseIndicator({
  currentPhase,
  availablePhases = ['draw', 'main', 'attack', 'defense', 'resolution', 'end'],
  compact = false
}: PhaseIndicatorProps) {
  const phaseConfig: Record<BattlePhase, { icon: string; label: string; color: string }> = {
    draw: { icon: '🎴', label: 'Draw', color: 'blue' },
    main: { icon: '⚙️', label: 'Main', color: 'gray' },
    attack: { icon: '⚔️', label: 'Attack', color: 'red' },
    defense: { icon: '🛡️', label: 'Defense', color: 'green' },
    resolution: { icon: '✨', label: 'Resolution', color: 'purple' },
    end: { icon: '🏁', label: 'End', color: 'gray' }
  };

  const getPhaseColorClasses = (phase: BattlePhase, isActive: boolean) => {
    const config = phaseConfig[phase];
    const colorMap: Record<string, { active: string; inactive: string }> = {
      blue: {
        active: 'bg-blue-600 text-white border-blue-700',
        inactive: 'bg-blue-100 text-blue-700 border-blue-300'
      },
      red: {
        active: 'bg-red-600 text-white border-red-700',
        inactive: 'bg-red-100 text-red-700 border-red-300'
      },
      green: {
        active: 'bg-green-600 text-white border-green-700',
        inactive: 'bg-green-100 text-green-700 border-green-300'
      },
      purple: {
        active: 'bg-purple-600 text-white border-purple-700',
        inactive: 'bg-purple-100 text-purple-700 border-purple-300'
      },
      gray: {
        active: 'bg-gray-700 text-white border-gray-800',
        inactive: 'bg-gray-100 text-gray-700 border-gray-300'
      }
    };

    return isActive ? colorMap[config.color].active : colorMap[config.color].inactive;
  };

  if (compact) {
    const config = phaseConfig[currentPhase];
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 font-semibold text-sm ${getPhaseColorClasses(currentPhase, true)}`}>
        <span className="text-lg">{config.icon}</span>
        <span>{config.label} Phase</span>
      </div>
    );
  }

  return (
    <div className="phase-indicator bg-white border rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Battle Phase:</h4>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {availablePhases.map(phase => {
          const config = phaseConfig[phase];
          const isActive = phase === currentPhase;

          return (
            <div
              key={phase}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all duration-300
                ${getPhaseColorClasses(phase, isActive)}
                ${isActive ? 'shadow-lg scale-105' : 'opacity-60'}
              `}
            >
              <span className={`text-2xl ${isActive ? '' : 'grayscale'}`}>
                {config.icon}
              </span>
              <span className="text-xs font-semibold">
                {config.label}
              </span>
              {isActive && (
                <div className="mt-1">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
