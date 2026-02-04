"use client";

import { cn } from "@/lib/utils";
import { CreditCard, Gem, HelpCircle, Info, Sparkles, X } from "lucide-react";
import { useState } from "react";

interface PaymentInfoCardProps {
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Informational card explaining the payment systems in LTCG.
 *
 * ## Payment Methods
 *
 * ### Token Payments (Marketplace & Shop)
 * - **LTCG Token**: Native platform token for purchasing gems, packs, and marketplace cards
 * - **ElizaOS Token**: Alternative payment with 10% discount on all token purchases
 *
 * ### Credit Card Payments (Subscriptions)
 * - **Battle Pass**: Monthly ($4.20) or yearly ($36.90) subscription via Stripe
 * - Battle Pass provides premium rewards, exclusive content, and season pass benefits
 *
 * These two payment systems are completely separate:
 * - Token payments are on-chain Solana transactions
 * - Credit card payments are handled through Stripe's secure payment gateway
 */
export function PaymentInfoCard({ variant = "compact", className }: PaymentInfoCardProps) {
  const [isExpanded, setIsExpanded] = useState(variant === "full");
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed && variant === "compact") {
    return null;
  }

  if (variant === "compact" && !isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg",
          "bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors",
          "text-sm text-primary",
          className
        )}
      >
        <HelpCircle className="w-4 h-4" />
        <span>How do payments work?</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        "bg-linear-to-br from-[#1a1614] to-[#0d0a09]",
        "border-[#3d2b1f]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3d2b1f] bg-black/20">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-[#e8e0d5]">Payment Methods</h3>
        </div>
        {variant === "compact" && (
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              setIsDismissed(true);
            }}
            className="p-1 rounded-md hover:bg-white/10 text-[#a89f94] hover:text-[#e8e0d5] transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Token Payments Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Gem className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-[#e8e0d5]">Token Payments</h4>
            <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
              Gems, Packs & Marketplace
            </span>
          </div>

          <div className="pl-6 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div>
                <span className="text-[#e8e0d5] font-medium">LTCG Token</span>
                <span className="text-[#a89f94]"> — Native platform token for all purchases</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
              <div>
                <span className="text-green-400 font-medium flex items-center gap-1">
                  ElizaOS Token
                  <Sparkles className="w-3 h-3" />
                </span>
                <span className="text-[#a89f94]"> — </span>
                <span className="text-green-400 font-semibold">10% discount</span>
                <span className="text-[#a89f94]"> on all token purchases!</span>
              </div>
            </div>
          </div>

          <p className="pl-6 text-xs text-[#a89f94]">
            Token payments are processed directly on the Solana blockchain. Connect your wallet to
            pay with tokens.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-[#3d2b1f]" />

        {/* Stripe Payments Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <h4 className="font-medium text-[#e8e0d5]">Credit Card Payments</h4>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
              Subscriptions Only
            </span>
          </div>

          <div className="pl-6 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <div>
                <span className="text-[#e8e0d5] font-medium">Battle Pass</span>
                <span className="text-[#a89f94]">
                  {" "}
                  — Monthly ($4.20) or Yearly ($36.90) subscription
                </span>
              </div>
            </div>
          </div>

          <p className="pl-6 text-xs text-[#a89f94]">
            Battle Pass subscriptions are handled through Stripe's secure payment gateway. This is
            completely separate from token payments.
          </p>
        </div>

        {/* Summary Note */}
        <div className="p-3 rounded-lg bg-[#3d2b1f]/30 border border-[#3d2b1f]">
          <p className="text-xs text-[#a89f94]">
            <strong className="text-[#e8e0d5]">Summary:</strong> Use{" "}
            <span className="text-primary">tokens</span> for shop items and marketplace
            transactions. Use <span className="text-blue-400">credit card</span> for the Battle Pass
            subscription.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact badge showing ElizaOS discount availability.
 * Use this next to price displays where ElizaOS token is accepted.
 */
export function ElizaOSDiscountBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "bg-green-500/20 border border-green-500/30",
        "text-xs font-medium text-green-400",
        className
      )}
      title="Pay with ElizaOS token for 10% off"
    >
      <Sparkles className="w-3 h-3" />
      10% off with ElizaOS
    </span>
  );
}
