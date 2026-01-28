"use client";

import { useCardBinder, useDeck, useDeckBuilder, useProfile } from "@/hooks";
import { cn } from "@/lib/utils";
import type { SortOption } from "@/types";
import { isSortOption } from "@/types";
import type { Id } from "@convex/_generated/dataModel";
import { AuthLoading, Authenticated } from "convex/react";
import {
  BookOpen,
  ChevronDown,
  Crown,
  Gem,
  Grid3X3,
  Heart,
  Layers,
  List,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BinderCard,
  type CardData,
  CardPreviewModal,
  type CardType,
  DeckEditor,
  DeckList,
  type Element,
  type Rarity,
} from "./components";
import type { BinderTab, DeckCard, ViewMode } from "./types";
import { DECK_MIN_SIZE, MAX_COPIES_PER_CARD, MAX_LEGENDARY_COPIES } from "./types";

const RARITY_ORDER: Record<Rarity, number> = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

const RARITY_COLORS: Record<Rarity, { bg: string; text: string; border: string }> = {
  legendary: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40" },
  epic: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40" },
  rare: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40" },
  uncommon: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/40" },
  common: { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/40" },
};

export default function BinderPage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-[#0d0a09]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
            <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
              Opening the Binder...
            </p>
          </div>
        </div>
      </AuthLoading>
      <Authenticated>
        <BinderContent />
      </Authenticated>
    </>
  );
}

