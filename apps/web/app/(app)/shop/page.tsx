"use client";

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
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProfile, useShop, useCurrency, useMarketplace } from "@/hooks";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

type TabType = "shop" | "marketplace";
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
}

// Marketplace listing types
interface MarketListing {
  _id: string;
  sellerId: string;
  sellerName?: string;
  listingType: ListingType;
  cardName: string;
  cardRarity: Rarity;
  quantity: number;
  price: number;
  currentBid?: number;
  highestBidderId?: string;
  bidCount?: number;
  endsAt?: number;
  createdAt: number;
}

// Mock shop data
const MOCK_SHOP_ITEMS: ShopItem[] = [
  // Card Packs
  {
    id: "pack1",
    name: "Starter Pack",
    description: "5 random cards, guaranteed 1 rare",
    type: "pack",
    goldPrice: 500,
    contents: "5 Cards",
  },
  {
    id: "pack2",
    name: "Booster Pack",
    description: "8 random cards, guaranteed 1 epic",
    type: "pack",
    goldPrice: 1000,
    gemPrice: 100,
    contents: "8 Cards",
  },
  {
    id: "pack3",
    name: "Premium Pack",
    description: "10 random cards, guaranteed 1 legendary",
    type: "pack",
    gemPrice: 250,
    contents: "10 Cards",
  },
  {
    id: "pack4",
    name: "Element Pack",
    description: "5 cards of a random element",
    type: "pack",
    goldPrice: 750,
    contents: "5 Cards",
  },
  // Boxes
  {
    id: "box1",
    name: "Starter Box",
    description: "Contains 10 Starter Packs",
    type: "box",
    goldPrice: 4500,
    contents: "10 Packs",
  },
  {
    id: "box2",
    name: "Booster Box",
    description: "Contains 10 Booster Packs + Bonus",
    type: "box",
    goldPrice: 9000,
    gemPrice: 900,
    contents: "10 Packs + Bonus",
  },
  {
    id: "box3",
    name: "Premium Box",
    description: "Contains 10 Premium Packs",
    type: "box",
    gemPrice: 2250,
    contents: "10 Packs",
  },
  // Currency
  {
    id: "cur1",
    name: "Gold Pouch",
    description: "A small pouch of gold",
    type: "currency",
    gemPrice: 50,
    quantity: 1000,
  },
  {
    id: "cur2",
    name: "Gold Chest",
    description: "A chest filled with gold",
    type: "currency",
    gemPrice: 200,
    quantity: 5000,
  },
  {
    id: "cur3",
    name: "Gold Vault",
    description: "A vault overflowing with gold",
    type: "currency",
    gemPrice: 500,
    quantity: 15000,
  },
];

