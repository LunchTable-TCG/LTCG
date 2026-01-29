"use client";

import { ListingDialog } from "@/components/marketplace/ListingDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
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
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface Card {
  cardDefinitionId: Id<"cardDefinitions">;
  playerCardId?: Id<"playerCards">;
  name: string;
  rarity: Rarity;
  isNew?: boolean;
}

const RARITY_CONFIG: Record<Rarity, { color: string; glow: string; bg: string; label: string }> = {
  common: {
    color: "text-gray-300",
    glow: "shadow-gray-400/30",
    bg: "from-gray-600/30 to-gray-800/30",
    label: "Common",
  },
  uncommon: {
    color: "text-green-400",
    glow: "shadow-green-400/30",
    bg: "from-green-600/30 to-green-800/30",
    label: "Uncommon",
  },
  rare: {
    color: "text-blue-400",
    glow: "shadow-blue-400/40",
    bg: "from-blue-600/30 to-blue-800/30",
    label: "Rare",
  },
  epic: {
    color: "text-purple-400",
    glow: "shadow-purple-400/50",
    bg: "from-purple-600/30 to-purple-800/30",
    label: "Epic",
  },
  legendary: {
    color: "text-yellow-400",
    glow: "shadow-yellow-400/60",
    bg: "from-yellow-600/30 to-amber-800/30",
    label: "Legendary",
  },
};

type OpeningPhase = "ready" | "opening" | "revealing" | "complete";

