"use client";

import {
  CardSelectorModal,
  CurrencyCard,
  CurrencySelector,
  ElizaOSDiscountBadge,
  ListingDialog,
  MarketListingCard,
  MarketListingModal,
  PaymentInfoCard,
  ShopItemCard,
  ShopPurchaseModal,
  TokenListingCard,
  TokenListingDialog,
  TokenPurchaseFlow,
} from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShopInteraction } from "@/hooks";
import { getAssetUrl } from "@/lib/blob";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/cards";
import type { Id } from "@convex/_generated/dataModel";
import { Coins, Gem, Loader2, Package, Plus, Search, Store, Users, X } from "lucide-react";

import type { MarketListing, ShopItem, ShopTab as TabType, TokenListing } from "@/types/shop";

export default function ShopPage() {
  const {
    gold: goldBalance,
    gems: gemBalance,
    currentUser,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    rarityFilter,
    setRarityFilter,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy,
    currencyFilter,
    setCurrencyFilter,
    isProcessing,
    selectedListing,
    setSelectedListing,
    selectedShopItem,
    setSelectedShopItem,
    selectedTokenListing,
    setSelectedTokenListing,
    bidAmount,
    setBidAmount,
    isCardSelectorOpen,
    setIsCardSelectorOpen,
    listingCurrencyType,
    setListingCurrencyType,
    listingDialogCard,
    setListingDialogCard,
    tokenListingCard,
    setTokenListingCard,
    packItems,
    boxItems,
    currencyItems,
    filteredGoldListings,
    filteredTokenListings,
    myListings,
    userCards,
    handleShopPurchase,
    handleMarketPurchase,
    handlePlaceBid,
    handleCreateListing,
    handleCancelListing,
  } = useShopInteraction();

  const formatTimeRemaining = (endsAt: number) => {
    const remaining = endsAt - Date.now();
    if (remaining <= 0) return "Ended";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const canAffordGold = (amount: number) => goldBalance >= amount;
  const canAffordGems = (amount: number) => gemBalance >= amount;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          <p className="text-[#a89f94]">Loading shop...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="shop" className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${getAssetUrl("/assets/backgrounds/shop-bg.png")}')` }}
      />
      <div className="absolute inset-0 bg-black/60 z-0" />
      <div className="absolute inset-0 bg-vignette z-0" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#e8e0d5] mb-2">Shop & Market</h1>
            <p className="text-[#a89f94]">Purchase packs or trade with other players</p>
            <div className="mt-3 flex items-center gap-3">
              <ElizaOSDiscountBadge />
              <PaymentInfoCard variant="compact" />
            </div>
          </div>

          {/* Balance Display */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span data-testid="player-gold" className="text-lg font-bold text-yellow-300">
                {goldBalance.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <Gem className="w-5 h-5 text-purple-400" />
              <span className="text-lg font-bold text-purple-300">
                {gemBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
          {[
            { id: "shop" as TabType, label: "Shop", icon: Store },
            { id: "marketplace" as TabType, label: "Marketplace", icon: Users },
            { id: "myListings" as TabType, label: "My Listings", icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const listingCount = tab.id === "myListings" ? (myListings?.length ?? 0) : 0;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-all text-sm sm:text-base",
                  isActive
                    ? "bg-[#d4af37] text-[#1a1614]"
                    : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.id === "myListings" && listingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-[#d4af37]/20 text-[#d4af37]">
                    {listingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Shop Tab */}
        {activeTab === "shop" && (
          <div className="space-y-10">
            {/* Card Packs Section */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-6 h-6 text-[#d4af37]" />
                <h2 className="text-xl font-bold text-[#e8e0d5]">Card Packs</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {packItems.map((item: ShopItem) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    onPurchase={() => setSelectedShopItem(item)}
                  />
                ))}
              </div>
            </section>

            {/* Boxes Section */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Box className="w-6 h-6 text-[#d4af37]" />
                <h2 className="text-xl font-bold text-[#e8e0d5]">Boxes</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {boxItems.map((item: ShopItem) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    onPurchase={() => setSelectedShopItem(item)}
                  />
                ))}
              </div>
            </section>

            {/* Currency Section */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Coins className="w-6 h-6 text-[#d4af37]" />
                <h2 className="text-xl font-bold text-[#e8e0d5]">Currency</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currencyItems.map((item: ShopItem) => (
                  <CurrencyCard
                    key={item.id}
                    item={item}
                    onPurchase={() => setSelectedShopItem(item)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === "marketplace" && (
          <>
            {/* Currency Selector */}
            <div className="mb-6">
              <CurrencySelector
                value={currencyFilter}
                onChange={setCurrencyFilter}
                className="max-w-lg"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a89f94]" />
                <Input
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-black/40 border-[#3d2b1f] text-[#e8e0d5]"
                />
              </div>
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value as Rarity | "all")}
                className="px-4 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5]"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
              {/* Type filter only shown for gold (auction not supported for tokens) */}
              {currencyFilter === "gold" && (
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as "all" | "fixed" | "auction")}
                  className="px-4 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5]"
                >
                  <option value="all">All Types</option>
                  <option value="fixed">Buy Now</option>
                  <option value="auction">Auction</option>
                </select>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5]"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <Button
                onClick={() => {
                  setListingCurrencyType(currencyFilter);
                  setActiveTab("myListings");
                }}
                className="tcg-button-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                List Card
              </Button>
            </div>

            {/* Gold Listings Grid */}
            {currencyFilter === "gold" &&
              (filteredGoldListings.length === 0 ? (
                <div className="text-center py-16">
                  <Store className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
                  <h3 className="text-xl font-semibold text-[#e8e0d5] mb-2">No Listings Found</h3>
                  <p className="text-[#a89f94]">Try adjusting your filters or check back later</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredGoldListings.map((listing: MarketListing) => (
                    <MarketListingCard
                      key={listing._id}
                      listing={listing}
                      onSelect={() => setSelectedListing(listing)}
                      isSelected={selectedListing?._id === listing._id}
                      formatTimeRemaining={formatTimeRemaining}
                    />
                  ))}
                </div>
              ))}

            {/* Token Listings Grid */}
            {currencyFilter === "token" &&
              (filteredTokenListings.length === 0 ? (
                <div className="text-center py-16">
                  <Store className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
                  <h3 className="text-xl font-semibold text-[#e8e0d5] mb-2">
                    No Token Listings Found
                  </h3>
                  <p className="text-[#a89f94]">Be the first to list a card for LTCG tokens!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredTokenListings.map((listing: TokenListing) => (
                    <TokenListingCard
                      key={listing._id}
                      listing={listing}
                      onSelect={() => setSelectedTokenListing(listing)}
                      isSelected={selectedTokenListing?._id === listing._id}
                    />
                  ))}
                </div>
              ))}

            {/* Platform fee notice */}
            <div className="mt-8 p-4 rounded-lg bg-black/40 border border-[#3d2b1f] text-sm text-[#a89f94]">
              <p>
                <strong className="text-[#e8e0d5]">Note:</strong> A 5% platform fee is applied to
                all marketplace purchases.
              </p>
            </div>
          </>
        )}

        {/* My Listings Tab */}
        {activeTab === "myListings" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-[#e8e0d5]">My Active Listings</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setListingCurrencyType("gold");
                    setIsCardSelectorOpen(true);
                  }}
                  variant="outline"
                  className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  List for Gold
                </Button>
                <Button
                  onClick={() => {
                    setListingCurrencyType("token");
                    setIsCardSelectorOpen(true);
                  }}
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Gem className="w-4 h-4 mr-2" />
                  List for Token
                </Button>
              </div>
            </div>

            {myListings === undefined ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
              </div>
            ) : myListings.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
                <h3 className="text-xl font-semibold text-[#e8e0d5] mb-2">No Active Listings</h3>
                <p className="text-[#a89f94] mb-6">
                  You don't have any cards listed on the marketplace yet
                </p>
                <Button onClick={() => setActiveTab("marketplace")} className="tcg-button-primary">
                  Browse Marketplace
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myListings.map((listing: MarketListing & { _id: Id<"marketplaceListings"> }) => (
                  <div
                    key={listing._id}
                    className="p-4 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#3d2b1f]/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Card Preview */}
                      <div className="w-16 aspect-3/4 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center shrink-0">
                        <Package className="w-8 h-8 text-purple-400/50" />
                      </div>

                      {/* Listing Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#e8e0d5] truncate">
                            {listing.cardName}
                          </h3>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded font-bold",
                              listing.listingType === "auction"
                                ? "bg-orange-600 text-white"
                                : "bg-green-600 text-white"
                            )}
                          >
                            {listing.listingType === "auction" ? "Auction" : "Buy Now"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#a89f94]">
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-yellow-400" />
                            <span className="font-bold text-yellow-300">
                              {listing.listingType === "auction" && listing.currentBid
                                ? listing.currentBid.toLocaleString()
                                : listing.price.toLocaleString()}
                            </span>
                          </div>
                          {listing.listingType === "auction" && listing.endsAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatTimeRemaining(listing.endsAt)}</span>
                            </div>
                          )}
                          {listing.listingType === "auction" && (
                            <span>{listing.bidCount || 0} bids</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <Button
                        onClick={() => handleCancelListing(listing._id)}
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0"
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Card Selector Modal */}
        <CardSelectorModal
          isOpen={isCardSelectorOpen}
          onClose={() => setIsCardSelectorOpen(false)}
          cards={userCards?.map((card) => ({
            cardDefinitionId: card.cardDefinitionId,
            playerCardId: card.id as Id<"playerCards">,
            name: card.name,
            rarity: card.rarity as Rarity,
            quantity: card.owned,
          }))}
          onSelectCard={(card) => {
            // Route to appropriate listing dialog based on currency selection
            if (listingCurrencyType === "token") {
              setTokenListingCard({
                _id: card.playerCardId,
                name: card.name,
                rarity: card.rarity,
                quantity: card.quantity,
              });
            } else {
              setListingDialogCard({
                cardDefinitionId: card.cardDefinitionId,
                name: card.name,
                rarity: card.rarity,
              });
            }
          }}
        />

        {/* Gold Listing Dialog */}
        {listingDialogCard && (
          <ListingDialog
            isOpen={!!listingDialogCard}
            onClose={() => setListingDialogCard(null)}
            card={listingDialogCard}
            onConfirm={handleCreateListing}
          />
        )}

        {/* Token Listing Dialog */}
        {tokenListingCard && (
          <TokenListingDialog
            card={tokenListingCard}
            open={!!tokenListingCard}
            onOpenChange={(open) => {
              if (!open) setTokenListingCard(null);
            }}
            onSuccess={() => {
              setTokenListingCard(null);
              // Optionally switch to view token marketplace
              setCurrencyFilter("token");
              setActiveTab("marketplace");
            }}
          />
        )}

        {/* Shop Purchase Modal */}
        <ShopPurchaseModal
          item={selectedShopItem}
          onClose={() => setSelectedShopItem(null)}
          isProcessing={isProcessing}
          canAffordGold={canAffordGold}
          canAffordGems={canAffordGems}
          onPurchase={handleShopPurchase}
        />

        {/* Marketplace Listing Modal */}
        <MarketListingModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          isProcessing={isProcessing}
          bidAmount={bidAmount}
          onBidAmountChange={setBidAmount}
          canAffordGold={canAffordGold}
          onPlaceBid={handlePlaceBid}
          onMarketPurchase={handleMarketPurchase}
        />

        {/* Token Purchase Flow */}
        {selectedTokenListing && (
          <TokenPurchaseFlow
            listing={{
              _id: selectedTokenListing._id,
              tokenPrice: selectedTokenListing.tokenPrice,
              card: {
                name: selectedTokenListing.cardName,
                imageUrl: selectedTokenListing.cardImageUrl,
                rarity: selectedTokenListing.cardRarity,
              },
              seller: {
                username: selectedTokenListing.sellerUsername,
              },
            }}
            open={!!selectedTokenListing}
            onOpenChange={(open) => {
              if (!open) setSelectedTokenListing(null);
            }}
            onSuccess={() => {
              setSelectedTokenListing(null);
              // Refresh the token listings query happens automatically via Convex reactivity
            }}
          />
        )}
      </div>
    </div>
  );
}
