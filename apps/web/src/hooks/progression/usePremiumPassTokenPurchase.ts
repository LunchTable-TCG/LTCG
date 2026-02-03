"use client";

import { typedApi, useTypedMutation } from "@/lib/convexTypedHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import { useCallback, useState } from "react";

/** Token decimal places for LTCG token */
const TOKEN_DECIMALS = 6;

export type PurchaseStep = "confirm" | "signing" | "waiting" | "success" | "error";

interface InitiatePurchaseResult {
  pendingPurchaseId: Id<"pendingTokenPurchases">;
  transactionBase64: string;
  expiresAt: number;
  tokenPrice: number;
}

interface UsePremiumPassTokenPurchaseReturn {
  /** Current step in the purchase flow */
  step: PurchaseStep;
  /** Error message if purchase failed */
  error: string | null;
  /** Pending purchase ID */
  pendingPurchaseId: Id<"pendingTokenPurchases"> | null;
  /** Initiate the token purchase flow */
  initiatePurchase: (solanaWallet: any) => Promise<void>;
  /** Cancel the pending purchase */
  cancelPurchase: () => Promise<void>;
  /** Reset the purchase flow */
  reset: () => void;
}

/**
 * Formats a raw token amount (with 6 decimals) to human-readable format.
 */
export function formatTokenAmount(rawAmount: number, decimals = 2) {
  const humanReadable = rawAmount / 10 ** TOKEN_DECIMALS;
  return humanReadable.toFixed(decimals);
}

/**
 * Hook for managing token-based premium pass purchases.
 *
 * Handles the complete flow:
 * 1. Initiate purchase (get unsigned transaction)
 * 2. Sign transaction with wallet
 * 3. Submit signature to backend
 * 4. Poll for confirmation
 *
 * @example
 * ```typescript
 * const {
 *   step,
 *   error,
 *   initiatePurchase,
 *   cancelPurchase,
 *   reset
 * } = usePremiumPassTokenPurchase();
 *
 * // Start purchase
 * await initiatePurchase(solanaWallet);
 *
 * // Cancel if needed
 * if (step === "confirm") {
 *   await cancelPurchase();
 * }
 * ```
 */
export function usePremiumPassTokenPurchase(): UsePremiumPassTokenPurchaseReturn {
  const [step, setStep] = useState<PurchaseStep>("confirm");
  const [error, setError] = useState<string | null>(null);
  const [pendingPurchaseId, setPendingPurchaseId] = useState<Id<"pendingTokenPurchases"> | null>(
    null
  );

  // Privy hook for signing and sending transactions
  const { signAndSendTransaction } = useSignAndSendTransaction();

  // Convex mutations
  const initiatePurchaseMutation = useTypedMutation(
    typedApi.progression.battlePass.initiatePremiumPassTokenPurchase
  );
  const submitSignedTransaction = useTypedMutation(
    typedApi.progression.battlePass.submitPremiumPassTransaction
  );
  const cancelPurchaseMutation = useTypedMutation(
    typedApi.progression.battlePass.cancelPremiumPassPurchase
  );

  /**
   * Initiates the purchase flow.
   * Creates a pending purchase record and gets the unsigned transaction.
   */
  const initiatePurchase = useCallback(
    async (solanaWallet: any) => {
      try {
        setStep("signing");
        setError(null);

        // Step 1: Initiate the purchase (creates pending record, returns unsigned tx)
        const result = (await initiatePurchaseMutation({})) as InitiatePurchaseResult;

        setPendingPurchaseId(result.pendingPurchaseId);

        // Step 2: Decode the base64 transaction
        const transactionBytes = Uint8Array.from(atob(result.transactionBase64), (c) =>
          c.charCodeAt(0)
        );

        // Step 3: Sign and send using Privy
        const { signature } = await signAndSendTransaction({
          transaction: transactionBytes,
          wallet: solanaWallet,
        });

        // Convert signature to base58 string if it's a Uint8Array
        const signatureString =
          signature instanceof Uint8Array
            ? Buffer.from(signature).toString("base64")
            : String(signature);

        // Step 4: Submit the signed transaction to backend
        await submitSignedTransaction({
          pendingPurchaseId: result.pendingPurchaseId,
          signedTransactionBase64: result.transactionBase64, // Transaction was sent client-side
          transactionSignature: signatureString,
        });

        // Move to waiting step
        setStep("waiting");
      } catch (err) {
        console.error("Premium pass purchase failed:", err);

        // Handle specific error types
        const message = err instanceof Error ? err.message : "Purchase failed";

        if (
          message.toLowerCase().includes("rejected") ||
          message.toLowerCase().includes("cancelled") ||
          message.toLowerCase().includes("user denied")
        ) {
          setError("Transaction cancelled by user");
        } else if (message.toLowerCase().includes("insufficient")) {
          setError("Insufficient token balance for this purchase");
        } else if (message.toLowerCase().includes("network")) {
          setError("Network error. Please check your connection.");
        } else if (message.toLowerCase().includes("timeout")) {
          setError("Transaction timed out. Please try again.");
        } else if (message.toLowerCase().includes("already purchased")) {
          setError("You already own the premium pass");
        } else {
          setError(message);
        }

        setStep("error");

        // Cancel the pending purchase if it was created
        if (pendingPurchaseId) {
          try {
            await cancelPurchaseMutation({ pendingPurchaseId });
          } catch {
            // Silent fail - the pending purchase will expire anyway
          }
        }
      }
    },
    [
      initiatePurchaseMutation,
      signAndSendTransaction,
      submitSignedTransaction,
      cancelPurchaseMutation,
      pendingPurchaseId,
    ]
  );

  /**
   * Cancels the pending purchase
   */
  const cancelPurchase = useCallback(async () => {
    if (!pendingPurchaseId) return;

    try {
      await cancelPurchaseMutation({ pendingPurchaseId });
      reset();
    } catch (err) {
      console.error("Failed to cancel purchase:", err);
      // Don't show error to user - it will expire anyway
    }
  }, [pendingPurchaseId, cancelPurchaseMutation]);

  /**
   * Resets the purchase flow to initial state
   */
  const reset = useCallback(() => {
    setStep("confirm");
    setError(null);
    setPendingPurchaseId(null);
  }, []);

  return {
    step,
    error,
    pendingPurchaseId,
    initiatePurchase,
    cancelPurchase,
    reset,
  };
}
