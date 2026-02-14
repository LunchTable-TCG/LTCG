"use client";

import { useShopInteraction } from "@/hooks/economy/useShopInteraction";
import { Loader2 } from "lucide-react";

export default function ShopPage() {
  const {
    currentUser,
    activeTab,
    gold,
    gems,
    packItems,
    boxItems,
    currencyItems,
    filteredGoldListings,
    filteredTokenListings
  } = useShopInteraction();

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1>Shop (Debug)</h1>
      <pre className="p-4 bg-muted text-xs overflow-auto max-h-screen">
        {JSON.stringify({
          user: { gold, gems },
          activeTab,
          catalog: {
            packs: packItems.length,
            boxes: boxItems.length,
            currency: currencyItems.length
          },
          listings: {
            gold: filteredGoldListings.length,
            token: filteredTokenListings.length
          }
        }, null, 2)}
      </pre>
    </div>
  );
}
