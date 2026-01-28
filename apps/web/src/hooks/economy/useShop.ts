"use client";

import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { handleHookError } from "@/lib/errorHandling";
import { useAuth } from "../auth/useConvexAuthHook";

interface CardResult {
  cardDefinitionId: string;
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  archetype: string;
  imageUrl?: string;
}

interface PackPurchaseResult {
  success: boolean;
  productName: string;
  cardsReceived: CardResult[];
  currencyUsed: "gold" | "gems";
  amountPaid: number;
}

interface BoxPurchaseResult {
  success: boolean;
  productName: string;
  packsOpened: number;
  bonusCards: number;
  cardsReceived: CardResult[];
  currencyUsed: "gold" | "gems";
  amountPaid: number;
}

interface CurrencyBundleResult {
  success: boolean;
  productName: string;
  gemsSpent: number;
  goldReceived: number;
}

interface UseShopReturn {
  products: ReturnType<typeof useQuery<typeof api.shop.getShopProducts>> | undefined;
  packHistory: ReturnType<typeof useQuery<typeof api.shop.getPackOpeningHistory>> | undefined;
  isLoading: boolean;
  purchasePack: (productId: string, useGems: boolean) => Promise<PackPurchaseResult>;
  purchaseBox: (productId: string, useGems: boolean) => Promise<BoxPurchaseResult>;
  purchaseBundle: (productId: string) => Promise<CurrencyBundleResult>;
}

/**
 * In-game shop for purchasing card packs, boxes, and currency bundles.
 *
 * Provides access to all shop products and purchase functionality. Supports
 * both gold and gem purchases. Shows pack opening results and maintains
 * purchase history. All purchases show toast notifications with results.
 *
 * Features:
 * - View all shop products (packs, boxes, bundles)
 * - Purchase single packs (gold or gems)
 * - Purchase boxes (multiple packs at once)
 * - Purchase currency bundles (gems for gold)
 * - View pack opening history
 * - Real-time product availability
 *
 * @example
 * ```typescript
 * const {
 *   products,
 *   packHistory,
 *   purchasePack,
 *   purchaseBox
 * } = useShop();
 *
 * // Purchase a pack with gold
 * const result = await purchasePack("pack_starter", false);
 * console.log(`Got ${result.cardsReceived.length} cards!`);
 *
 * // Purchase a pack with gems
 * await purchasePack("pack_premium", true);
 *
 * // Purchase a box (multiple packs)
 * const boxResult = await purchaseBox("box_mega", false);
 * console.log(`Opened ${boxResult.packsOpened} packs`);
 * ```
 *
 * @returns {UseShopReturn} Shop interface
 *
 * @throws {Error} When user is not authenticated or insufficient funds
 */
export function useShop(): UseShopReturn {
  const { isAuthenticated } = useAuth();

  // Queries
  const products = useQuery(api.shop.getShopProducts, {});

  const packHistory = useQuery(api.shop.getPackOpeningHistory, isAuthenticated ? {} : "skip");

  // Mutations
  const purchasePackMutation = useMutation(api.shop.purchasePack);
  const purchaseBoxMutation = useMutation(api.shop.purchaseBox);
  const purchaseBundleMutation = useMutation(api.shop.purchaseCurrencyBundle);

  // Actions
  const purchasePack = async (productId: string, useGems: boolean) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      const result = await purchasePackMutation({
        productId,
        useGems,
      });
      toast.success(`Pack purchased! You got ${result.cardsReceived.length} cards`);
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to purchase pack");
      toast.error(message);
      throw error;
    }
  };

  const purchaseBox = async (productId: string, useGems: boolean) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      const result = await purchaseBoxMutation({
        productId,
        useGems,
      });
      toast.success(`Box purchased! Opening ${result.packsOpened} packs...`);
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to purchase box");
      toast.error(message);
      throw error;
    }
  };

  const purchaseBundle = async (productId: string) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      const result = await purchaseBundleMutation({ productId });
      toast.success(`Bundle purchased! You got ${result.goldReceived} gold`);
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to purchase bundle");
      toast.error(message);
      throw error;
    }
  };

  return {
    products,
    packHistory,
    isLoading: products === undefined,
    purchasePack,
    purchaseBox,
    purchaseBundle,
  };
}
