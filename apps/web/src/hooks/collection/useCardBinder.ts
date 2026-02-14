"use client";

import { handleHookError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useAuth } from "../auth/useConvexAuthHook";

interface UseCardBinderReturn {
  userCards: ReturnType<typeof useQuery<typeof api.core.cards.getUserCards>> | undefined;
  favoriteCards: ReturnType<typeof useQuery<typeof api.core.cards.getUserFavoriteCards>> | undefined;
  collectionStats: ReturnType<typeof useQuery<typeof api.core.cards.getUserCollectionStats>> | undefined;
  isLoading: boolean;
  toggleFavorite: (playerCardId: Id<"playerCards">) => Promise<void>;
}

/**
 * Card collection viewer and management (the "binder").
 *
 * Provides access to the player's complete card collection with filtering,
 * favorites, and collection statistics. Displays all owned cards with
 * quantities and allows marking favorites for quick access.
 *
 * Features:
 * - View all owned cards with quantities
 * - Toggle favorite status on cards
 * - View collection statistics (total cards, completion %)
 * - Filter by favorites
 * - Silent favorite toggle (no toast notification)
 *
 * @example
 * ```typescript
 * const {
 *   userCards,
 *   favoriteCards,
 *   collectionStats,
 *   toggleFavorite
 * } = useCardBinder();
 *
 * // Display collection
 * userCards?.forEach(card => {
 *   console.log(`${card.name} x${card.quantity}`);
 * });
 *
 * // Toggle favorite
 * await toggleFavorite(playerCardId);
 *
 * // Show stats
 * console.log(`Collection: ${collectionStats?.totalCards} cards`);
 * console.log(`Completion: ${collectionStats?.completionPercent}%`);
 * ```
 *
 * @returns {UseCardBinderReturn} Card binder interface
 *
 * @throws {Error} When user is not authenticated
 */
export function useCardBinder(): UseCardBinderReturn {
  const { isAuthenticated } = useAuth();

  // Queries
  const userCards = useQuery(api.core.cards.getUserCards, isAuthenticated ? {} : "skip");

  const favoriteCards = useQuery(api.core.cards.getUserFavoriteCards, isAuthenticated ? {} : "skip");

  const collectionStats = useQuery(api.core.cards.getUserCollectionStats, isAuthenticated ? {} : "skip");

  // Mutation
  const toggleFavoriteMutation = useMutation(api.core.cards.toggleFavorite);

  const toggleFavorite = async (playerCardId: Id<"playerCards">) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      await toggleFavoriteMutation({ playerCardId });
      // Don't show toast for favorite toggle (too noisy)
    } catch (error) {
      const message = handleHookError(error, "Failed to toggle favorite");
      toast.error(message);
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
