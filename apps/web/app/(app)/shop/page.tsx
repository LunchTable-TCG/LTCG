"use client";

import {
  CardSelectorModal,
  CurrencySelector,
  ElizaOSDiscountBadge,
  ListingDialog,
  PaymentInfoCard,
  TokenListingDialog,
  TokenPurchaseFlow,
} from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrency, useMarketplace, useProfile, useShop } from "@/hooks";
import { getAssetUrl } from "@/lib/blob";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Box,
  Clock,
  Coins,
  Gavel,
  Gem,
  Loader2,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

type TabType = "shop" | "marketplace" | "myListings";
type ListingType = "fixed" | "auction";
type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

// Shop item types
interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: "pack" | "box" | "currency";
  goldPrice?: number;
  gemPrice?: number;
  contents?: string;
  quantity?: number;
  productId: string;
  productType: "pack" | "box" | "currency";
}

// Marketplace listing types
interface MarketListing {
  _id: string;
  sellerId: string;
  sellerName?: string;
  sellerUsername?: string;
  listingType: ListingType;
  cardName: string;
  cardRarity: Rarity;
  cardImageUrl?: string;
  quantity: number;
  price: number;
  tokenPrice?: number;
  currencyType?: "gold" | "token";
  currentBid?: number;
  highestBidderId?: string;
  bidCount?: number;
  endsAt?: number;
  createdAt: number;
}

