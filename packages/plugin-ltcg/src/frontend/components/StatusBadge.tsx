/**
 * Status badge component for displaying agent/matchmaking status
 */

import React from 'react';
import { cn } from '../utils';

export type StatusVariant = 'active' | 'idle' | 'error' | 'scanning' | 'in_game' | 'joining';

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  className?: string;
}

/**
 * Get badge styling based on status variant
 */
function getVariantStyles(variant: StatusVariant): string {
  switch (variant) {
    case 'active':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'scanning':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'in_game':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'joining':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'idle':
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    case 'error':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

/**
 * Status badge component with animated pulse for active states
 */
export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const isActive = variant === 'active' || variant === 'scanning' || variant === 'in_game';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium',
        getVariantStyles(variant),
        className
      )}
    >
      {isActive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {label}
    </span>
  );
}
