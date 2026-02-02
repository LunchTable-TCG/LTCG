"use client";

import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import { usePrivy } from "@privy-io/react-auth";
import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StarterDeckStep } from "./components/StarterDeckStep";
import { UsernameStep } from "./components/UsernameStep";

type OnboardingStep = "loading" | "username" | "deck" | "complete";

/**
 * Unified onboarding page that handles:
 * 1. Username selection (if not set)
 * 2. Starter deck selection (if no active deck)
 *
 * Wallet is auto-synced by AuthGuard - no manual step needed.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy();
  const { isAuthenticated: convexAuthenticated } = useConvexAuth();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("loading");

  // Query onboarding status from backend
  const onboardingStatus = useConvexQuery(
    apiAny.auth.syncUser.getOnboardingStatus,
    convexAuthenticated ? {} : "skip"
  ) as { hasUsername: boolean; hasStarterDeck: boolean; hasWallet: boolean } | null | undefined;

  // Determine current step based on onboarding status
  useEffect(() => {
    if (!privyReady || !convexAuthenticated) {
      setCurrentStep("loading");
      return;
    }

    // Redirect to login if not authenticated
    if (!privyAuthenticated) {
      router.replace("/login");
      return;
    }

    // Still loading onboarding status
    if (onboardingStatus === undefined) {
      setCurrentStep("loading");
      return;
    }

    // User not found - should be synced by AuthGuard, wait
    if (onboardingStatus === null) {
      setCurrentStep("loading");
      return;
    }

    // Determine step
    if (!onboardingStatus.hasUsername) {
      setCurrentStep("username");
    } else if (!onboardingStatus.hasStarterDeck) {
      setCurrentStep("deck");
    } else {
      // Fully onboarded - redirect to game
      setCurrentStep("complete");
      router.replace("/lunchtable");
    }
  }, [privyReady, privyAuthenticated, convexAuthenticated, onboardingStatus, router]);

  // Handle step completion
  const handleUsernameComplete = () => {
    setCurrentStep("deck");
  };

  const handleDeckComplete = () => {
    setCurrentStep("complete");
    router.push("/lunchtable");
  };

  // Loading state
  if (currentStep === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1410] via-[#2a1f14] to-[#1a1410]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
            Preparing your journey...
          </p>
        </div>
      </div>
    );
  }

  // Complete state (brief flash before redirect)
  if (currentStep === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1410] via-[#2a1f14] to-[#1a1410]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
            Entering the halls...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1410] via-[#2a1f14] to-[#1a1410] p-4">
      {/* Progress indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            currentStep === "username" ? "bg-[#d4af37]" : "bg-[#d4af37]/30"
          }`}
        />
        <div className="w-8 h-0.5 bg-[#3d2b1f]" />
        <div
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            currentStep === "deck" ? "bg-[#d4af37]" : "bg-[#d4af37]/30"
          }`}
        />
      </div>

      {/* Step content */}
      {currentStep === "username" && <UsernameStep onComplete={handleUsernameComplete} />}
      {currentStep === "deck" && <StarterDeckStep onComplete={handleDeckComplete} />}
    </div>
  );
}