// Token listing type (from getTokenListings query)
interface TokenListing {
  _id: Id<"marketplaceListings">;
  sellerId: Id<"users">;
  sellerUsername: string;
  cardDefinitionId: Id<"cardDefinitions">;
  cardName: string;
  cardType: string;
  cardRarity: Rarity;
  cardArchetype: string;
  cardImageUrl?: string;
  cardAttack?: number;
  cardDefense?: number;
  cardCost?: number;
  quantity: number;
  tokenPrice: number;
  currencyType: "token";
  createdAt: number;
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const PLATFORM_FEE = 0.05;
const TOKEN_DECIMALS = 6;

export default function ShopPage() {
  const { profile: currentUser } = useProfile();

  const [activeTab, setActiveTab] = useState<TabType>("shop");
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "fixed" | "auction">("all");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "newest">("newest");
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [listingDialogCard, setListingDialogCard] = useState<{
    cardDefinitionId: Id<"cardDefinitions">;
    name: string;
    rarity: Rarity;
  } | null>(null);
  const [isCardSelectorOpen, setIsCardSelectorOpen] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState<"gold" | "token">("gold");
  const [listingCurrencyType, setListingCurrencyType] = useState<"gold" | "token">("gold");
  const [tokenListingCard, setTokenListingCard] = useState<{
    _id: Id<"playerCards">;
    name: string;
    imageUrl?: string;
    rarity: Rarity;
    quantity: number;
  } | null>(null);
  const [selectedTokenListing, setSelectedTokenListing] = useState<TokenListing | null>(null);

  // Use custom hooks
  const {
    products: shopProducts,
    purchasePack: purchasePackAction,
    purchaseBox: purchaseBoxAction,
    purchaseBundle,
  } = useShop();
  const { gold: goldBalance, gems: gemBalance } = useCurrency();
  const {
    listings: marketplaceListings,
    myListings,
    buyNow: buyNowAction,
    placeBid: placeBidAction,
    cancelListing,
  } = useMarketplace();

  // Get user's collection for listing cards
  const userCards = useQuery(api.core.cards.getUserCards, currentUser ? {} : "skip");

  // Token marketplace queries
  const tokenListingsQuery = useQuery(
    api.economy.tokenMarketplace.getTokenListings,
    currencyFilter === "token" && activeTab === "marketplace" ? {} : "skip"
  );

  // Mutations
  const createListingMutation = useMutation(api.marketplace.createListing);

  // Filter marketplace listings (gold)
  const filteredGoldListings = useMemo(() => {
    if (currencyFilter !== "gold") return [];
    let listings = marketplaceListings?.listings ?? [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      listings = listings.filter((listing: MarketListing) =>
        listing.cardName.toLowerCase().includes(query)
      );
    }

    return listings;
  }, [searchQuery, marketplaceListings, currencyFilter]);

  // Filter token listings
  const filteredTokenListings = useMemo((): TokenListing[] => {
    if (currencyFilter !== "token") return [];
    const listings = (tokenListingsQuery?.listings ?? []) as TokenListing[];

    if (!searchQuery) return listings;

    const query = searchQuery.toLowerCase();
    return listings.filter((listing) => listing.cardName.toLowerCase().includes(query));
  }, [searchQuery, tokenListingsQuery, currencyFilter]);

  // Transform backend data to frontend format
  const transformedShopItems = useMemo(() => {
    if (!shopProducts) return [];
    return shopProducts.map(
      (product: {
        productId: string;
        name: string;
        description: string;
        productType: "pack" | "box" | "currency";
        goldPrice?: number;
        gemPrice?: number;
        packConfig?: { cardCount: number };
        boxConfig?: { packCount: number };
        currencyConfig?: { amount: number };
      }): ShopItem => ({
        ...product, // Include original for mutations first
        id: product.productId,
        type: product.productType,
        contents: product.packConfig
          ? `${product.packConfig.cardCount} Cards`
          : product.boxConfig
            ? `${product.boxConfig.packCount} Packs`
            : undefined,
        quantity: product.currencyConfig?.amount,
      })
    );
  }, [shopProducts]);

  // Group shop items by type
  const packItems = useMemo(
    () => transformedShopItems.filter((item: ShopItem) => item.type === "pack"),
    [transformedShopItems]
  );
  const boxItems = useMemo(
    () => transformedShopItems.filter((item: ShopItem) => item.type === "box"),
    [transformedShopItems]
  );
  const currencyItems = useMemo(
    () => transformedShopItems.filter((item: ShopItem) => item.type === "currency"),
    [transformedShopItems]
  );

  const handleShopPurchase = useCallback(
    async (
      item: { productId: string; productType: "pack" | "box" | "currency" },
      useGems: boolean
    ) => {
      setIsProcessing(true);
      try {
        if (item.productType === "pack") {
          const result = await purchasePackAction(item.productId, useGems);
          setSelectedShopItem(null);
          // Redirect to opening page with pack results
          const cardsData = encodeURIComponent(JSON.stringify(result));
          window.location.href = `/shop/open?type=pack&data=${cardsData}`;
        } else if (item.productType === "box") {
          const result = await purchaseBoxAction(item.productId, useGems);
          setSelectedShopItem(null);
          // Redirect to opening page with box results
          const cardsData = encodeURIComponent(JSON.stringify(result));
          window.location.href = `/shop/open?type=box&data=${cardsData}`;
        } else if (item.productType === "currency") {
          await purchaseBundle(item.productId);
          setSelectedShopItem(null);
        }
      } catch (error: unknown) {
        console.error("Purchase failed:", error instanceof Error ? error.message : error);
        setIsProcessing(false);
      }
    },
    [purchasePackAction, purchaseBoxAction, purchaseBundle]
  );

  const handleMarketPurchase = useCallback(
    async (listing: { _id: string }) => {
      setIsProcessing(true);
      try {
        await buyNowAction(listing._id as Id<"marketplaceListings">);
        setSelectedListing(null);
      } catch (error: unknown) {
        console.error("Purchase failed:", error instanceof Error ? error.message : error);
      } finally {
        setIsProcessing(false);
      }
    },
    [buyNowAction]
  );

  const handlePlaceBid = useCallback(
    async (listing: { _id: string }) => {
      if (!bidAmount) return;
      setIsProcessing(true);
      try {
        await placeBidAction(listing._id as Id<"marketplaceListings">, Number.parseInt(bidAmount));
        setBidAmount("");
        setSelectedListing(null);
      } catch (error: unknown) {
        console.error("Bid failed:", error instanceof Error ? error.message : error);
      } finally {
        setIsProcessing(false);
      }
    },
    [bidAmount, placeBidAction]
  );

  const handleCreateListing = useCallback(
    async (listingType: "fixed" | "auction", price: number, duration?: number) => {
      if (!listingDialogCard) return;

      await createListingMutation({
        cardDefinitionId: listingDialogCard.cardDefinitionId,
        quantity: 1,
        listingType,
        price,
        duration,
      });
      setListingDialogCard(null);
    },
    [listingDialogCard, createListingMutation]
  );

  const handleCancelListing = useCallback(
    async (listingId: Id<"marketplaceListings">) => {
      setIsProcessing(true);
      try {
        await cancelListing(listingId);
      } catch (error: unknown) {
        console.error("Cancel failed:", error instanceof Error ? error.message : error);
      } finally {
        setIsProcessing(false);
      }
    },
    [cancelListing]
  );

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
              (tokenListingsQuery === undefined ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
                </div>
              ) : filteredTokenListings.length === 0 ? (
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

        {/* Shop Purchase Dialog */}
        {selectedShopItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1614] border border-[#3d2b1f] rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#e8e0d5]">Purchase Item</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedShopItem(null)}
                  className="text-[#a89f94]"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-[#d4af37]/20 flex items-center justify-center">
                  {selectedShopItem.type === "pack" && (
                    <Package className="w-10 h-10 text-[#d4af37]" />
                  )}
                  {selectedShopItem.type === "box" && <Box className="w-10 h-10 text-[#d4af37]" />}
                  {selectedShopItem.type === "currency" && (
                    <Coins className="w-10 h-10 text-[#d4af37]" />
                  )}
                </div>
                <h3 className="font-bold text-[#e8e0d5] text-lg">{selectedShopItem.name}</h3>
                <p className="text-[#a89f94] text-sm">{selectedShopItem.description}</p>
                {selectedShopItem.contents && (
                  <p className="text-[#d4af37] text-sm mt-1">{selectedShopItem.contents}</p>
                )}
                {selectedShopItem.quantity && (
                  <p className="text-yellow-400 font-bold mt-2">
                    +{selectedShopItem.quantity.toLocaleString()} Gold
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {selectedShopItem.goldPrice && (
                  <Button
                    onClick={() => handleShopPurchase(selectedShopItem, false)}
                    disabled={isProcessing || !canAffordGold(selectedShopItem.goldPrice)}
                    className="w-full justify-between bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-600/30"
                  >
                    <span>Pay with Gold</span>
                    <span className="flex items-center gap-1">
                      <Coins className="w-4 h-4" />
                      {selectedShopItem.goldPrice.toLocaleString()}
                    </span>
                  </Button>
                )}
                {selectedShopItem.gemPrice && (
                  <Button
                    onClick={() => handleShopPurchase(selectedShopItem, true)}
                    disabled={isProcessing || !canAffordGems(selectedShopItem.gemPrice)}
                    className="w-full justify-between bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30"
                  >
                    <span>Pay with Gems</span>
                    <span className="flex items-center gap-1">
                      <Gem className="w-4 h-4" />
                      {selectedShopItem.gemPrice.toLocaleString()}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Marketplace Purchase/Bid Dialog */}
        {selectedListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1614] border border-[#3d2b1f] rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#e8e0d5]">
                  {selectedListing.listingType === "auction" ? "Place Bid" : "Purchase"}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedListing(null)}
                  className="text-[#a89f94]"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-black/40">
                <div className="w-16 aspect-3/4 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                  <Package className="w-8 h-8 text-purple-400/50" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#e8e0d5]">{selectedListing.cardName}</h3>
                  <p className={cn("text-sm", RARITY_COLORS[selectedListing.cardRarity])}>
                    {selectedListing.cardRarity}
                  </p>
                  <p className="text-xs text-[#a89f94]">Seller: {selectedListing.sellerName}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {selectedListing.listingType === "auction" ? (
                  <>
                    <div className="flex justify-between text-[#a89f94]">
                      <span>Current Bid:</span>
                      <span className="font-bold flex items-center gap-1 text-[#e8e0d5]">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        {(selectedListing.currentBid || selectedListing.price).toLocaleString()}
                      </span>
                    </div>
                    <Input
                      type="number"
                      placeholder="Enter bid amount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="bg-black/40 border-[#3d2b1f] text-[#e8e0d5]"
                    />
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-[#a89f94]">
                      <span>Price:</span>
                      <span className="font-bold flex items-center gap-1 text-[#e8e0d5]">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        {selectedListing.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-[#a89f94]">
                      <span>Platform Fee (5%):</span>
                      <span>
                        {Math.ceil(selectedListing.price * PLATFORM_FEE).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t border-[#3d2b1f] pt-3 text-[#e8e0d5]">
                      <span>Total:</span>
                      <span className="text-yellow-300">
                        {Math.ceil(selectedListing.price * (1 + PLATFORM_FEE)).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedListing(null)}
                  className="flex-1 border-[#3d2b1f]"
                >
                  Cancel
                </Button>
                {selectedListing.listingType === "auction" ? (
                  <Button
                    onClick={() => handlePlaceBid(selectedListing)}
                    disabled={
                      isProcessing ||
                      !bidAmount ||
                      Number.parseInt(bidAmount, 10) <=
                        (selectedListing.currentBid || selectedListing.price)
                    }
                    className="flex-1 bg-orange-600 hover:bg-orange-500"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Gavel className="w-4 h-4 mr-2" />
                        Place Bid
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleMarketPurchase(selectedListing)}
                    disabled={
                      isProcessing ||
                      !canAffordGold(Math.ceil(selectedListing.price * (1 + PLATFORM_FEE)))
                    }
                    className="flex-1 bg-green-600 hover:bg-green-500"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy Now
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

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

// Shop Item Card Component
function ShopItemCard({ item, onPurchase }: { item: ShopItem; onPurchase: () => void }) {
  return (
    <div
      data-testid="pack-product"
      className="p-4 rounded-xl border border-[#3d2b1f] bg-black/40 hover:bg-black/60 transition-all"
    >
      <div className="aspect-square rounded-lg bg-linear-to-br from-[#d4af37]/10 to-transparent flex items-center justify-center mb-4 overflow-hidden">
        {item.type === "pack" && (
          <Image
            src={getAssetUrl("/assets/shop/pack.png")}
            alt="Booster Pack"
            width={200}
            height={200}
            className="w-full h-full object-contain"
          />
        )}
        {item.type === "box" && (
          <Image
            src={getAssetUrl("/assets/shop/box.png")}
            alt="Booster Box"
            width={200}
            height={200}
            className="w-full h-full object-contain"
          />
        )}
      </div>
      <h3 className="font-bold text-[#e8e0d5] mb-1">{item.name}</h3>
      <p className="text-sm text-[#a89f94] mb-2">{item.description}</p>
      {item.contents && <p className="text-xs text-[#d4af37] mb-3">{item.contents}</p>}
      <div className="flex flex-col gap-2">
        {item.goldPrice && (
          <Button
            onClick={onPurchase}
            variant="outline"
            className="w-full justify-between border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
            size="sm"
            data-testid="pack-price"
          >
            <Coins className="w-4 h-4" />
            <span>{item.goldPrice.toLocaleString()}</span>
          </Button>
        )}
        {item.gemPrice && (
          <Button
            onClick={onPurchase}
            variant="outline"
            className="w-full justify-between border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            size="sm"
            data-testid="pack-price"
          >
            <Gem className="w-4 h-4" />
            <span>{item.gemPrice.toLocaleString()}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// Currency Card Component
function CurrencyCard({ item, onPurchase }: { item: ShopItem; onPurchase: () => void }) {
  return (
    <div className="p-4 rounded-xl border border-[#3d2b1f] bg-black/40 hover:bg-black/60 transition-all">
      <div className="aspect-square rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4 relative">
        <Coins className="w-20 h-20 text-yellow-400" />
        <Sparkles className="absolute top-2 right-2 w-6 h-6 text-yellow-300 animate-pulse" />
      </div>
      <h3 className="font-bold text-[#e8e0d5] mb-1">{item.name}</h3>
      <p className="text-2xl font-bold text-yellow-400 mb-1">+{item.quantity?.toLocaleString()}</p>
      <p className="text-sm text-[#a89f94] mb-3">{item.description}</p>
      {item.gemPrice && (
        <Button
          onClick={onPurchase}
          className="w-full justify-between bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30"
        >
          <Gem className="w-4 h-4" />
          <span>{item.gemPrice.toLocaleString()}</span>
        </Button>
      )}
    </div>
  );
}

// Market Listing Card Component
function MarketListingCard({
  listing,
  onSelect,
  isSelected,
  formatTimeRemaining,
}: {
  listing: MarketListing;
  onSelect: () => void;
  isSelected: boolean;
  formatTimeRemaining: (endsAt: number) => string;
}) {
  return (
    <button
      type="button"
      data-testid="marketplace-card"
      className={cn(
        "relative p-3 rounded-xl border border-[#3d2b1f] bg-black/40 hover:bg-black/60 transition-all cursor-pointer text-left w-full",
        isSelected && "ring-2 ring-purple-500"
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          "absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-xs font-bold",
          listing.listingType === "auction" ? "bg-orange-600" : "bg-green-600"
        )}
      >
        {listing.listingType === "auction" ? "Auction" : "Buy Now"}
      </span>

      <div className="aspect-3/4 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mb-3">
        <Package className="w-12 h-12 text-purple-400/50" />
      </div>

      <p className="font-medium text-sm text-[#e8e0d5] truncate mb-1">{listing.cardName}</p>
      <p className={cn("text-xs mb-2", RARITY_COLORS[listing.cardRarity])}>{listing.cardRarity}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="font-bold text-yellow-300">
            {(listing.currentBid || listing.price).toLocaleString()}
          </span>
        </div>
        {listing.listingType === "auction" && listing.endsAt && (
          <div className="flex items-center gap-1 text-xs text-[#a89f94]">
            <Clock className="w-3 h-3" />
            {formatTimeRemaining(listing.endsAt)}
          </div>
        )}
      </div>

      {listing.listingType === "auction" && listing.bidCount !== undefined && (
        <p className="text-xs text-[#a89f94] mt-1">{listing.bidCount} bids</p>
      )}
    </button>
  );
}

// Token Listing Card Component
function TokenListingCard({
  listing,
  onSelect,
  isSelected,
}: {
  listing: TokenListing;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const formatTokenPrice = (rawAmount: number) => {
    const humanReadable = rawAmount / 10 ** TOKEN_DECIMALS;
    return humanReadable.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <button
      type="button"
      data-testid="token-marketplace-card"
      className={cn(
        "relative p-3 rounded-xl border border-[#3d2b1f] bg-black/40 hover:bg-black/60 transition-all cursor-pointer text-left w-full",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-xs font-bold bg-primary text-[#1a1614]">
        Token
      </span>

      <div className="aspect-3/4 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mb-3 overflow-hidden">
        {listing.cardImageUrl ? (
          <Image
            src={listing.cardImageUrl}
            alt={listing.cardName}
            width={100}
            height={140}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-12 h-12 text-purple-400/50" />
        )}
      </div>

      <p className="font-medium text-sm text-[#e8e0d5] truncate mb-1">{listing.cardName}</p>
      <p className={cn("text-xs mb-2 capitalize", RARITY_COLORS[listing.cardRarity])}>
        {listing.cardRarity}
      </p>

      <div className="flex items-center gap-1">
        <Gem className="w-4 h-4 text-primary" />
        <span className="font-bold text-primary">{formatTokenPrice(listing.tokenPrice)} LTCG</span>
      </div>

      <p className="text-xs text-[#a89f94] mt-1">Seller: {listing.sellerUsername}</p>
    </button>
  );
}
