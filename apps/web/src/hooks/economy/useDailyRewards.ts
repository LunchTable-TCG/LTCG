"use client";

import { handleHookError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useAuth } from "../auth/useConvexAuthHook";

interface CardResult {
  cardDefinitionId: string;
  name: string;
  rarity: string;
  variant: string;
  serialNumber?: number;
}

interface DailyPackResult {
  success: boolean;
  cardsReceived: CardResult[];
}

interface LoginStreakResult {
  success: boolean;
  goldReceived: number;
  currentStreak: number;
}

interface WeeklyJackpotResult {
  success: boolean;
  won: boolean;
  variant?: string;
  card?: CardResult;
}

interface UseDailyRewardsReturn {
  status:
    | {
        dailyPack: {
          canClaim: boolean;
          cardCount: number;
          nextResetAt: number;
        };
        loginStreak: {
          canClaim: boolean;
          currentStreak: number;
          nextStreak: number;
          goldReward: number;
          nextResetAt: number;
        };
        weeklyJackpot: {
          canClaim: boolean;
          chances: {
            foil: string;
            altArt: string;
            fullArt: string;
            numbered: string;
          };
          nextResetAt: number;
        };
      }
    | undefined;
  rewardHistory: ReturnType<typeof useQuery<typeof api.economy.getRewardHistory>> | undefined;
  isLoading: boolean;
  claimDailyPack: () => Promise<DailyPackResult>;
  claimLoginStreak: () => Promise<LoginStreakResult>;
  claimWeeklyJackpot: () => Promise<WeeklyJackpotResult>;
}

/**
 * Daily and weekly rewards system for F2P players.
 *
 * Provides access to free daily packs, login streak bonuses, and weekly jackpot.
 * F2P players have a small chance at valuable variants through these systems.
 *
 * Features:
 * - Daily free pack (3 cards with low variant rates)
 * - Login streak rewards (gold based on consecutive days, max 7)
 * - Weekly jackpot (small chance at rare variants)
 * - Reward history
 *
 * @example
 * ```typescript
 * const {
 *   status,
 *   claimDailyPack,
 *   claimLoginStreak,
 *   claimWeeklyJackpot
 * } = useDailyRewards();
 *
 * // Claim daily pack
 * if (status?.dailyPack.canClaim) {
 *   const result = await claimDailyPack();
 *   console.log(`Got ${result.cardsReceived.length} cards!`);
 * }
 *
 * // Claim login streak
 * if (status?.loginStreak.canClaim) {
 *   const result = await claimLoginStreak();
 *   console.log(`Day ${result.currentStreak}: ${result.goldReceived} gold`);
 * }
 *
 * // Try weekly jackpot
 * if (status?.weeklyJackpot.canClaim) {
 *   const result = await claimWeeklyJackpot();
 *   if (result.won) {
 *     console.log(`Won a ${result.variant} variant!`);
 *   }
 * }
 * ```
 *
 * @returns {UseDailyRewardsReturn} Daily rewards interface
 */
export function useDailyRewards(): UseDailyRewardsReturn {
  const { isAuthenticated } = useAuth();

  // Queries
  const status = useQuery(api.economy.getDailyRewardStatus, isAuthenticated ? {} : "skip");
  const rewardHistory = useQuery(api.economy.getRewardHistory, isAuthenticated ? {} : "skip");

  // Mutations
  const claimDailyPackMutation = useMutation(api.economy.claimDailyPack);
  const claimLoginStreakMutation = useMutation(api.economy.claimLoginStreak);
  const claimWeeklyJackpotMutation = useMutation(api.economy.claimWeeklyJackpot);

  // Actions
  const claimDailyPack = async () => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      const result = await claimDailyPackMutation({});
      toast.success(`Daily pack claimed! You got ${result.cardsReceived.length} cards`);
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to claim daily pack");
      toast.error(message);
      throw error;
    }
  };

  const claimLoginStreak = async () => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      const result = await claimLoginStreakMutation({});
      toast.success(`Day ${result.currentStreak} bonus: ${result.goldReceived} gold!`);
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to claim login streak");
      toast.error(message);
      throw error;
    }
  };

  const claimWeeklyJackpot = async () => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      const result = await claimWeeklyJackpotMutation({});
      if (result.won && result.card) {
        toast.success(`🎉 Jackpot! You won a ${result.variant} ${result.card.name}!`);
      } else {
        toast.info("Better luck next week! Try again Sunday.");
      }
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to claim weekly jackpot");
      toast.error(message);
      throw error;
    }
  };

  return {
    status,
    rewardHistory,
    isLoading: status === undefined,
    claimDailyPack,
    claimLoginStreak,
    claimWeeklyJackpot,
  };
}