export default function PackOpeningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openingType = searchParams.get("type") || "pack";
  const dataParam = searchParams.get("data");

  const { isAuthenticated } = useAuth();
  const currentUser = useQuery(api.core.users.currentUser, isAuthenticated ? {} : "skip");
  const createListingMutation = useMutation(api.marketplace.createListing);

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
      const timer = setTimeout(() => handleComplete(), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [allRevealed, phase, handleComplete]);

  if (!currentUser || !openingData || cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-purple-900/20 via-[#0d0a09] to-[#0d0a09]" />
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/noise.png')] opacity-5" />

      {/* Magical particles during opening */}
      <AnimatePresence>
        {phase === "opening" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 overflow-hidden pointer-events-none z-10"
          >
            {Array.from({ length: 50 }, (_, i) => `particle-${Date.now()}-${i}`).map((id) => (
              <motion.div
                key={id}
                className="absolute w-2 h-2 bg-[#d4af37] rounded-full"
                style={{
                  left: "50%",
                  top: "50%",
                }}
                animate={{
                  x: (Math.random() - 0.5) * 800,
                  y: (Math.random() - 0.5) * 800,
                  opacity: [1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/shop"
            className="flex items-center gap-2 text-[#a89f94] hover:text-[#e8e0d5] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Shop</span>
          </Link>
          {phase === "complete" && (
            <Button
              onClick={() => router.push("/binder")}
              variant="outline"
              className="border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
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
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotateY: [0, 5, 0, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="relative mb-8"
              >
                <div className="absolute inset-0 bg-[#d4af37]/20 rounded-2xl blur-xl" />
                <div className="relative w-64 h-80 rounded-2xl flex items-center justify-center">
                  <Image
                    src={openingType === "box" ? "/assets/shop/box.png" : "/assets/shop/pack.png"}
                    alt={openingType === "box" ? "Booster Box" : "Booster Pack"}
                    width={256}
                    height={320}
                    className="w-full h-full object-contain drop-shadow-2xl"
                    priority
                  />
                </div>
              </motion.div>

              <h1 className="text-3xl font-black text-[#e8e0d5] mb-2 uppercase tracking-tight">
                {packInfo.name}
              </h1>
              <p className="text-[#a89f94] mb-8">
                {openingType === "box"
                  ? `${openingData.packsOpened} packs with ${packInfo.cardCount} total cards`
                  : `Contains ${packInfo.cardCount} cards`}
              </p>

              <Button
                onClick={handleOpenPack}
                className="bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] text-white font-bold px-12 py-6 text-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {openingType === "box" ? "Open Box" : "Open Pack"}
              </Button>
            </motion.div>
          )}

          {/* Opening Phase - Video Animation */}
          {phase === "opening" && (
            <motion.div
              key="opening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="relative w-full max-w-2xl aspect-video">
                <video
                  autoPlay
                  muted
                  playsInline
                  onEnded={() => setPhase("revealing")}
                  onError={() => {
                    // Fallback to revealing phase if video fails to load
                    console.error("Failed to load pack opening video");
                    setTimeout(() => setPhase("revealing"), 500);
                  }}
                  className="w-full h-full object-contain"
                >
                  <source src="/assets/shop/packopening.mp4" type="video/mp4" />
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
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-[#e8e0d5] mb-2 uppercase tracking-tight">
                  {openingType === "box" ? `Your ${openingData.packsOpened} Packs` : "Your Cards"}
                </h2>
                <p className="text-[#a89f94]">Click each card to reveal, or reveal all at once</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8" data-testid="pack-results">
                {cards.map((card, index) => {
                  const isRevealed = revealedCards.has(index);
                  const config = RARITY_CONFIG[card.rarity];

                  return (
                    <motion.div
                      key={`${card.cardDefinitionId}-${index}`}
                      data-testid="pack-card"
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative aspect-3/4"
                    >
                      <motion.button
                        onClick={() => !isRevealed && handleRevealCard(index)}
                        disabled={isRevealed}
                        className={cn(
                          "w-full h-full rounded-xl overflow-hidden transition-all cursor-pointer",
                          isRevealed ? `shadow-lg ${config.glow}` : "hover:scale-105"
                        )}
                        animate={isRevealed ? { rotateY: [0, 180, 360] } : {}}
                        transition={{ duration: 0.6 }}
                      >
                        {isRevealed ? (
                          <div
                            className={cn(
                              "w-full h-full p-3 bg-linear-to-br border-2 flex flex-col",
                              config.bg,
                              card.rarity === "legendary"
                                ? "border-yellow-400"
                                : card.rarity === "epic"
                                  ? "border-purple-400"
                                  : card.rarity === "rare"
                                    ? "border-blue-400"
                                    : card.rarity === "uncommon"
                                      ? "border-green-400"
                                      : "border-gray-500"
                            )}
                          >
                            {card.isNew && (
                              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500 text-white">
                                NEW
                              </span>
                            )}
                            <div className="flex-1 flex items-center justify-center">
                              <div className="w-full h-full rounded bg-black/30 flex items-center justify-center">
                                <Package className={cn("w-8 h-8", config.color)} />
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-xs font-bold text-[#e8e0d5] truncate">
                                {card.name}
                              </p>
                              <p className={cn("text-[10px] font-medium", config.color)}>
                                {config.label}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-linear-to-br from-[#3d2b1f] to-[#1a1614] border-2 border-[#d4af37]/30 flex items-center justify-center">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 3,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "linear",
                              }}
                            >
                              <Sparkles className="w-8 h-8 text-[#d4af37]/50" />
                            </motion.div>
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
                    className="bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold"
                  >
                    Reveal All Cards
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
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium mb-4"
                >
                  <CheckCircle className="w-4 h-4" />
                  Pack Opened Successfully
                </motion.div>
                <h2 className="text-2xl font-black text-[#e8e0d5] mb-2 uppercase tracking-tight">
                  Your New Cards
                </h2>
                <p className="text-[#a89f94]">Select cards you want to list on the marketplace</p>
              </div>

              {/* Card Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8" data-testid="pack-results">
                {cards.map((card, idx) => {
                  const config = RARITY_CONFIG[card.rarity];
                  const isSelected = selectedForListing.has(card.cardDefinitionId);

                  return (
                    <motion.button
                      key={`${card.cardDefinitionId}-${idx}`}
                      data-testid="pack-card"
                      onClick={() => toggleListingSelection(card.cardDefinitionId)}
                      className={cn(
                        "relative aspect-3/4 rounded-xl overflow-hidden transition-all",
                        isSelected ? "ring-2 ring-[#d4af37] scale-95" : "hover:scale-105",
                        `shadow-lg ${config.glow}`
                      )}
                    >
                      <div
                        className={cn(
                          "w-full h-full p-3 bg-linear-to-br border-2 flex flex-col",
                          config.bg,
                          card.rarity === "legendary"
                            ? "border-yellow-400"
                            : card.rarity === "epic"
                              ? "border-purple-400"
                              : card.rarity === "rare"
                                ? "border-blue-400"
                                : card.rarity === "uncommon"
                                  ? "border-green-400"
                                  : "border-gray-500"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#d4af37]/20 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-[#d4af37] flex items-center justify-center">
                              <Tag className="w-4 h-4 text-[#1a1614]" />
                            </div>
                          </div>
                        )}
                        {card.isNew && (
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500 text-white">
                            NEW
                          </span>
                        )}
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-full h-full rounded bg-black/30 flex items-center justify-center">
                            <Package className={cn("w-8 h-8", config.color)} />
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-bold text-[#e8e0d5] truncate">{card.name}</p>
                          <p className={cn("text-[10px] font-medium", config.color)}>
                            {config.label}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {selectedForListing.size > 0 && (
                  <Button
                    onClick={handleListSelected}
                    disabled={isListingCards}
                    className="w-full sm:w-auto bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold px-8"
                  >
                    {isListingCards ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Listing...
                      </>
                    ) : (
                      <>
                        <Store className="w-4 h-4 mr-2" />
                        List {selectedForListing.size} Card{selectedForListing.size > 1 ? "s" : ""}{" "}
                        on Marketplace
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={() => router.push("/binder")}
                  variant="outline"
                  className="w-full sm:w-auto border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] px-8"
                  disabled={isListingCards}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Go to Collection
                </Button>
                <Button
                  onClick={() => router.push("/shop")}
                  variant="ghost"
                  className="w-full sm:w-auto text-[#a89f94] hover:text-[#e8e0d5]"
                  disabled={isListingCards}
                >
                  Open Another Pack
                </Button>
              </div>

              {/* Stats Summary */}
              <div className="mt-12 p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
                <h3 className="text-lg font-bold text-[#e8e0d5] mb-4">
                  {openingType === "box" ? "Box Summary" : "Pack Summary"}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {(["common", "uncommon", "rare", "epic", "legendary"] as Rarity[]).map(
                    (rarity) => {
                      const count = cards.filter((c) => c.rarity === rarity).length;
                      const config = RARITY_CONFIG[rarity];
                      return (
                        <div key={rarity} className="text-center">
                          <div className={cn("text-2xl font-black", config.color)}>{count}</div>
                          <div className="text-xs text-[#a89f94]">{config.label}</div>
                        </div>
                      );
                    }
                  )}
                </div>
                {openingType === "box" && (openingData.bonusCards ?? 0) > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#3d2b1f] text-center">
                    <p className="text-sm text-[#d4af37]">
                      <Sparkles className="w-4 h-4 inline mr-1" />+{openingData.bonusCards} Bonus
                      Cards!
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
