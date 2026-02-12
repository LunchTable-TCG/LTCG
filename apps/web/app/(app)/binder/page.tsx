"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBinderInteraction, useProfile } from "@/hooks";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { AuthLoading, Authenticated } from "convex/react";
import {
  BookOpen,
  Layers,
  Loader2,
  Sparkles,
  Grid3X3,
} from "lucide-react";
import { useEffect } from "react";
import {
  BinderCard,
  CardPreviewModal,
  DeckEditor,
  DeckList,
  BinderHeader,
  BinderFilters,
} from "./components";

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
  const {
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    previewCard,
    setPreviewCard,
    searchQuery,
    setSearchQuery,
    selectedRarity,
    setSelectedRarity,
    selectedElement,
    setSelectedElement,
    selectedType,
    setSelectedType,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    showFilters,
    setShowFilters,
    showFavoritesOnly,
    setShowFavoritesOnly,
    filteredCards,
    cards,
    stats,
    hasActiveFilters,
    clearFilters,
    toggleFavorite,
    setSelectedDeckId,
    currentDeckCards,
    isEditingDeckName,
    setIsEditingDeckName,
    editingDeckName,
    setEditingDeckName,
    isSavingDeck,
    selectedDeck,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    clearDeckConfirmOpen,
    setClearDeckConfirmOpen,
    addCardToDeck,
    removeCardFromDeck,
    handleCreateDeck,
    handleSaveDeck,
    confirmDeleteDeck,
    handleRenameDeck,
    clearDeck,
    handleSetActiveDeck,
    userDecks,
    getCardCountInDeck,
    canAddCardToDeck,
  } = useBinderInteraction();

  // Reset scroll on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
  };

  const handleDeleteDeck = (_deckId: string) => {
    setDeleteConfirmOpen(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-collection">
      {/* Background overlays */}
      <div className="absolute inset-0 bg-vignette z-0" />
      <div
        className="absolute inset-0 opacity-20 z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(212, 175, 55, 0.3) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        <BinderHeader stats={stats} />

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
            <BinderFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedRarity={selectedRarity}
              setSelectedRarity={setSelectedRarity}
              selectedElement={selectedElement}
              setSelectedElement={setSelectedElement}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              showFavoritesOnly={showFavoritesOnly}
              setShowFavoritesOnly={setShowFavoritesOnly}
              viewMode={viewMode}
              setViewMode={setViewMode}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
              rarityStats={stats.byRarity}
            />

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
                      onFavorite={() => toggleFavorite(card.id)}
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
                  }}
                  onSave={handleSaveDeck}
                  onClear={() => setClearDeckConfirmOpen(true)}
                  onAddCard={addCardToDeck}
                  onRemoveCard={removeCardFromDeck}
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
        onFavorite={() => previewCard && toggleFavorite(previewCard.id)}
      />

      {/* Delete Deck Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deck? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDeck}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Deck Confirmation Dialog */}
      <AlertDialog open={clearDeckConfirmOpen} onOpenChange={setClearDeckConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Deck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove all cards from this deck? You will need to add cards
              again before saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearDeck()}>Clear Deck</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
