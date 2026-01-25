"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

/**
 * useCardBinder Hook
 *
 * Card collection management:
 * - View all user cards
 * - Favorite cards
 * - Collection statistics
 */
export function useCardBinder() {
  const { token } = useAuth();

  // Queries
  const userCards = useQuery(
    api.cards.getUserCards,
    token ? { token } : "skip"
  );

  const favoriteCards = useQuery(
    api.cards.getUserFavoriteCards,
    token ? { token } : "skip"
  );

  const collectionStats = useQuery(
    api.cards.getUserCollectionStats,
    token ? { token } : "skip"
  );

  // Mutation
  const toggleFavoriteMutation = useMutation(api.cards.toggleFavorite);

  const toggleFavorite = async (playerCardId: Id<"playerCards">) => {
    if (!token) throw new Error("Not authenticated");
    try {
      await toggleFavoriteMutation({ token, playerCardId });
      // Don't show toast for favorite toggle (too noisy)
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle favorite");
      throw error;
    }
  };

  return {
    userCards,
    favoriteCards,
    collectionStats,
    isLoading: userCards === undefined,
    toggleFavorite,
  };
}
