/**
 * Profile Component Types
 * Type definitions for player profile components
 */

import type { Element, Rarity } from "@/types/cards";
import type { PlayerStatus } from "@/types/common";

export type DetailType = "badge" | "achievement" | "card";

export interface DetailItem {
  type: DetailType;
  id: string;
  name: string;
  description: string;
  icon?: string;
  element?: Element;
  rarity?: Rarity;
  earnedAt?: number;
  progress?: number;
  maxProgress?: number;
  // Card specific
  attack?: number;
  defense?: number;
  cost?: number;
  ability?: string;
  flavorText?: string;
  timesPlayed?: number;
}

export interface PlayerProfile {
  id: string;
  username: string;
  rank: {
    casual: { tier: string; division: number };
    ranked: { tier: string; division: number; lp: number };
  };
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    winStreak: number;
    longestWinStreak: number;
  };
  socials: {
    twitter?: string;
    discord?: string;
    twitch?: string;
  };
  agents: Array<{
    id: string;
    name: string;
    avatar: string;
    wins: number;
    losses: number;
    personality: string;
  }>;
  mostPlayedCard: {
    id: string;
    name: string;
    element: Element;
    timesPlayed: number;
  };
  callingCard: {
    id: string;
    name: string;
    element: Element;
    rarity: Rarity;
  } | null;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: number;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    progress?: number;
    maxProgress?: number;
  }>;
  joinedAt: number;
  status: PlayerStatus;
  streamerModeEnabled?: boolean;
}
