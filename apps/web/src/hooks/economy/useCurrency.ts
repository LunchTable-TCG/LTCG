"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";

/**
 * useCurrency Hook
 *
 * Manages player currency (gold and gems):
 * - Get current balance
 * - View transaction history
 */
export function useCurrency() {
  const { token } = useAuth();

  // Queries
  const balance = useQuery(
    api.economy.getPlayerBalance,
    token ? { token } : "skip"
  );

  const transactions = useQuery(
    api.economy.getTransactionHistory,
    token ? { token } : "skip"
  );

  return {
    balance,
    transactions,
    isLoading: balance === undefined,
    gold: balance?.gold || 0,
    gems: balance?.gems || 0,
  };
}