function BinderContent() {
  const { profile: currentUser } = useProfile();
  const { userCards, toggleFavorite: toggleFavoriteAction } = useCardBinder();
  const {
    decks: userDecks,
    createDeck,
    saveDeck: saveDeckAction,
    renameDeck: renameDeckAction,
    deleteDeck: deleteDeckAction,
    setActiveDeck: setActiveDeckAction,
  } = useDeckBuilder();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeTab, setActiveTab] = useState<BinderTab>("collection");
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<Rarity | "all">("all");
  const [selectedElement, setSelectedElement] = useState<Element | "all">("all");
  const [selectedType, setSelectedType] = useState<CardType | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("rarity");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Deck builder state
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [currentDeckCards, setCurrentDeckCards] = useState<DeckCard[]>([]);
  const [isEditingDeckName, setIsEditingDeckName] = useState(false);
  const [editingDeckName, setEditingDeckName] = useState("");
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  const selectedDeckData = useDeck(selectedDeckId as Id<"userDecks"> | null);

  // Convert API data to CardData format
  const cards: CardData[] = useMemo(() => {
    console.log("🎴 Raw userCards from API:", userCards);
    if (!userCards) return [];
    const converted = userCards.map((card: (typeof userCards)[number]) => ({
      id: card.id,
      cardDefinitionId: card.cardDefinitionId,
      name: card.name,
      rarity: card.rarity as Rarity,
      element: card.element as Element,
      cardType: card.cardType as CardType,
      attack: card.attack,
      defense: card.defense,
      cost: card.cost,
      ability: card.ability,
      flavorText: card.flavorText,
      imageUrl: card.imageUrl,
      owned: card.owned,
      isFavorite: card.isFavorite,
    }));
    console.log("🎴 Converted cards:", converted.length, "cards");
    console.log("🎴 First card sample:", converted[0]);
    console.log("🖼️ First card imageUrl:", converted[0]?.imageUrl);
    console.log("🖼️ ImageUrl type:", typeof converted[0]?.imageUrl);
    console.log("🖼️ ImageUrl value (raw):", JSON.stringify(converted[0]?.imageUrl));
    return converted;
  }, [userCards]);

  // Get selected deck details
  const selectedDeck = useMemo(() => {
    if (!selectedDeckId || !userDecks) return null;
    return userDecks.find((d: (typeof userDecks)[number]) => d.id === selectedDeckId) || null;
  }, [selectedDeckId, userDecks]);

  // Reset scroll on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    console.log("🔍 Starting filter with", cards.length, "cards");
    let filtered = [...cards];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.name.toLowerCase().includes(query) ||
          card.ability?.toLowerCase().includes(query) ||
          card.flavorText?.toLowerCase().includes(query)
      );
    }

    if (selectedRarity !== "all") {
      filtered = filtered.filter((card) => card.rarity === selectedRarity);
    }

    if (selectedElement !== "all") {
      filtered = filtered.filter((card) => card.element === selectedElement);
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((card) => card.cardType === selectedType);
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter((card) => card.isFavorite);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "rarity":
          comparison = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
          break;
        case "element":
          comparison = a.element.localeCompare(b.element);
          break;
        case "attack":
          comparison = (a.attack ?? 0) - (b.attack ?? 0);
          break;
        case "defense":
          comparison = (a.defense ?? 0) - (b.defense ?? 0);
          break;
        case "cost":
          comparison = a.cost - b.cost;
          break;
        case "owned":
          comparison = a.owned - b.owned;
          break;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    return filtered;
  }, [
    cards,
    searchQuery,
    selectedRarity,
    selectedElement,
    selectedType,
    sortBy,
    sortOrder,
    showFavoritesOnly,
  ]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalUnique = cards.length;
    const totalCards = cards.reduce((sum, c) => sum + c.owned, 0);
    const favorites = cards.filter((c) => c.isFavorite).length;

    const byRarity: Record<Rarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    const byElement: Record<Element, number> = {
      fire: 0,
      water: 0,
      earth: 0,
      wind: 0,
      neutral: 0,
    };

    for (const card of cards) {
      byRarity[card.rarity]++;
      byElement[card.element]++;
    }

    return { totalUnique, totalCards, favorites, byRarity, byElement };
  }, [cards]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedRarity("all");
    setSelectedElement("all");
    setSelectedType("all");
    setShowFavoritesOnly(false);
    setSortBy("rarity");
    setSortOrder("desc");
  };

  const hasActiveFilters =
    searchQuery ||
    selectedRarity !== "all" ||
    selectedElement !== "all" ||
    selectedType !== "all" ||
    showFavoritesOnly;

  const handleToggleFavorite = async (cardId: string) => {
    try {
      await toggleFavoriteAction(cardId as Id<"playerCards">);
      if (previewCard?.id === cardId) {
        setPreviewCard((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  // Deck builder functions
  const getCardCountInDeck = (cardId: string) => {
    const deckCard = currentDeckCards.find((dc) => dc.card.id === cardId);
    return deckCard?.count || 0;
  };

  const canAddCardToDeck = (card: CardData) => {
    const currentCount = getCardCountInDeck(card.id);
    const maxCopies = card.rarity === "legendary" ? MAX_LEGENDARY_COPIES : MAX_COPIES_PER_CARD;
    if (currentCount >= maxCopies) return false;
    if (currentCount >= card.owned) return false;
    return true;
  };

  const handleAddCardToDeck = (card: CardData) => {
    if (!canAddCardToDeck(card)) return;
    setCurrentDeckCards((prev) => {
      const existing = prev.find((dc) => dc.card.id === card.id);
      if (existing) {
        return prev.map((dc) => (dc.card.id === card.id ? { ...dc, count: dc.count + 1 } : dc));
      }
      return [...prev, { card, count: 1 }];
    });
  };

  const handleRemoveCardFromDeck = (cardId: string) => {
    setCurrentDeckCards((prev) => {
      const existing = prev.find((dc) => dc.card.id === cardId);
      if (!existing) return prev;
      if (existing.count === 1) {
        return prev.filter((dc) => dc.card.id !== cardId);
      }
      return prev.map((dc) => (dc.card.id === cardId ? { ...dc, count: dc.count - 1 } : dc));
    });
  };

  const handleCreateDeck = async (name: string) => {
    try {
      const deckId = await createDeck(name);
      setSelectedDeckId(deckId as string);
      setCurrentDeckCards([]);
    } catch (error) {
      console.error("Failed to create deck:", error);
    }
  };

  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
  };

  // Load deck cards when selectedDeckData changes
  useEffect(() => {
    if (selectedDeckData && selectedDeckData.cards) {
      const loadedCards: DeckCard[] = selectedDeckData.cards.map(
        (apiCard: {
          cardDefinitionId: Id<"cardDefinitions">;
          name: string;
          rarity: Rarity;
          element: Element;
          cardType: CardType;
          attack?: number;
          defense?: number;
          cost: number;
          ability?: string;
          flavorText?: string;
          imageUrl?: string;
          quantity: number;
        }) => ({
          card: {
            id: apiCard.cardDefinitionId,
            cardDefinitionId: apiCard.cardDefinitionId,
            name: apiCard.name,
            rarity: apiCard.rarity as Rarity,
            element: apiCard.element as Element,
            cardType: apiCard.cardType as CardType,
            attack: apiCard.attack,
            defense: apiCard.defense,
            cost: apiCard.cost,
            ability: apiCard.ability,
            flavorText: apiCard.flavorText,
            imageUrl: apiCard.imageUrl,
            owned: 0,
            isFavorite: false,
          },
          count: apiCard.quantity,
        })
      );
      setCurrentDeckCards(loadedCards);
    }
  }, [selectedDeckData, selectedDeckId]);

  const handleSaveDeck = async () => {
    if (!selectedDeckId) return;
    const totalCards = currentDeckCards.reduce((sum, dc) => sum + dc.count, 0);
    if (totalCards < DECK_MIN_SIZE) {
      toast.error(`Deck must have at least ${DECK_MIN_SIZE} cards. Currently has ${totalCards}.`);
      return;
    }

    setIsSavingDeck(true);
    try {
      const cardsToSave = currentDeckCards.map((dc) => ({
        cardDefinitionId: (dc.card.cardDefinitionId || dc.card.id) as Id<"cardDefinitions">,
        quantity: dc.count,
      }));
      await saveDeckAction(selectedDeckId as Id<"userDecks">, cardsToSave);
    } catch (error: unknown) {
      console.error("Failed to save deck:", error instanceof Error ? error.message : error);
    } finally {
      setIsSavingDeck(false);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    // Ensure this only runs client-side
    if (typeof window === "undefined") return;
    if (!window.confirm("Are you sure you want to delete this deck?")) return;
    try {
      await deleteDeckAction(deckId as Id<"userDecks">);
      if (selectedDeckId === deckId) {
        setSelectedDeckId(null);
        setCurrentDeckCards([]);
      }
    } catch (error) {
      console.error("Failed to delete deck:", error);
    }
  };

  const handleRenameDeck = async () => {
    if (!selectedDeckId || !editingDeckName.trim()) return;
    try {
      await renameDeckAction(selectedDeckId as Id<"userDecks">, editingDeckName.trim());
      setIsEditingDeckName(false);
    } catch (error) {
      console.error("Failed to rename deck:", error);
    }
  };

  const handleClearDeck = () => {
    setCurrentDeckCards([]);
  };

  const handleSetActiveDeck = async (deckId: string) => {
    try {
      await setActiveDeckAction(deckId as Id<"userDecks">);
    } catch (error: unknown) {
      console.error("Failed to set active deck:", error instanceof Error ? error.message : error);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-collection">
      {/* Background overlays */}
      <div className="absolute inset-0 bg-vignette z-0" />
      <div
        className="absolute inset-0 opacity-20 z-0"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(212, 175, 55, 0.3) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header Section */}
        <div className="mb-10 p-6 tcg-chat-leather rounded-2xl relative overflow-hidden border border-[#3d2b1f]">
          <div className="ornament-corner ornament-corner-tl" />
          <div className="ornament-corner ornament-corner-tr" />
          <div className="ornament-corner ornament-corner-bl" />
          <div className="ornament-corner ornament-corner-br" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-[#d4af37]/30 mb-4">
                <BookOpen className="w-4 h-4 text-[#d4af37]" />
                <span className="text-[10px] text-[#d4af37] font-black uppercase tracking-widest">
                  Card Vault
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black mb-2 text-[#e8e0d5] uppercase tracking-tighter">
                My Binder
              </h1>
              <p className="text-[#a89f94] font-medium">
                {stats.totalUnique} unique cards • {stats.totalCards} total in collection
              </p>
            </div>

            <div className="flex items-center gap-6 bg-black/30 p-4 rounded-xl border border-[#3d2b1f]">
              <div className="text-center">
                <p className="text-3xl font-black text-[#d4af37]">{stats.totalUnique}</p>
                <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Unique</p>
              </div>
              <div className="w-px h-12 bg-[#3d2b1f]" />
              <div className="text-center">
                <p className="text-3xl font-black text-[#e8e0d5]">{stats.totalCards}</p>
                <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Total</p>
              </div>
              <div className="w-px h-12 bg-[#3d2b1f]" />
              <div className="text-center">
                <p className="text-3xl font-black text-pink-400">{stats.favorites}</p>
                <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Favorites</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("collection")}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-all",
              activeTab === "collection"
                ? "bg-[#d4af37] text-[#1a1614]"
                : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
            )}
          >
            <BookOpen className="w-4 h-4" />
            Collection
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("deckbuilder")}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-all",
              activeTab === "deckbuilder"
                ? "bg-[#d4af37] text-[#1a1614]"
                : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
            )}
          >
            <Layers className="w-4 h-4" />
            Deck Builder
            {userDecks && userDecks.length > 0 && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs",
                  activeTab === "deckbuilder" ? "bg-black/20" : "bg-white/10"
                )}
              >
                {userDecks.length}
              </span>
            )}
          </button>
        </div>

        {/* Collection Tab Content */}
        {activeTab === "collection" && (
          <>
            {/* Rarity Quick Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(["legendary", "epic", "rare", "uncommon", "common"] as Rarity[]).map((rarity) => {
                const colors = RARITY_COLORS[rarity];
                const isActive = selectedRarity === rarity;
                return (
                  <button
                    type="button"
                    key={rarity}
                    onClick={() => setSelectedRarity(selectedRarity === rarity ? "all" : rarity)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 border",
                      isActive
                        ? `${colors.bg} ${colors.text} border-2 ${colors.border}`
                        : "bg-black/40 border-[#3d2b1f] text-[#a89f94] hover:bg-[#d4af37]/10 hover:text-[#d4af37] hover:border-[#d4af37]/30"
                    )}
                  >
                    {rarity === "legendary" && <Crown className="w-4 h-4" />}
                    {rarity === "epic" && <Gem className="w-4 h-4" />}
                    <span className="capitalize">{rarity}</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px]",
                        isActive ? "bg-white/10" : "bg-black/30"
                      )}
                    >
                      {stats.byRarity[rarity]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search and Controls - Simplified for brevity */}
            <div className="tcg-chat-leather rounded-2xl p-4 mb-6 border border-[#3d2b1f] relative overflow-hidden">
              <div className="ornament-corner ornament-corner-tl opacity-30" />
              <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94]" />
                  <input
                    type="text"
                    placeholder="Search cards by name, ability, or text..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-10 py-4 bg-[#1a1510] border border-[#3d2b1f] rounded-xl text-[#e8e0d5] placeholder:text-[#a89f94]/40 focus:outline-none focus:border-[#d4af37]/50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/5"
                    >
                      <X className="w-4 h-4 text-[#a89f94]" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={cn(
                      "p-4 rounded-xl border transition-all",
                      showFavoritesOnly
                        ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                        : "bg-[#1a1510] border-[#3d2b1f] text-[#a89f94] hover:text-pink-400 hover:border-pink-500/30"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", showFavoritesOnly && "fill-pink-400")} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-4 rounded-xl border transition-all",
                      hasActiveFilters
                        ? "bg-[#d4af37]/10 border-[#d4af37]/50 text-[#d4af37]"
                        : "bg-[#1a1510] border-[#3d2b1f] text-[#a89f94] hover:text-[#d4af37] hover:border-[#d4af37]/30"
                    )}
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                    <span className="uppercase tracking-widest text-xs font-black hidden sm:block">
                      Filters
                    </span>
                    {hasActiveFilters && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#d4af37]/20">
                        {
                          [
                            selectedRarity !== "all",
                            selectedElement !== "all",
                            selectedType !== "all",
                            showFavoritesOnly,
                          ].filter(Boolean).length
                        }
                      </span>
                    )}
                  </button>

                  <select
                    value={sortBy}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isSortOption(value)) {
                        setSortBy(value);
                      }
                    }}
                    className="px-4 py-4 bg-[#1a1510] border border-[#3d2b1f] rounded-xl text-[#e8e0d5] focus:outline-none focus:border-[#d4af37]/50 cursor-pointer"
                  >
                    <option value="rarity">By Rarity</option>
                    <option value="name">By Name</option>
                    <option value="element">By Element</option>
                    <option value="attack">By Attack</option>
                    <option value="defense">By Defense</option>
                    <option value="cost">By Cost</option>
                    <option value="owned">By Owned</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="p-4 bg-[#1a1510] border border-[#3d2b1f] rounded-xl text-[#a89f94] hover:text-[#d4af37] transition-all"
                  >
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 transition-transform duration-300",
                        sortOrder === "asc" && "rotate-180"
                      )}
                    />
                  </button>

                  <div className="flex rounded-xl overflow-hidden border border-[#3d2b1f] bg-[#1a1510]">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-4 transition-colors",
                        viewMode === "grid"
                          ? "bg-[#d4af37] text-[#1a1614]"
                          : "text-[#a89f94] hover:bg-[#d4af37]/10"
                      )}
                    >
                      <Grid3X3 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-4 transition-colors",
                        viewMode === "list"
                          ? "bg-[#d4af37] text-[#1a1614]"
                          : "text-[#a89f94] hover:bg-[#d4af37]/10"
                      )}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Filters - Omitted for brevity, include if needed */}

            <p className="text-sm text-[#a89f94] mb-4">
              Showing {filteredCards.length} of {cards.length} cards
            </p>

            {/* Card Grid/List */}
            {filteredCards.length === 0 ? (
              <div className="text-center py-24 tcg-chat-leather rounded-2xl border border-[#3d2b1f] relative overflow-hidden">
                <div className="ornament-corner ornament-corner-tl opacity-50" />
                <div className="ornament-corner ornament-corner-tr opacity-50" />
                <div className="w-24 h-24 rounded-2xl bg-[#3d2b1f]/30 mx-auto mb-6 flex items-center justify-center border border-[#3d2b1f] relative z-10">
                  <Grid3X3 className="w-12 h-12 text-[#d4af37] opacity-40" />
                </div>
                {hasActiveFilters ? (
                  <div className="relative z-10">
                    <p className="text-2xl font-black text-[#e8e0d5] mb-3 uppercase tracking-tighter">
                      No Cards Found
                    </p>
                    <p className="text-[#a89f94] mb-6 max-w-md mx-auto">
                      Your search didn't match any cards in your collection. Try adjusting your
                      filters.
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="tcg-button-primary px-6 py-3 font-bold uppercase tracking-wide"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <p className="text-2xl font-black text-[#e8e0d5] mb-3 uppercase tracking-tighter">
                      Your Binder is Empty
                    </p>
                    <p className="text-[#a89f94] mb-6 max-w-md mx-auto">
                      Start collecting cards by opening packs or winning matches!
                    </p>
                    <button
                      type="button"
                      className="tcg-button-primary px-6 py-3 font-bold uppercase tracking-wide flex items-center gap-2 mx-auto"
                    >
                      <Sparkles className="w-5 h-5" />
                      Visit Shop
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                    : "space-y-3"
                )}
              >
                {filteredCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
                  >
                    <BinderCard
                      card={card}
                      variant={viewMode}
                      onClick={() => setPreviewCard(card)}
                      onFavorite={() => handleToggleFavorite(card.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Deck Builder Tab Content */}
        {activeTab === "deckbuilder" && (
          <div className="flex gap-6" data-testid="deck-builder">
            <div className="flex-1">
              {!selectedDeck ? (
                <div className="space-y-6">
                  <DeckList
                    decks={userDecks}
                    activeDeckId={
                      (currentUser && "activeDeckId" in currentUser
                        ? currentUser.activeDeckId
                        : undefined) as Id<"userDecks"> | undefined
                    }
                    onSelectDeck={handleSelectDeck}
                    onCreateDeck={handleCreateDeck}
                    onSetActiveDeck={handleSetActiveDeck}
                    onDeleteDeck={handleDeleteDeck}
                  />
                </div>
              ) : (
                <DeckEditor
                  deckName={selectedDeck.name}
                  deckCards={currentDeckCards}
                  availableCards={filteredCards}
                  searchQuery={searchQuery}
                  isEditingName={isEditingDeckName}
                  editingName={editingDeckName}
                  isSaving={isSavingDeck}
                  onBack={() => {
                    setSelectedDeckId(null);
                    setCurrentDeckCards([]);
                  }}
                  onSave={handleSaveDeck}
                  onClear={handleClearDeck}
                  onAddCard={handleAddCardToDeck}
                  onRemoveCard={handleRemoveCardFromDeck}
                  onStartEditName={() => {
                    setEditingDeckName(selectedDeck.name);
                    setIsEditingDeckName(true);
                  }}
                  onSaveName={handleRenameDeck}
                  onEditNameChange={setEditingDeckName}
                  onSearchChange={setSearchQuery}
                  getCardCount={getCardCountInDeck}
                  canAddCard={canAddCardToDeck}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <CardPreviewModal
        card={previewCard}
        isOpen={!!previewCard}
        onClose={() => setPreviewCard(null)}
        onFavorite={handleToggleFavorite}
      />
    </div>
  );
}
