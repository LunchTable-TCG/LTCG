import type { Rarity } from "@/types/cards";
import type { ProductType } from "@/types/economy";
import type { Id } from "@convex/_generated/dataModel";

export type ShopTab = "shop" | "marketplace" | "myListings";
export type ListingType = "fixed" | "auction";
export type CurrencyType = "gold" | "token";
export type SortOption = "price_asc" | "price_desc" | "newest";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: ProductType;
  goldPrice?: number;
  gemPrice?: number;
  contents?: string;
  quantity?: number;
  productId: string;
  productType: ProductType;
}

export interface MarketListing {
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
  currencyType?: CurrencyType;
  currentBid?: number;
  highestBidderId?: string;
  bidCount?: number;
  endsAt?: number;
  createdAt: number;
}

export interface TokenListing {
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