// Mock marketplace data
const MOCK_LISTINGS: MarketListing[] = [
  {
    _id: "l1",
    sellerId: "s1",
    sellerName: "DragonMaster",
    listingType: "fixed",
    cardName: "Flame Drake",
    cardRarity: "rare",
    quantity: 1,
    price: 500,
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    _id: "l2",
    sellerId: "s2",
    sellerName: "CardCollector",
    listingType: "auction",
    cardName: "Ancient Phoenix",
    cardRarity: "legendary",
    quantity: 1,
    price: 1000,
    currentBid: 1500,
    bidCount: 5,
    endsAt: Date.now() + 4 * 60 * 60 * 1000,
    createdAt: Date.now() - 12 * 60 * 60 * 1000,
  },
  {
    _id: "l3",
    sellerId: "s3",
    sellerName: "TradePro",
    listingType: "fixed",
    cardName: "Water Elemental",
    cardRarity: "uncommon",
    quantity: 3,
    price: 150,
    createdAt: Date.now() - 1 * 60 * 60 * 1000,
  },
  {
    _id: "l4",
    sellerId: "s1",
    sellerName: "DragonMaster",
    listingType: "fixed",
    cardName: "Shadow Assassin",
    cardRarity: "epic",
    quantity: 1,
    price: 800,
    createdAt: Date.now() - 30 * 60 * 1000,
  },
  {
    _id: "l5",
    sellerId: "s4",
    sellerName: "NoviceTrader",
    listingType: "auction",
    cardName: "Crystal Golem",
    cardRarity: "rare",
    quantity: 1,
    price: 300,
    currentBid: 450,
    bidCount: 3,
    endsAt: Date.now() + 8 * 60 * 60 * 1000,
    createdAt: Date.now() - 6 * 60 * 60 * 1000,
  },
  {
    _id: "l6",
    sellerId: "s5",
    sellerName: "EliteDealer",
    listingType: "fixed",
    cardName: "Thunder Giant",
    cardRarity: "epic",
    quantity: 2,
    price: 750,
    createdAt: Date.now() - 45 * 60 * 1000,
  },
];

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const PLATFORM_FEE = 0.05;

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

  // Use custom hooks
  const { products: shopProducts, purchasePack: purchasePackAction, purchaseBox: purchaseBoxAction, purchaseBundle } = useShop();
  const { balance, gold: goldBalance, gems: gemBalance } = useCurrency();
  const { listings: marketplaceListings, buyNow: buyNowAction, placeBid: placeBidAction } = useMarketplace();

  // Use the marketplace data from the hook (filtering will be done client-side for now)
  const filteredMarketplaceData = marketplaceListings;

  // Filter marketplace listings
  const filteredListings = useMemo(() => {
    let listings = marketplaceListings?.listings ?? [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      listings = listings.filter((listing: any) =>
        listing.cardName.toLowerCase().includes(query)
      );
    }

    return listings;
  }, [searchQuery, marketplaceListings]);

  // Transform backend data to frontend format
  const transformedShopItems = useMemo(() => {
    if (!shopProducts) return [];
    return shopProducts.map((product: any): ShopItem => ({
      id: product.productId,
      name: product.name,
      description: product.description,
      type: product.productType,
      goldPrice: product.goldPrice,
      gemPrice: product.gemPrice,
      contents: product.packConfig
        ? `${product.packConfig.cardCount} Cards`
        : product.boxConfig
          ? `${product.boxConfig.packCount} Packs`
          : undefined,
      quantity: product.currencyConfig?.amount,
      ...product, // Include original for mutations
    }));
  }, [shopProducts]);

  // Group shop items by type
  const packItems = useMemo(
    () => transformedShopItems.filter((item) => item.type === "pack"),
    [transformedShopItems]
  );
  const boxItems = useMemo(
    () => transformedShopItems.filter((item) => item.type === "box"),
    [transformedShopItems]
  );
  const currencyItems = useMemo(
    () => transformedShopItems.filter((item) => item.type === "currency"),
    [transformedShopItems]
  );

  const handleShopPurchase = useCallback(
    async (item: any, useGems: boolean) => {
      setIsProcessing(true);
      try {
        if (item.productType === "pack") {
          await purchasePackAction(item.productId, useGems);
        } else if (item.productType === "box") {
          await purchaseBoxAction(item.productId, useGems);
        } else if (item.productType === "currency") {
          await purchaseBundle(item.productId);
        }
        setSelectedShopItem(null);
      } catch (error: any) {
        console.error("Purchase failed:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [purchasePackAction, purchaseBoxAction, purchaseBundle]
  );

  const handleMarketPurchase = useCallback(
    async (listing: any) => {
      setIsProcessing(true);
      try {
        await buyNowAction(listing._id);
        setSelectedListing(null);
      } catch (error: any) {
        console.error("Purchase failed:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [buyNowAction]
  );

  const handlePlaceBid = useCallback(
    async (listing: any) => {
      if (!bidAmount) return;
      setIsProcessing(true);
      try {
        await placeBidAction(listing._id, parseInt(bidAmount));
        setBidAmount("");
        setSelectedListing(null);
      } catch (error: any) {
        console.error("Bid failed:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [bidAmount, placeBidAction]
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
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/backgrounds/shop-bg.png')" }}
      />
      <div className="absolute inset-0 bg-black/60 z-0" />
      <div className="absolute inset-0 bg-vignette z-0" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#e8e0d5] mb-2">Shop & Market</h1>
            <p className="text-[#a89f94]">Purchase packs or trade with other players</p>
          </div>

          {/* Balance Display */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-lg font-bold text-yellow-300">
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
        <div className="flex gap-2 mb-8 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
          {[
            { id: "shop" as TabType, label: "Shop", icon: Store },
            { id: "marketplace" as TabType, label: "Marketplace", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                  isActive
                    ? "bg-[#d4af37] text-[#1a1614]"
                    : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
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
                {packItems.map((item) => (
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
                {boxItems.map((item) => (
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
                {currencyItems.map((item) => (
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
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | "fixed" | "auction")}
                className="px-4 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5]"
              >
                <option value="all">All Types</option>
                <option value="fixed">Buy Now</option>
                <option value="auction">Auction</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5]"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <Button className="tcg-button-primary">
                <Plus className="w-4 h-4 mr-2" />
                List Card
              </Button>
            </div>

            {/* Listings Grid */}
            {filteredListings.length === 0 ? (
              <div className="text-center py-16">
                <Store className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
                <h3 className="text-xl font-semibold text-[#e8e0d5] mb-2">No Listings Found</h3>
                <p className="text-[#a89f94]">Try adjusting your filters or check back later</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredListings.map((listing) => (
                  <MarketListingCard
                    key={listing._id}
                    listing={listing}
                    onSelect={() => setSelectedListing(listing)}
                    isSelected={selectedListing?._id === listing._id}
                    formatTimeRemaining={formatTimeRemaining}
                  />
                ))}
              </div>
            )}

            {/* Platform fee notice */}
            <div className="mt-8 p-4 rounded-lg bg-black/40 border border-[#3d2b1f] text-sm text-[#a89f94]">
              <p>
                <strong className="text-[#e8e0d5]">Note:</strong> A 5% platform fee is applied to
                all marketplace purchases.
              </p>
            </div>
          </>
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
                      parseInt(bidAmount, 10) <=
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
      </div>
    </div>
  );
}

// Shop Item Card Component
function ShopItemCard({ item, onPurchase }: { item: ShopItem; onPurchase: () => void }) {
  return (
    <div className="p-4 rounded-xl border border-[#3d2b1f] bg-black/40 hover:bg-black/60 transition-all">
      <div className="aspect-square rounded-lg bg-[#d4af37]/10 flex items-center justify-center mb-4">
        {item.type === "pack" && <Package className="w-16 h-16 text-[#d4af37]" />}
        {item.type === "box" && <Box className="w-16 h-16 text-[#d4af37]" />}
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
