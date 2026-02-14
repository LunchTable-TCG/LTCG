"use client";

import { useBinderInteraction } from "@/hooks";
import { AuthLoading, Authenticated } from "convex/react";
import { Loader2 } from "lucide-react";

export default function BinderPage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-[#0d0a09]">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
        </div>
      </AuthLoading>
      <Authenticated>
        <BinderContent />
      </Authenticated>
    </>
  );
}

function BinderContent() {
  // const { profile: currentUser } = useProfile();
  const { activeTab, filteredCards, userDecks, stats } = useBinderInteraction();

  return (
    <div>
      <h1>Binder</h1>
      <pre>
        {JSON.stringify(
          {
            activeTab,
            filteredCardsCount: filteredCards.length,
            decksCount: userDecks?.length,
            stats,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}
