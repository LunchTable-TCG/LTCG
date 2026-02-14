"use client";

import { DailyLoginRewards } from "@/components/rewards/DailyLoginRewards";
import { useLunchtableLogic } from "@/hooks";
import { AuthLoading, Authenticated } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import {
  GameLobby,
  GlobalChat,
  IncomingChallengeNotification,
  WelcomeGuideDialog,
} from "./components";

export default function LunchtablePage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-[#0d0a09]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
            <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
              Entering the Arena...
            </p>
          </div>
        </div>
      </AuthLoading>
      <Authenticated>
        <LunchtableContent />
      </Authenticated>
    </>
  );
}

function LunchtableContent() {
  const {
    currentUser,
    profileLoading,
    showWelcomeGuide,
    isClaimingDeck,
    showDailyRewards,
    setShowDailyRewards,
    handleWelcomeComplete,
  } = useLunchtableLogic();

  // Reset scroll position on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (profileLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a09]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
            Loading Profile...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a09]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
            Loading Profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative overflow-hidden bg-black">
      <WelcomeGuideDialog
        isOpen={showWelcomeGuide}
        onComplete={handleWelcomeComplete}
        username={currentUser.username || "Traveler"}
        isClaiming={isClaimingDeck}
      />

      {/* Incoming Challenge Notification */}
      <IncomingChallengeNotification />

      {/* Stars at the top */}
      <div className="absolute inset-x-0 top-0 h-[40%] z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-1 h-1 bg-white rounded-full animate-twinkle" />
        <div className="absolute top-[8%] left-[35%] w-0.5 h-0.5 bg-white/80 rounded-full animate-twinkle-delayed" />
        <div className="absolute top-[15%] left-[55%] w-1 h-1 bg-white rounded-full animate-twinkle-slow" />
        <div className="absolute top-[5%] left-[70%] w-0.5 h-0.5 bg-white/70 rounded-full animate-twinkle" />
        <div className="absolute top-[20%] left-[85%] w-1 h-1 bg-white/90 rounded-full animate-twinkle-delayed" />
        <div className="absolute top-[12%] left-[25%] w-0.5 h-0.5 bg-white/60 rounded-full animate-twinkle-slow" />
        <div className="absolute top-[18%] left-[45%] w-1 h-1 bg-white/80 rounded-full animate-twinkle" />
        <div className="absolute top-[7%] left-[60%] w-0.5 h-0.5 bg-white rounded-full animate-twinkle-delayed" />
        <div className="absolute top-[22%] left-[78%] w-0.5 h-0.5 bg-white/70 rounded-full animate-twinkle-slow" />
        <div className="absolute top-[14%] left-[92%] w-1 h-1 bg-white/80 rounded-full animate-twinkle" />
        <div className="absolute top-[25%] left-[8%] w-0.5 h-0.5 bg-white/60 rounded-full animate-twinkle-delayed" />
        <div className="absolute top-[9%] left-[50%] w-1 h-1 bg-white rounded-full animate-twinkle-slow" />
      </div>

      {/* Campfire glow behind lobby */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,100,0,0.35)_0%,rgba(255,60,0,0.2)_25%,rgba(255,40,0,0.1)_50%,transparent_75%)] animate-campfire-glow" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,200,50,0.25)_0%,rgba(255,150,30,0.1)_30%,transparent_60%)] animate-campfire-flicker" />
      </div>

      {/* Floating sparks - travel full height */}
      <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden">
        <div className="absolute bottom-[5%] left-[45%] w-1.5 h-1.5 bg-orange-400 rounded-full animate-spark-tall-1" />
        <div className="absolute bottom-[8%] left-[48%] w-1 h-1 bg-yellow-400 rounded-full animate-spark-tall-2" />
        <div className="absolute bottom-[3%] left-[52%] w-1.5 h-1.5 bg-orange-300 rounded-full animate-spark-tall-3" />
        <div className="absolute bottom-[10%] left-[50%] w-1 h-1 bg-red-400 rounded-full animate-spark-tall-4" />
        <div className="absolute bottom-[6%] left-[46%] w-1.5 h-1.5 bg-yellow-300 rounded-full animate-spark-tall-5" />
        <div className="absolute bottom-[4%] left-[54%] w-1 h-1 bg-orange-400 rounded-full animate-spark-tall-6" />
        <div
          className="absolute bottom-[7%] left-[49%] w-1 h-1 bg-amber-400 rounded-full animate-spark-tall-1"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute bottom-[9%] left-[51%] w-0.5 h-0.5 bg-orange-300 rounded-full animate-spark-tall-3"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute bottom-[2%] left-[47%] w-1.5 h-1.5 bg-yellow-500 rounded-full animate-spark-tall-2"
          style={{ animationDelay: "2.5s" }}
        />
        <div
          className="absolute bottom-[5%] left-[53%] w-1 h-1 bg-red-500 rounded-full animate-spark-tall-4"
          style={{ animationDelay: "4s" }}
        />
      </div>

      {/* Vignette Effect */}
      <div className="absolute inset-0 bg-vignette z-1" />

      {/* Content - pt-24 accounts for fixed navbar */}
      <div className="relative z-10 h-full flex flex-col p-6 pt-24 overflow-hidden">
        {/* Main Content Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 min-h-0 overflow-hidden">
          {/* Center - Game Lobby */}
          <div className="relative p-6 rounded-2xl tcg-chat-leather overflow-hidden shadow-2xl border border-[#3d2b1f] flex flex-col">
            <div className="ornament-corner ornament-corner-tl" />
            <div className="ornament-corner ornament-corner-tr" />
            <div className="ornament-corner ornament-corner-bl" />
            <div className="ornament-corner ornament-corner-br" />
            <GameLobby />
          </div>

          {/* Right - Global Chat */}
          <div className="hidden lg:flex overflow-hidden">
            <GlobalChat />
          </div>
        </div>

        {/* Mobile Chat Toggle - Shows on smaller screens */}
        <div className="lg:hidden mt-6 flex-1 min-h-0 overflow-hidden">
          <GlobalChat />
        </div>

        {/* Daily Login Rewards */}
        <DailyLoginRewards
          isOpen={showDailyRewards}
          onClose={() => setShowDailyRewards(false)}
          currentStreak={1}
          onClaim={async (_day: number) => {
            // Claim logic would go here
            await new Promise((resolve) => setTimeout(resolve, 500));
          }}
        />
      </div>
    </div>
  );
}
