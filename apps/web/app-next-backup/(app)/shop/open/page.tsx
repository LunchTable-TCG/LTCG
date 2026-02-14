"use client";

import { ListingDialog } from "@/components/marketplace/ListingDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { getAssetUrl } from "@/lib/blob";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/cards";
import type { Id } from "@convex/_generated/dataModel";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Package,
  Sparkles,
  Store,
  Tag,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Card {
  cardDefinitionId: Id<"cardDefinitions">;
  playerCardId?: Id<"playerCards">;
  name: string;
  rarity: Rarity;
  isNew?: boolean;
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-slate-600",
  uncommon: "text-emerald-700",
  rare: "text-blue-700",
  epic: "text-purple-700",
  legendary: "text-amber-700",
};

const RARITY_LABELS: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

type OpeningPhase = "ready" | "opening" | "revealing" | "complete";

function PackOpeningContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openingType = searchParams.get("type") || "pack";
  const dataParam = searchParams.get("data");

  const { isAuthenticated } = useAuth();
  const currentUser = useConvexQuery(
    typedApi.core.users.currentUser,
    isAuthenticated ? {} : "skip"
  );
  const createListingMutation = useConvexMutation(typedApi.marketplace.createListing);

  const [phase, setPhase] = useState<OpeningPhase>("ready");
  const [cards, setCards] = useState<Card[]>([]);
  const [openingData, setOpeningData] = useState<{
    productName?: string;
    packsOpened?: number;
    bonusCards?: number;
    cardsReceived?: Card[];
  } | null>(null);
  const [_currentCardIndex, _setCurrentCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [selectedForListing, setSelectedForListing] = useState<Set<Id<"cardDefinitions">>>(
    new Set()
  );
  const [isListingCards, setIsListingCards] = useState(false);
  const [listingDialogCard, setListingDialogCard] = useState<Card | null>(null);
  const [currentListingIndex, setCurrentListingIndex] = useState(0);
  const selectedCards = Array.from(selectedForListing)
    .map((id) => cards.find((c) => c.cardDefinitionId === id))
    .filter((c): c is Card => c !== null);

  // Parse opening data from URL
  useEffect(() => {
    if (dataParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(dataParam));
        setOpeningData(decoded);
        // Extract cards from the purchase result
        if (decoded.cardsReceived) {
          setCards(decoded.cardsReceived);
        }
      } catch (error) {
        console.error("Failed to parse opening data:", error);
        toast.error("Invalid opening data");
        router.push("/shop");
      }
    } else {
      // No data provided, redirect back to shop
      toast.error("No opening data found");
      router.push("/shop");
    }
  }, [dataParam, router]);

  const packInfo = openingData
    ? {
        name: openingData.productName || (openingType === "box" ? "Card Box" : "Card Pack"),
        cardCount: cards.length,
      }
    : { name: "Card Pack", cardCount: 0 };

  const handleOpenPack = useCallback(() => {
    setPhase("opening");
    // Video will trigger transition to revealing phase via onEnded event
  }, []);

  const handleRevealCard = useCallback((index: number) => {
    setRevealedCards((prev) => new Set([...prev, index]));
  }, []);

  const handleRevealAll = useCallback(() => {
    const allIndices = new Set(cards.map((_, i) => i));
    setRevealedCards(allIndices);
  }, [cards]);

  const handleComplete = useCallback(() => {
    setPhase("complete");
  }, []);

  const toggleListingSelection = useCallback((cardId: Id<"cardDefinitions">) => {
    setSelectedForListing((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  const handleListSelected = useCallback(() => {
    if (!isAuthenticated || selectedForListing.size === 0) return;

    // Start listing flow with first card
    const firstCard = selectedCards[0];
    if (firstCard) {
      setCurrentListingIndex(0);
      setListingDialogCard(firstCard);
    }
  }, [selectedForListing, isAuthenticated, selectedCards]);

  const handleListingDialogConfirm = useCallback(
    async (listingType: "fixed" | "auction", price: number, duration?: number) => {
      if (!listingDialogCard) return;

      setIsListingCards(true);
      try {
        // Create listing for current card
        await createListingMutation({
          cardDefinitionId: listingDialogCard.cardDefinitionId,
          quantity: 1,
          listingType,
          price,
          duration,
        });

        // Move to next card or finish
        const nextIndex = currentListingIndex + 1;
        if (nextIndex < selectedCards.length) {
          setCurrentListingIndex(nextIndex);
          setListingDialogCard(selectedCards[nextIndex] || null);
          setIsListingCards(false);
        } else {
          // All cards listed
          toast.success(`Successfully listed ${selectedForListing.size} card(s) on marketplace`);
          setListingDialogCard(null);
          router.push("/shop");
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to list card";
        toast.error(errorMessage);
        setIsListingCards(false);
      }
    },
    [
      listingDialogCard,
      currentListingIndex,
      selectedCards,
      createListingMutation,
      selectedForListing.size,
      router,
    ]
  );

  const handleListingDialogClose = useCallback(() => {
    setListingDialogCard(null);
    setCurrentListingIndex(0);
    setIsListingCards(false);
  }, []);

  const allRevealed = revealedCards.size === cards.length && cards.length > 0;

  useEffect(() => {
    if (allRevealed && phase === "revealing") {
      // Auto-transition to complete after a short delay
      const timer = setTimeout(() => handleComplete(), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [allRevealed, phase, handleComplete]);

  if (!currentUser || !openingData || cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] relative overflow-hidden flex flex-col">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container mx-auto px-4 pt-8 pb-16 relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/shop"
            className="flex items-center gap-2 text-black/60 hover:text-black transition-colors font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Shop</span>
          </Link>
          {phase === "complete" && (
            <Button
              onClick={() => router.push("/binder")}
              variant="outline"
              className="border-[3px] border-black text-black font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              View Collection
            </Button>
          )}
        </div>

        {/* Ready Phase - Pack Display */}
        <AnimatePresence mode="wait">
          {phase === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center flex-1"
            >
              <div className="paper-panel p-12 flex flex-col items-center max-w-lg w-full">
                <motion.div
                  animate={{
                    rotateZ: [-2, 2, -2],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="relative mb-8"
                >
                  <div className="relative w-64 h-80 flex items-center justify-center">
                    <Image
                      src={
                        openingType === "box"
                          ? getAssetUrl("/assets/shop/cardboard-box.png")
                          : getAssetUrl("/assets/shop/foil-pack-generic.png")
                      }
                      alt={openingType === "box" ? "Booster Box" : "Booster Pack"}
                      width={256}
                      height={320}
                      className="w-full h-full object-contain filter drop-shadow-xl"
                      priority
                    />
                  </div>
                </motion.div>

                <h1 className="text-4xl font-black text-black mb-2 uppercase tracking-tight ink-bleed text-center">
                  {packInfo.name}
                </h1>
                <p className="text-black/60 font-medium mb-8 text-center text-lg">
                  {openingType === "box"
                    ? `${openingData.packsOpened} packs inside!`
                    : `Contains ${packInfo.cardCount} cards`}
                </p>

                <Button
                  onClick={handleOpenPack}
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl uppercase tracking-wider border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <Sparkles className="w-6 h-6 mr-3" />
                  {openingType === "box" ? "Open Box" : "Open Pack"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Opening Phase - Video Animation */}
          {phase === "opening" && (
            <motion.div
              key="opening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center flex-1"
            >
              <div className="relative w-full max-w-3xl aspect-video bg-black border-[3px] border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
                <video
                  autoPlay
                  muted
                  playsInline
                  onEnded={() => setPhase("revealing")}
                  onError={() => {
                    console.error("Failed to load pack opening video");
                    setTimeout(() => setPhase("revealing"), 500);
                  }}
                  className="w-full h-full object-contain"
                >
                  <source src={getAssetUrl("/assets/shop/packopening.mp4")} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </motion.div>
          )}

          {/* Revealing Phase - Card Grid */}
          {phase === "revealing" && (
            <motion.div
              key="revealing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-6xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black text-black mb-2 uppercase tracking-tight ink-bleed">
                  {openingType === "box" ? `Contents: ${openingData.packsOpened} Packs` : "Pack Contents"}
                </h2>
                <p className="text-black/60 font-medium text-lg">Click cards to reveal them!</p>
              </div>

              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-12 w-full"
                data-testid="pack-results"
              >
                {cards.map((card, index) => {
                  const isRevealed = revealedCards.has(index);

                  return (
                    <motion.div
                      key={`${card.cardDefinitionId}-${index}`}
                      data-testid="pack-card"
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative aspect-3/4"
                    >
                      <motion.button
                        onClick={() => !isRevealed && handleRevealCard(index)}
                        disabled={isRevealed}
                        className={cn(
                          "w-full h-full rounded-none transition-all cursor-pointer relative",
                          isRevealed ? "shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-[3px] border-black" : "hover:-translate-y-1 hover:shadow-lg"
                        )}
                        animate={isRevealed ? { rotateY: [0, 90, 0] } : {}}
                        transition={{ duration: 0.4 }}
                      >
                        {isRevealed ? (
                          <div className="w-full h-full bg-white p-3 flex flex-col justify-between">
                             {card.isNew && (
                              <span className="absolute top-2 right-2 px-1.5 py-0.5 border border-black text-[10px] font-black uppercase bg-green-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">
                                NEW
                              </span>
                            )}

                            <div className="w-full aspect-square bg-slate-100 border-2 border-black mb-2 flex items-center justify-center p-2">
                               <Package className={cn("w-8 h-8 opacity-50", RARITY_COLORS[card.rarity])} />
                            </div>

                            <div className="text-left">
                              <p className="text-xs font-black text-black uppercase leading-tight line-clamp-2 mb-1">
                                {card.name}
                              </p>
                              <p className={cn("text-[10px] font-bold uppercase", RARITY_COLORS[card.rarity])}>
                                {RARITY_LABELS[card.rarity]}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-black border-[3px] border-black flex items-center justify-center relative overflow-hidden group">
                             <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#222_10px,#222_20px)] opacity-20" />
                             <Store className="w-12 h-12 text-white/20 group-hover:text-white/40 transition-colors" />
                          </div>
                        )}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>

              {!allRevealed && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleRevealAll}
                     className="bg-black text-white hover:bg-black/80 font-black uppercase tracking-wider px-8 h-12 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                  >
                    Reveal All
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Complete Phase - Summary with Listing Option */}
          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-6xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-green-400 text-black text-sm font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6"
                >
                  <CheckCircle className="w-4 h-4" />
                  Opening Complete
                </motion.div>
                <h2 className="text-4xl font-black text-black mb-2 uppercase tracking-tight ink-bleed">
                  New Additions
                </h2>
                <p className="text-black/60 font-medium text-lg">Select cards to list on the marketplace immediately.</p>
              </div>

              {/* Card Summary Grid */}
              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-12 w-full"
                data-testid="pack-results"
              >
                {cards.map((card, idx) => {
                  const isSelected = selectedForListing.has(card.cardDefinitionId);

                  return (
                    <motion.button
                      key={`${card.cardDefinitionId}-${idx}`}
                      data-testid="pack-card"
                      onClick={() => toggleListingSelection(card.cardDefinitionId)}
                      className={cn(
                        "relative aspect-3/4 transition-all bg-white border-[3px] border-black p-3 text-left flex flex-col group",
                        isSelected
                          ? "shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -translate-y-2 ring-4 ring-indigo-500 ring-offset-2"
                          : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                      )}
                    >
                        {isSelected && (
                          <div className="absolute top-2 right-2 z-20 bg-indigo-600 text-white rounded-full p-1 shadow-md border-2 border-black">
                             <Tag className="w-3 h-3" />
                          </div>
                        )}

                        {card.isNew && (
                           <span className="absolute top-2 left-2 px-1.5 py-0.5 border border-black text-[10px] font-black uppercase bg-green-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">
                             NEW
                           </span>
                        )}

                        <div className="w-full aspect-square bg-slate-100 border-2 border-black mb-2 flex items-center justify-center p-2 group-hover:bg-indigo-50 transition-colors">
                           <Package className={cn("w-8 h-8 opacity-50", RARITY_COLORS[card.rarity])} />
                        </div>

                        <div className="mt-auto">
                          <p className="text-xs font-black text-black uppercase leading-tight line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
                            {card.name}
                          </p>
                          <p className={cn("text-[10px] font-bold uppercase", RARITY_COLORS[card.rarity])}>
                            {RARITY_LABELS[card.rarity]}
                          </p>
                        </div>

                        {/* Hover Overlay Text */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 pointer-events-none">
                            <span className="bg-black text-white px-2 py-1 text-xs font-bold uppercase tracking-wider transform rotate-[-5deg]">
                                {isSelected ? "Selected" : "Select to List"}
                            </span>
                        </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-2xl">
                {selectedForListing.size > 0 && (
                  <Button
                    onClick={handleListSelected}
                    disabled={isListingCards}
                    className="w-full sm:flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    {isListingCards ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Listing...
                      </>
                    ) : (
                      <>
                        <Store className="w-5 h-5 mr-2" />
                        List {selectedForListing.size} Card{selectedForListing.size > 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                )}

                <Button
                  onClick={() => router.push("/binder")}
                  variant="outline"
                  className="w-full sm:flex-1 h-12 bg-white hover:bg-slate-50 text-black font-black uppercase tracking-wider border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  disabled={isListingCards}
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  To Collection
                </Button>

                <Button
                  onClick={() => router.push("/shop")}
                  variant="ghost"
                  className="w-full sm:w-auto h-12 text-black/60 hover:text-black font-bold uppercase tracking-wider hover:bg-black/5"
                  disabled={isListingCards}
                >
                  Open Another
                </Button>
              </div>

              {/* Stats Summary */}
              <div className="mt-16 p-8 w-full max-w-4xl border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-xl font-black text-black mb-6 uppercase tracking-tight border-b-2 border-black/10 pb-4">
                  {openingType === "box" ? "Box Summary" : "Pack Summary"}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
                  {(["common", "uncommon", "rare", "epic", "legendary"] as Rarity[]).map(
                    (rarity) => {
                      const count = cards.filter((c) => c.rarity === rarity).length;
                      return (
                        <div key={rarity} className="flex flex-col items-center">
                          <span className={cn("text-4xl font-black mb-1", RARITY_COLORS[rarity])}>
                            {count}
                          </span>
                          <span className="text-xs font-bold text-black/50 uppercase tracking-wider">
                            {RARITY_LABELS[rarity]}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
                {openingType === "box" && (openingData.bonusCards ?? 0) > 0 && (
                  <div className="mt-6 pt-6 border-t-2 border-black/10 text-center">
                    <p className="text-sm font-black uppercase tracking-wider text-amber-500 bg-amber-50 inline-block px-3 py-1 rounded-full border border-amber-200">
                      <Sparkles className="w-4 h-4 inline mr-1" />+{openingData.bonusCards} Bonus Cards!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Listing Dialog */}
      {listingDialogCard && (
        <ListingDialog
          isOpen={!!listingDialogCard}
          onClose={handleListingDialogClose}
          card={listingDialogCard}
          onConfirm={handleListingDialogConfirm}
          isSubmitting={isListingCards}
          progressText={
            selectedCards.length > 1
              ? `Listing ${currentListingIndex + 1} of ${selectedCards.length}`
              : undefined
          }
        />
      )}
    </div>
  );
}

export default function PackOpeningPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-black animate-spin" />
        </div>
      }
    >
      <PackOpeningContent />
    </Suspense>
  );
}
