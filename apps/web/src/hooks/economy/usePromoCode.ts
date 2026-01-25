"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";
import { toast } from "sonner";

/**
 * usePromoCode Hook
 *
 * Promo code redemption functionality.
 */
export function usePromoCode() {
  const { token } = useAuth();

  const redeemMutation = useMutation(api.economy.redeemPromoCode);

  const redeemCode = async (code: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const result = await redeemMutation({ token, code });
      toast.success(`Promo code redeemed! You got ${result.reward}`);
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to redeem promo code");
      throw error;
    }
  };

  return { redeemCode };
}
