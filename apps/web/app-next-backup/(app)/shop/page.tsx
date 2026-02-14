"use client";

import { ToolGrid } from "@/components/shared/ToolGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShopInteraction } from "@/hooks/economy/useShopInteraction";
import type { Rarity } from "@/types/cards";
import type { ListingType, SortOption } from "@/types/shop";
import { Loader2, Plus, Search } from "lucide-react";
import {
  CardSelectorModal,
  ListingDialog,
  MarketListingCard,
  MarketListingModal,
  ShopHeader,
  ShopItemCard,
  ShopPurchaseModal,
} from "@/components/marketplace";

export default function ShopPage() {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    gold,
    gems,

    // Data
    packItems,
    boxItems,
    currencyItems,
    filteredGoldListings,
    myListings,
    userCards,

    // Filters
    searchQuery,
    setSearchQuery,
    rarityFilter,
    setRarityFilter,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy,

    // State
    isProcessing,
    selectedShopItem,
    setSelectedShopItem,
    selectedListing,
    setSelectedListing,
    bidAmount,
    setBidAmount,
    isCardSelectorOpen,
    setIsCardSelectorOpen,
    listingDialogCard,
    setListingDialogCard,

    // Handlers
    handleShopPurchase,
    handleMarketPurchase,
    handlePlaceBid,
    handleCreateListing,
    handleCancelListing,
  } = useShopInteraction();

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7] p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-black" />
          <h2 className="text-xl font-black uppercase text-black tracking-wider">Loading Market...</h2>
        </div>
      </div>
    );
  }

  const renderFilters = () => (
    <div className="bg-white border-[3px] border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-4 mb-8">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-slate-50 border-2 border-black/20 focus:border-black rounded-none h-10 font-medium"
        />
      </div>

      <Select value={rarityFilter} onValueChange={(v) => setRarityFilter(v as Rarity | "all")}>
        <SelectTrigger className="w-full md:w-[160px] rounded-none border-2 border-black/20 focus:border-black h-10 font-bold uppercase bg-slate-50">
          <SelectValue placeholder="Rarity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Rarities</SelectItem>
          <SelectItem value="common">Common</SelectItem>
          <SelectItem value="uncommon">Uncommon</SelectItem>
          <SelectItem value="rare">Rare</SelectItem>
          <SelectItem value="epic">Epic</SelectItem>
          <SelectItem value="legendary">Legendary</SelectItem>
        </SelectContent>
      </Select>

      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ListingType | "all")}>
        <SelectTrigger className="w-full md:w-[160px] rounded-none border-2 border-black/20 focus:border-black h-10 font-bold uppercase bg-slate-50">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="fixed">Buy Now</SelectItem>
          <SelectItem value="auction">Auctions</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
        <SelectTrigger className="w-full md:w-[180px] rounded-none border-2 border-black/20 focus:border-black h-10 font-bold uppercase bg-slate-50">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="price_asc">Price: Low to High</SelectItem>
          <SelectItem value="price_desc">Price: High to Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 pb-32">
      <ShopHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        gold={gold}
        gems={gems}
      />

      {activeTab === "shop" && (
        <div className="space-y-12">
          {/* Featured/Packs Section */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-4 w-4 bg-black rotate-45" />
              <h2 className="text-2xl font-black uppercase text-black ink-bleed tracking-tight">
                Booster Packs
              </h2>
              <div className="h-1 bg-black flex-1" />
            </div>

            <ToolGrid>
              {packItems.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  onPurchase={() => setSelectedShopItem(item)}
                />
              ))}
            </ToolGrid>
          </section>

          {/* Boxes Section */}
          {(boxItems.length > 0) && (
            <section>
              <div className="flex items-center gap-4 mb-6 mt-8">
                <div className="h-4 w-4 bg-black rotate-45" />
                <h2 className="text-2xl font-black uppercase text-black ink-bleed tracking-tight">
                  Display Boxes
                </h2>
                <div className="h-1 bg-black flex-1" />
              </div>

              <ToolGrid>
                {boxItems.map((item) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    onPurchase={() => setSelectedShopItem(item)}
                  />
                ))}
              </ToolGrid>
            </section>
          )}

          {/* Currency Section */}
          {(currencyItems.length > 0) && (
            <section>
              <div className="flex items-center gap-4 mb-6 mt-8">
                <div className="h-4 w-4 bg-black rotate-45" />
                <h2 className="text-2xl font-black uppercase text-black ink-bleed tracking-tight">
                  Currency Bundles
                </h2>
                <div className="h-1 bg-black flex-1" />
              </div>

              <ToolGrid>
                {currencyItems.map((item) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    onPurchase={() => setSelectedShopItem(item)}
                  />
                ))}
              </ToolGrid>
            </section>
          )}
        </div>
      )}

      {activeTab === "marketplace" && (
        <div>
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-black uppercase text-black ink-bleed tracking-tight">
              Live Listings
            </h2>
            <Button
              onClick={() => setIsCardSelectorOpen(true)}
              className="rounded-none bg-black text-white hover:bg-black/80 font-bold uppercase tracking-wider h-12 px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              List Item
            </Button>
          </div>

          {renderFilters()}

          <ToolGrid emptyMessage="No listings found matching your filters.">
            {filteredGoldListings.map((listing) => (
              <MarketListingCard
                key={listing._id}
                listing={listing}
                isSelected={selectedListing?._id === listing._id}
                onSelect={() => setSelectedListing(listing)}
                formatTimeRemaining={(endsAt) => {
                  const diff = endsAt - Date.now();
                  if (diff <= 0) return "Ended";
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  return `${hours}h ${minutes}m`;
                }}
              />
            ))}
          </ToolGrid>
        </div>
      )}

      {activeTab === "myListings" && (
        <div>
           <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-black uppercase text-black ink-bleed tracking-tight">
              Your Active Listings
            </h2>
             <Button
              onClick={() => setIsCardSelectorOpen(true)}
              className="rounded-none bg-black text-white hover:bg-black/80 font-bold uppercase tracking-wider h-12 px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              List Item
            </Button>
          </div>

          <ToolGrid emptyMessage="You haven't listed any items yet.">
            {myListings?.map((listing: any) => (
              <div key={listing._id} className="relative group">
                <MarketListingCard
                  listing={listing}
                  isSelected={false}
                  onSelect={() => {}}
                  formatTimeRemaining={(endsAt) => {
                    const diff = endsAt - Date.now();
                    if (diff <= 0) return "Ended";
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    return `${hours}h ${minutes}m`;
                  }}
                />

                <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm flex justify-center items-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelListing(listing._id);
                    }}
                    disabled={isProcessing}
                    className="w-full font-bold uppercase shadow-lg border-2 border-white"
                  >
                    Cancel Listing
                  </Button>
                </div>
              </div>
            ))}
          </ToolGrid>
        </div>
      )}

      {/* Modals */}
      <ShopPurchaseModal
        item={selectedShopItem}
        onClose={() => setSelectedShopItem(null)}
        isProcessing={isProcessing}
        canAffordGold={(amount) => gold >= amount}
        canAffordGems={(amount) => gems >= amount}
        onPurchase={handleShopPurchase}
      />

      <MarketListingModal
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
        isProcessing={isProcessing}
        bidAmount={bidAmount}
        onBidAmountChange={setBidAmount}
        canAffordGold={(amount) => gold >= amount}
        onPlaceBid={handlePlaceBid}
        onMarketPurchase={handleMarketPurchase}
      />

      <CardSelectorModal
        isOpen={isCardSelectorOpen}
        onClose={() => setIsCardSelectorOpen(false)}
        cards={userCards as any} // Cast to any for now to avoid strict type mismatch during build, TODO: fix types
        onSelectCard={(card) => {
          setListingDialogCard(card);
          setIsCardSelectorOpen(false);
        }}
      />

      <ListingDialog
        card={listingDialogCard!}
        isOpen={!!listingDialogCard}
        onClose={() => setListingDialogCard(null)}
        onConfirm={handleCreateListing}
        isSubmitting={isProcessing}
      />
    </div>
  );
}
