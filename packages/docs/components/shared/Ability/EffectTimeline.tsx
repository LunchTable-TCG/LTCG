/**
 * EffectTimeline Component
 * Animates ability effects step-by-step
 */

'use client';

import { useState, useEffect } from 'react';
import type { Effect } from '../../../lib/cardData';

interface EffectTimelineProps {
  effects: Effect[];
  animated?: boolean;
  speed?: number; // milliseconds per step
  autoPlay?: boolean;
}

export function EffectTimeline({
  effects,
  animated = true,
  speed = 1000,
  autoPlay = false
}: EffectTimelineProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (!animated || !isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= effects.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [animated, isPlaying, effects.length, speed]);

  const handleReset = () => {
    setCurrentStep(-1);
    setIsPlaying(false);
  };

  const handlePlay = () => {
    if (currentStep >= effects.length - 1) {
      setCurrentStep(-1);
    }
    setIsPlaying(true);
  };

  const effectIcons: Record<string, string> = {
    damage: '💥',
    heal: '💚',
    buff: '⬆️',
    debuff: '⬇️',
    draw: '🎴',
    discard: '🗑️',
    summon: '✨',
    destroy: '💀',
    status_effect: '🔮',
    modify_stats: '📊'
  };

  const getEffectDescription = (effect: Effect) => {
    switch (effect.type) {
      case 'damage':
        return `Deal ${effect.value} damage to ${effect.target || 'target'}`;
      case 'heal':
        return `Restore ${effect.value} health to ${effect.target || 'target'}`;
      case 'buff':
        return `Increase stats by ${effect.value} for ${effect.duration || 'permanent'}`;
      case 'debuff':
        return `Decrease stats by ${effect.value} for ${effect.duration || 'permanent'}`;
      case 'status_effect':
        return `Apply status effect (${effect.value} per turn) for ${effect.duration} turns`;
      case 'draw':
        return `Draw ${effect.value || 1} card${effect.value !== 1 ? 's' : ''}`;
      default:
        return effect.type;
    }
  };

  return (
    <div className="effect-timeline border rounded-lg p-4 bg-white">
      {/* Controls */}
      {animated && (
        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
          <button
            onClick={handlePlay}
            disabled={isPlaying}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {currentStep >= effects.length - 1 ? 'Replay' : 'Play'}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700"
          >
            Reset
          </button>
          <div className="ml-auto text-sm text-gray-600">
            Step {currentStep + 1} of {effects.length}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {effects.map((effect, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          const isPending = idx > currentStep;

          return (
            <div
              key={idx}
              className={`
                effect-step flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-300
                ${isActive ? 'border-blue-500 bg-blue-50 shadow-md' : ''}
                ${isCompleted ? 'border-green-500 bg-green-50 opacity-70' : ''}
                ${isPending ? 'border-gray-300 bg-gray-50 opacity-50' : ''}
              `}
            >
              {/* Step number & icon */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${isActive ? 'bg-blue-600 text-white' : ''}
                    ${isCompleted ? 'bg-green-600 text-white' : ''}
                    ${isPending ? 'bg-gray-300 text-gray-600' : ''}
                  `}
                >
                  {idx + 1}
                </div>
                <span className="text-xl">
                  {effectIcons[effect.type] || '❓'}
                </span>
              </div>

              {/* Effect details */}
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800 capitalize mb-1">
                  {effect.type.replace(/_/g, ' ')}
                </div>
                <p className="text-sm text-gray-700">
                  {getEffectDescription(effect)}
                </p>
                {effect.duration && (
                  <p className="text-xs text-gray-500 mt-1">
                    Duration: {effect.duration} turn{effect.duration !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Status indicator */}
              {isActive && (
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-medium">
                  ACTIVE
                </span>
              )}
              {isCompleted && (
                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-medium">
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion message */}
      {currentStep >= effects.length - 1 && currentStep !== -1 && (
        <div className="mt-4 p-3 bg-green-100 border border-green-500 rounded text-sm text-green-800 text-center font-medium">
          All effects resolved!
        </div>
      )}
    </div>
  );
}
