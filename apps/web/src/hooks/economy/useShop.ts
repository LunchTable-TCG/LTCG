"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";
import { toast } from "sonner";

/**
 * useShop Hook
 *
 * Shop purchases for packs, boxes, and bundles:
 * - View shop products
 * - Purchase packs
 * - Purchase boxes
 * - Purchase currency bundles
 * - View pack opening history
 */
export function useShop() {
  const { token } = useAuth();

  // Queries
  const products = useQuery(
    api.shop.getShopProducts,
    {}
  );

  const packHistory = useQuery(
    api.shop.getPackOpeningHistory,
    token ? { token } : "skip"
  );

  // Mutations
  const purchasePackMutation = useMutation(api.shop.purchasePack);
  const purchaseBoxMutation = useMutation(api.shop.purchaseBox);
  const purchaseBundleMutation = useMutation(api.shop.purchaseCurrencyBundle);

  // Actions
  const purchasePack = async (
    productId: string,
    useGems: boolean
  ) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const result = await purchasePackMutation({
        token,
        productId,
        useGems,
      });
      toast.success(`Pack purchased! You got ${result.cardsReceived.length} cards`);
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to purchase pack");
      throw error;
    }
  };

  const purchaseBox = async (
    productId: string,
    useGems: boolean
  ) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const result = await purchaseBoxMutation({
        token,
        productId,
        useGems,
      });
      toast.success(`Box purchased! Opening ${result.packsOpened} packs...`);
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to purchase box");
      throw error;
    }
  };

  const purchaseBundle = async (productId: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const result = await purchaseBundleMutation({ token, productId });
      toast.success(`Bundle purchased! You got ${result.goldReceived} gold`);
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to purchase bundle");
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
