"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { usePrivy } from "@privy-io/react-auth";
import { useConvexAuth } from "convex/react";
import { ArrowRight, Loader2, LogIn, Sparkles, Star, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

// Module-scope reference to avoid TS2589
const getReferrerByCodeQuery = typedApi.social.referrals.getReferrerByCode;

export default function ReferralLandingPage() {
  const params = useParams();
  const code = params.code as string;

  const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy();
  const { isAuthenticated: convexAuthenticated, isLoading: convexLoading } = useConvexAuth();

  const isAuthenticated = privyAuthenticated && convexAuthenticated;
  const isAuthLoading = !privyReady || convexLoading;

  // Referrer preview (no auth required)
  const referrer = useConvexQuery(getReferrerByCodeQuery, code ? { code } : "skip");

  // Store referral code in sessionStorage for the auth flow
  useEffect(() => {
    if (code) {
      sessionStorage.setItem(
        "referral",
        JSON.stringify({
          source: "user_referral",
          referralCode: code,
        })
      );
    }
  }, [code]);

  const returnTo = `/referral/${code}`;
  const signupUrl = `/signup?returnTo=${encodeURIComponent(returnTo)}`;
  const loginUrl = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  // Loading
  if (referrer === undefined) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
            Loading invite...
          </p>
        </div>
      </div>
    );
  }

  // Invalid or not found
  if (referrer === null) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#e8e0d5] mb-2">Invalid Referral Link</h1>
            <p className="text-[#a89f94]">
              This referral link is no longer active or doesn&apos;t exist.
            </p>
          </div>
          <Link href="/">
            <Button className="tcg-button-primary rounded-xl px-8">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Referrer Card */}
        <div className="rounded-2xl border border-[#3d2b1f] overflow-hidden bg-black/40">
          {/* Banner gradient */}
          <div className="h-24 bg-gradient-to-br from-[#d4af37]/30 via-[#8b4513] to-[#3d2b1f]" />

          <div className="px-6 pb-6 -mt-10 text-center">
            {/* Referrer avatar */}
            <div className="relative inline-block mb-4">
              <Avatar className="w-20 h-20 border-4 border-[#0d0a09] shadow-2xl">
                {referrer.image && (
                  <AvatarImage src={referrer.image} alt={referrer.username || "Player"} />
                )}
                <AvatarFallback className="bg-gradient-to-br from-[#8b4513] to-[#3d2b1f] text-2xl font-black text-[#d4af37]">
                  {(referrer.username || "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Invite text */}
            <p className="text-[#a89f94] text-sm mb-2">You&apos;ve been invited by</p>
            <h1 className="text-2xl font-black text-[#e8e0d5] mb-1">
              {referrer.username || "A Player"}
            </h1>
            <div className="flex items-center justify-center gap-1.5 text-sm text-[#a89f94]">
              <Star className="w-4 h-4 text-[#d4af37]" />
              <span>Level {referrer.level}</span>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#d4af37]/5 border border-[#d4af37]/20">
              <p className="text-sm text-[#e8e0d5] font-medium">
                Join Lunchtable TCG and battle with cards in a strategic trading card game!
              </p>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="space-y-4">
          {isAuthLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-[#d4af37]" />
            </div>
          ) : isAuthenticated ? (
            /* Already authenticated - redirect to home */
            <div className="text-center p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-[#d4af37]" />
              <p className="text-[#e8e0d5] font-medium">You already have an account!</p>
              <p className="text-sm text-[#a89f94] mt-1">
                Thanks for checking out the referral link.
              </p>
              <Link href="/">
                <Button className="mt-4 tcg-button-primary rounded-xl px-8">Go to Home</Button>
              </Link>
            </div>
          ) : (
            /* Not authenticated - show signup/login */
            <div className="space-y-3">
              <Link href={signupUrl} className="block">
                <Button className="w-full tcg-button-primary rounded-xl py-6 text-lg font-black uppercase tracking-widest">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Sign Up to Play
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              <Link href={loginUrl} className="block">
                <Button
                  variant="outline"
                  className="w-full border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 rounded-xl py-5"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Already have an account? Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#a89f94]/40">
          <Link href="/" className="hover:text-[#d4af37] transition-colors">
            Lunchtable TCG
          </Link>
        </p>
      </div>
    </div>
  );
}
