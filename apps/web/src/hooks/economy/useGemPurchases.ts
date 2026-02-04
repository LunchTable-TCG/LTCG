"use client";

import { handleHookError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useAuth } from "../auth/useConvexAuthHook";

interface GemPackage {
  packageId: string;
  name: string;
  gems: number;
  usdPrice: number;
  bonusPercent: number;
  isActive: boolean;
  sortOrder: number;
  featuredBadge?: string;
  iconUrl?: string;
  /** Price in USD cents when paying with ElizaOS token (10% discount) */
  elizaOSPrice?: number;
  /** Discount percentage for ElizaOS token payments (e.g., 10 for 10%) */
  elizaOSDiscountPercent?: number;
}

interface TokenPrice {
  usdCents: number;
  cachedAt: number;
  fresh: boolean;
}

interface PendingPurchase {
  purchaseId: Id<"tokenGemPurchases">;
  gemsToReceive: number;
  expiresAt: number;
}

interface PurchaseHistory {
  _id: Id<"tokenGemPurchases">;
  packageId: string;
  gemsReceived: number;
  usdValue: number;
  tokenAmount: number;
  tokenPriceUsd: number;
  solanaSignature: string;
  status: "pending" | "confirmed" | "failed" | "expired";
  createdAt: number;
  confirmedAt?: number;
}

interface UseGemPurchasesReturn {
  packages: GemPackage[] | undefined;
  purchaseHistory: PurchaseHistory[] | undefined;
  pendingPurchases: PurchaseHistory[] | undefined;
  isLoading: boolean;
  getTokenPrice: () => Promise<TokenPrice>;
  createPurchase: (
    packageId: string,
    tokenAmount: number,
    tokenPriceUsd: number
  ) => Promise<PendingPurchase>;
  updateSignature: (purchaseId: Id<"tokenGemPurchases">, signature: string) => Promise<void>;
  verifyPurchase: (signature: string) => Promise<{ success: boolean; gemsCredited?: number }>;
}

/**
 * Token → Gems purchase system.
 *
 * Handles purchasing gems with Solana SPL tokens. Includes dynamic pricing
 * through Jupiter/Birdeye oracles, purchase creation, signature updates,
 * and transaction verification.
 *
 * ## Supported Payment Tokens
 * - **LTCG Token** (native): Standard pricing
 * - **ElizaOS Token**: 10% discount on all gem packages
 *
 * ## Purchase Flow
 * 1. Get current token price
 * 2. Create pending purchase (server-side)
 * 3. Sign Solana transaction (client-side wallet)
 * 4. Update signature on pending purchase
 * 5. Verify transaction and credit gems
 *
 * **Note**: This is separate from Stripe payments used for Battle Pass subscriptions.
 * Token purchases are for in-game currency (gems), while Stripe handles recurring subscriptions.
 *
 * @example
 * ```typescript
 * const {
 *   packages,
 *   getTokenPrice,
 *   createPurchase,
 *   updateSignature,
 *   verifyPurchase
 * } = useGemPurchases();
 *
 * // Get current token price
 * const price = await getTokenPrice();
 *
 * // Create pending purchase
 * const pending = await createPurchase("gem_standard", tokenAmount, price.usdCents);
 *
 * // After wallet signs transaction...
 * await updateSignature(pending.purchaseId, signature);
 *
 * // Verify and credit gems
 * const result = await verifyPurchase(signature);
 * if (result.success) {
 *   console.log(`Credited ${result.gemsCredited} gems!`);
 * }
 * ```
 *
 * @returns {UseGemPurchasesReturn} Gem purchases interface
 */
export function useGemPurchases(): UseGemPurchasesReturn {
  const { isAuthenticated } = useAuth();

  // Queries
  const packages = useQuery(api.economy.getGemPackages, {});
  const purchaseHistory = useQuery(
    api.economy.getGemPurchaseHistory,
    isAuthenticated ? {} : "skip"
  );
  const pendingPurchases = useQuery(api.economy.getPendingPurchases, isAuthenticated ? {} : "skip");

  // Actions
  const getTokenPriceAction = useAction(api.economy.getTokenPrice);
  const verifyPurchaseAction = useAction(api.economy.verifyAndConfirmPurchase);

  // Mutations
  const createPurchaseMutation = useMutation(api.economy.createPendingPurchase);
  const updateSignatureMutation = useMutation(api.economy.updatePurchaseSignature);

  // Handlers
  const getTokenPrice = async () => {
    try {
      return await getTokenPriceAction({});
    } catch (error) {
      const message = handleHookError(error, "Failed to get token price");
      toast.error(message);
      throw error;
    }
  };

  const createPurchase = async (packageId: string, tokenAmount: number, tokenPriceUsd: number) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      const result = await createPurchaseMutation({
        packageId,
        tokenAmount,
        tokenPriceUsd,
      });
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to create purchase");
      toast.error(message);
      throw error;
    }
  };

  const updateSignature = async (purchaseId: Id<"tokenGemPurchases">, solanaSignature: string) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      await updateSignatureMutation({ purchaseId, solanaSignature });
    } catch (error) {
      const message = handleHookError(error, "Failed to update signature");
      toast.error(message);
      throw error;
    }
  };

  const verifyPurchase = async (solanaSignature: string) => {
    try {
      const result = await verifyPurchaseAction({ solanaSignature });
      if (result.success && result.gemsCredited) {
        toast.success(`Purchase verified! ${result.gemsCredited} gems credited.`);
      } else if (!result.success) {
        toast.error(result.reason || "Purchase verification failed");
      }
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to verify purchase");
      toast.error(message);
      throw error;
    }
  };

  return {
    packages,
    purchaseHistory,
    pendingPurchases,
    isLoading: packages === undefined,
    getTokenPrice,
    createPurchase,
    updateSignature,
    verifyPurchase,
  };
}
