/**
 * Token Marketplace Listing Functions
 *
 * Token-based marketplace listings for the LTCG token integration (Phase 3).
 * Allows sellers to list cards for Token (SPL token) as an alternative to Gold.
 *
 * Key differences from Gold marketplace:
 * - Requires connected wallet for listing
 * - Price is in token's smallest unit (6 decimals: 1,000,000 = 1 token)
 * - Purchase flow handled separately (requires on-chain transaction)
 *
 * Purchase Flow:
 * 1. Buyer clicks "Buy with Token" → initiateTokenPurchase creates pending record
 * 2. Backend builds unsigned SPL transfer transaction → returns to frontend
 * 3. Frontend signs with Privy → calls submitSignedTransaction
 * 4. Backend submits to Solana, polls for confirmation
 * 5. On confirmation → transfers card, updates listing
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { PAGINATION, TOKEN } from "../lib/constants";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { adjustCardInventory } from "../lib/helpers";
import { fromRawAmount } from "../lib/solana/tokenBalance";
import { buildMarketplacePurchaseTransaction } from "../lib/solana/tokenTransfer";

// Module-scope typed helper to avoid TS2589 "Type instantiation is excessively deep"
// biome-ignore lint/suspicious/noExplicitAny: Convex deep type workaround
const internalAny = internal as any;

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get active token-based marketplace listings
 *
 * Returns paginated listings where currencyType === "token", with card details
 * and seller information for display.
 *
 * @param limit - Maximum results to return (default: 50, max: 100)
 * @param cursor - Pagination cursor (listing creation timestamp)
 * @param cardType - Optional filter by card type (creature, spell, trap, equipment)
 * @param rarity - Optional filter by card rarity
 * @returns Paginated token listings with card details
 */
export const getTokenListings = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    cardType: v.optional(
      v.union(v.literal("creature"), v.literal("spell"), v.literal("trap"), v.literal("equipment"))
    ),
    rarity: v.optional(
      v.union(
        v.literal("common"),
        v.literal("uncommon"),
        v.literal("rare"),
        v.literal("epic"),
        v.literal("legendary")
      )
    ),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? PAGINATION.MARKETPLACE_PAGE_SIZE, 100);
    const cursorTimestamp = args.cursor ? Number.parseInt(args.cursor, 10) : undefined;

    // Query active token listings
    const listingsQuery = ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"));

    // Apply cursor for pagination (listings older than cursor)
    const allListings = await listingsQuery.collect();

    // Filter for token listings and apply cursor
    let filtered = allListings.filter((l) => l.currencyType === "token");

    if (cursorTimestamp) {
      filtered = filtered.filter((l) => l.createdAt < cursorTimestamp);
    }

    // Batch fetch card definitions
    const uniqueCardIds = [...new Set(filtered.map((l) => l.cardDefinitionId))];
    const cardPromises = uniqueCardIds.map((id) => ctx.db.get(id));
    const cards = await Promise.all(cardPromises);
    const cardMap = new Map(
      cards.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    // Join with card definitions
    let listingsWithCards = filtered.map((listing) => ({
      ...listing,
      card: cardMap.get(listing.cardDefinitionId),
    }));

    // Apply card type filter
    if (args.cardType) {
      listingsWithCards = listingsWithCards.filter((l) => l.card?.cardType === args.cardType);
    }

    // Apply rarity filter
    if (args.rarity) {
      listingsWithCards = listingsWithCards.filter((l) => l.card?.rarity === args.rarity);
    }

    // Sort by newest first
    listingsWithCards.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    const paginated = listingsWithCards.slice(0, limit);

    // Format response
    const formattedListings = paginated.map((listing) => ({
      _id: listing._id,
      sellerId: listing.sellerId,
      sellerUsername: listing.sellerUsername,
      cardDefinitionId: listing.cardDefinitionId,
      cardName: listing.card?.name ?? "Unknown Card",
      cardType: listing.card?.cardType ?? "creature",
      cardRarity: listing.card?.rarity ?? "common",
      cardArchetype: listing.card?.archetype ?? "neutral",
      cardImageUrl: listing.card?.imageUrl,
      cardAttack: listing.card?.attack,
      cardDefense: listing.card?.defense,
      cardCost: listing.card?.cost,
      quantity: listing.quantity,
      tokenPrice: listing.tokenPrice ?? 0,
      currencyType: listing.currencyType,
      createdAt: listing.createdAt,
    }));

    // Determine next cursor
    const lastListing = paginated[paginated.length - 1];
    const nextCursor = lastListing ? String(lastListing.createdAt) : undefined;
    const hasMore = listingsWithCards.length > limit;

    return {
      listings: formattedListings,
      nextCursor,
      hasMore,
    };
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Create a token-based marketplace listing
 *
 * Lists a card for sale using Token as the currency. Requires:
 * - User owns the card
 * - Card is not already listed
 * - Price meets minimum (1 token = 1,000,000 smallest units)
 * - User has a connected wallet
 *
 * @param cardId - The playerCard ID to list
 * @param price - Price in token's smallest unit (6 decimals)
 * @returns The created listing ID
 */
export const createTokenListing = mutation({
  args: {
    cardId: v.id("playerCards"),
    price: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    listingId: v.id("marketplaceListings"),
  }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Verify user has a connected wallet
    const user = await ctx.db.get(userId);
    if (!user?.walletAddress) {
      throw createError(ErrorCode.ECONOMY_WALLET_NOT_CONNECTED);
    }

    // Validate price
    if (args.price < TOKEN.MIN_LISTING_PRICE) {
      throw createError(ErrorCode.ECONOMY_TOKEN_LISTING_INVALID, {
        reason: `Minimum price is ${TOKEN.MIN_LISTING_PRICE} (1 token with 6 decimals)`,
      });
    }

    if (!Number.isInteger(args.price) || args.price <= 0) {
      throw createError(ErrorCode.ECONOMY_TOKEN_LISTING_INVALID, {
        reason: "Price must be a positive integer",
      });
    }

    // Get the player card record
    const playerCard = await ctx.db.get(args.cardId);
    if (!playerCard) {
      throw createError(ErrorCode.NOT_FOUND_CARD);
    }

    // Verify ownership
    if (playerCard.userId !== userId) {
      throw createError(ErrorCode.VALIDATION_CARD_OWNERSHIP, {
        reason: "You don't own this card",
      });
    }

    // Verify card has quantity available
    if (playerCard.quantity < 1) {
      throw createError(ErrorCode.VALIDATION_CARD_OWNERSHIP, {
        reason: "You don't have this card in your inventory",
      });
    }

    // Check if this card definition is already listed by this user
    const existingListing = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", userId).eq("status", "active"))
      .filter((q) =>
        q.and(
          q.eq(q.field("cardDefinitionId"), playerCard.cardDefinitionId),
          q.eq(q.field("currencyType"), "token")
        )
      )
      .first();

    if (existingListing) {
      throw createError(ErrorCode.ECONOMY_TOKEN_LISTING_INVALID, {
        reason: "You already have an active token listing for this card",
      });
    }

    // Lock the card by removing from inventory
    await adjustCardInventory(ctx, userId, playerCard.cardDefinitionId, -1);

    // Create the listing
    const listingId = await ctx.db.insert("marketplaceListings", {
      sellerId: userId,
      sellerUsername: username,
      listingType: "fixed",
      cardDefinitionId: playerCard.cardDefinitionId,
      quantity: 1,
      price: 0, // Gold price is 0 for token listings
      tokenPrice: args.price,
      currencyType: "token",
      bidCount: 0,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      listingId,
    };
  },
});

/**
 * Cancel a token-based marketplace listing
 *
 * Only the listing owner can cancel. Returns the card to the seller's inventory.
 *
 * @param listingId - The marketplace listing ID to cancel
 * @returns Success boolean
 */
export const cancelTokenListing = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the listing
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "Listing not found",
      });
    }

    // Verify this is a token listing
    if (listing.currencyType !== "token") {
      throw createError(ErrorCode.ECONOMY_TOKEN_LISTING_INVALID, {
        reason: "This is not a token listing",
      });
    }

    // Verify ownership
    if (listing.sellerId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "You can only cancel your own listings",
      });
    }

    // Verify listing is still active
    if (listing.status !== "active") {
      throw createError(ErrorCode.ECONOMY_TOKEN_LISTING_INVALID, {
        reason: "Listing is not active",
      });
    }

    // Return card to inventory
    await adjustCardInventory(ctx, userId, listing.cardDefinitionId, listing.quantity);

    // Update listing status
    await ctx.db.patch(args.listingId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get user's own token listings
 *
 * Returns all token-based marketplace listings created by the authenticated user.
 *
 * @returns Array of user's token listings with card details
 */
export const getUserTokenListings = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get user's active token listings
    const listings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", userId))
      .filter((q) => q.eq(q.field("currencyType"), "token"))
      .collect();

    // Batch fetch card definitions
    const uniqueCardIds = [...new Set(listings.map((l) => l.cardDefinitionId))];
    const cardPromises = uniqueCardIds.map((id) => ctx.db.get(id));
    const cards = await Promise.all(cardPromises);
    const cardMap = new Map(
      cards.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    // Format response with card details
    return listings.map((listing) => {
      const card = cardMap.get(listing.cardDefinitionId);
      return {
        _id: listing._id,
        cardDefinitionId: listing.cardDefinitionId,
        cardName: card?.name ?? "Unknown Card",
        cardType: card?.cardType ?? "creature",
        cardRarity: card?.rarity ?? "common",
        cardImageUrl: card?.imageUrl,
        quantity: listing.quantity,
        tokenPrice: listing.tokenPrice ?? 0,
        status: listing.status,
        createdAt: listing.createdAt,
      };
    });
  },
});

// ============================================================================
// TOKEN PURCHASE FLOW - PUBLIC MUTATIONS
// ============================================================================

/**
 * Initiate a token-based purchase
 *
 * Step 1 of the token purchase flow:
 * - Validates the listing and buyer eligibility
 * - Creates a pending purchase record
 * - Builds an unsigned SPL transfer transaction
 * - Returns the transaction for frontend signing via Privy
 *
 * @param listingId - The token marketplace listing to purchase
 * @returns pendingPurchaseId, transactionBase64, and expiresAt
 */
export const initiateTokenPurchase = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
  },
  returns: v.object({
    pendingPurchaseId: v.id("pendingTokenPurchases"),
    transactionBase64: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the listing
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "Listing not found",
      });
    }

    // Validate listing is active
    if (listing.status !== "active") {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: "Listing is no longer active",
      });
    }

    // Validate listing is token-denominated
    if (listing.currencyType !== "token") {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: "This listing is not token-denominated",
      });
    }

    // Validate buyer is not the seller
    if (listing.sellerId === userId) {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: "You cannot buy your own listing",
      });
    }

    // Validate buyer has connected wallet
    const buyer = await ctx.db.get(userId);
    if (!buyer?.walletAddress) {
      throw createError(ErrorCode.ECONOMY_WALLET_NOT_CONNECTED);
    }

    // Validate seller has connected wallet
    const seller = await ctx.db.get(listing.sellerId);
    if (!seller?.walletAddress) {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: "Seller's wallet is not connected",
      });
    }

    // Check for existing pending purchase on this listing
    const existingPending = await ctx.db
      .query("pendingTokenPurchases")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "awaiting_signature"), q.eq(q.field("status"), "submitted"))
      )
      .first();

    if (existingPending) {
      // Check if it's expired
      if (existingPending.expiresAt > Date.now()) {
        throw createError(ErrorCode.ECONOMY_TOKEN_TRANSACTION_PENDING, {
          reason: "A purchase is already pending for this listing",
        });
      }
      // Mark expired purchase as expired
      await ctx.db.patch(existingPending._id, {
        status: "expired",
      });
    }

    // Also check if this buyer already has a pending purchase for this listing
    const buyerPending = await ctx.db
      .query("pendingTokenPurchases")
      .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("listingId"), args.listingId),
          q.or(q.eq(q.field("status"), "awaiting_signature"), q.eq(q.field("status"), "submitted"))
        )
      )
      .first();

    if (buyerPending && buyerPending.expiresAt > Date.now()) {
      throw createError(ErrorCode.ECONOMY_TOKEN_TRANSACTION_PENDING, {
        reason: "You already have a pending purchase for this listing",
      });
    }

    const tokenPrice = listing.tokenPrice ?? 0;
    if (tokenPrice <= 0) {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: "Invalid token price",
      });
    }

    // Build the unsigned transaction
    // Convert from raw amount (smallest units) to human-readable for the transaction builder
    const humanReadablePrice = fromRawAmount(BigInt(tokenPrice));
    const txResult = await buildMarketplacePurchaseTransaction(
      buyer.walletAddress,
      seller.walletAddress,
      humanReadablePrice
    );

    const now = Date.now();
    const expiresAt = now + TOKEN.PURCHASE_EXPIRY_MS;

    // Create pending purchase record
    const pendingPurchaseId = await ctx.db.insert("pendingTokenPurchases", {
      buyerId: userId,
      listingId: args.listingId,
      amount: tokenPrice,
      buyerWallet: buyer.walletAddress,
      sellerWallet: seller.walletAddress,
      status: "awaiting_signature",
      createdAt: now,
      expiresAt,
    });

    return {
      pendingPurchaseId,
      transactionBase64: txResult.transaction,
      expiresAt,
    };
  },
});

/**
 * Submit a signed transaction for a pending purchase
 *
 * Step 2 of the token purchase flow:
 * - Validates the pending purchase exists and is awaiting signature
 * - Updates status to "submitted"
 * - Schedules the transaction confirmation polling action
 *
 * Note: The actual transaction submission to Solana happens client-side.
 * This function records the signature and starts confirmation polling.
 *
 * @param pendingPurchaseId - The pending purchase to submit
 * @param signedTransactionBase64 - The signed transaction (submitted client-side, signature recorded here)
 * @param transactionSignature - The transaction signature from client-side submission
 * @returns Success status
 */
export const submitSignedTransaction = mutation({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
    signedTransactionBase64: v.string(),
    transactionSignature: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the pending purchase
    const pending = await ctx.db.get(args.pendingPurchaseId);
    if (!pending) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "Pending purchase not found",
      });
    }

    // Validate buyer
    if (pending.buyerId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "You can only submit your own transactions",
      });
    }

    // Validate status
    if (pending.status !== "awaiting_signature") {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: `Invalid status: ${pending.status}. Expected: awaiting_signature`,
      });
    }

    // Check if expired
    if (pending.expiresAt < Date.now()) {
      await ctx.db.patch(args.pendingPurchaseId, {
        status: "expired",
      });
      throw createError(ErrorCode.ECONOMY_TOKEN_TRANSACTION_EXPIRED);
    }

    // Update status to submitted and record signature
    await ctx.db.patch(args.pendingPurchaseId, {
      status: "submitted",
      transactionSignature: args.transactionSignature,
    });

    // Schedule polling for transaction confirmation
    await ctx.scheduler.runAfter(
      3000, // Poll after 3 seconds
      internalAny.economy.tokenMarketplace.pollTransactionConfirmation,
      {
        pendingPurchaseId: args.pendingPurchaseId,
        pollAttempt: 1,
      }
    );

    return { success: true };
  },
});

/**
 * Cancel a pending token purchase
 *
 * User-facing mutation to cancel a pending purchase.
 * Only the buyer can cancel, and only if status is "awaiting_signature".
 *
 * @param pendingPurchaseId - The pending purchase to cancel
 * @returns Success status
 */
export const cancelPendingPurchase = mutation({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the pending purchase
    const pending = await ctx.db.get(args.pendingPurchaseId);
    if (!pending) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "Pending purchase not found",
      });
    }

    // Validate buyer
    if (pending.buyerId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "You can only cancel your own purchases",
      });
    }

    // Validate status - can only cancel if awaiting signature
    if (pending.status !== "awaiting_signature") {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: `Cannot cancel purchase with status: ${pending.status}`,
      });
    }

    // Update status to expired (cancelled)
    await ctx.db.patch(args.pendingPurchaseId, {
      status: "expired",
    });

    return { success: true };
  },
});

/**
 * Get pending purchases for the current user
 *
 * Returns all pending token purchases for the authenticated user,
 * useful for showing transaction status in the UI.
 */
export const getUserPendingPurchases = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const pending = await ctx.db
      .query("pendingTokenPurchases")
      .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
      .order("desc")
      .take(10);

    // Batch fetch listings
    const listingIds = [...new Set(pending.map((p) => p.listingId))];
    const listingPromises = listingIds.map((id) => ctx.db.get(id));
    const listings = await Promise.all(listingPromises);
    const listingMap = new Map(
      listings.filter((l): l is NonNullable<typeof l> => l !== null).map((l) => [l._id, l])
    );

    return pending.map((p) => {
      const listing = listingMap.get(p.listingId);
      return {
        _id: p._id,
        listingId: p.listingId,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        transactionSignature: p.transactionSignature,
        listingCardName: listing ? "Card" : "Unknown", // Would need to fetch card name
      };
    });
  },
});

// ============================================================================
// TOKEN PURCHASE FLOW - INTERNAL MUTATIONS
// ============================================================================

/**
 * Complete a token purchase after transaction confirmation
 *
 * Called by pollTransactionConfirmation when the Solana transaction is confirmed.
 * - Transfers card from seller to buyer
 * - Updates listing status to "sold"
 * - Updates pending purchase status to "confirmed"
 * - Creates tokenTransactions records
 * - Refreshes both users' token balance cache
 *
 * @internal
 */
export const completeTokenPurchase = internalMutation({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db.get(args.pendingPurchaseId);
    if (!pending) {
      console.error(
        `[completeTokenPurchase] Pending purchase not found: ${args.pendingPurchaseId}`
      );
      return { success: false, error: "Pending purchase not found" };
    }

    // Validate status
    if (pending.status !== "submitted") {
      console.error(`[completeTokenPurchase] Invalid status: ${pending.status}`);
      return { success: false, error: `Invalid status: ${pending.status}` };
    }

    const listing = await ctx.db.get(pending.listingId);
    if (!listing) {
      console.error(`[completeTokenPurchase] Listing not found: ${pending.listingId}`);
      return { success: false, error: "Listing not found" };
    }

    // Validate listing is still active (shouldn't happen, but safety check)
    if (listing.status !== "active") {
      console.error(`[completeTokenPurchase] Listing no longer active: ${listing.status}`);
      // Mark pending as failed
      await ctx.db.patch(args.pendingPurchaseId, {
        status: "failed",
      });
      return { success: false, error: "Listing no longer active" };
    }

    const now = Date.now();
    const signature = args.transactionSignature ?? pending.transactionSignature;

    // 1. Transfer card from seller to buyer
    await adjustCardInventory(ctx, pending.buyerId, listing.cardDefinitionId, listing.quantity);

    // 2. Update listing status to "sold"
    const platformFee = Math.floor(pending.amount * TOKEN.PLATFORM_FEE_PERCENT);
    await ctx.db.patch(pending.listingId, {
      status: "sold",
      soldTo: pending.buyerId,
      soldFor: pending.amount,
      soldAt: now,
      platformFee,
      updatedAt: now,
    });

    // 3. Update pending purchase status to "confirmed"
    await ctx.db.patch(args.pendingPurchaseId, {
      status: "confirmed",
      transactionSignature: signature,
    });

    // 4. Create tokenTransactions records for buyer and seller
    // Buyer: marketplace_purchase (debit)
    await ctx.db.insert("tokenTransactions", {
      userId: pending.buyerId,
      transactionType: "marketplace_purchase",
      amount: -pending.amount,
      signature,
      status: "confirmed",
      referenceId: pending.listingId,
      description: "Purchased card from marketplace",
      createdAt: now,
      confirmedAt: now,
    });

    // Seller: marketplace_sale (credit minus platform fee)
    const sellerReceived = pending.amount - platformFee;
    await ctx.db.insert("tokenTransactions", {
      userId: listing.sellerId,
      transactionType: "marketplace_sale",
      amount: sellerReceived,
      signature,
      status: "confirmed",
      referenceId: pending.listingId,
      description: "Sold card on marketplace",
      createdAt: now,
      confirmedAt: now,
    });

    // Platform fee record (optional - for analytics)
    if (platformFee > 0) {
      await ctx.db.insert("tokenTransactions", {
        userId: listing.sellerId, // Associated with seller for tracking
        transactionType: "platform_fee",
        amount: -platformFee,
        signature,
        status: "confirmed",
        referenceId: pending.listingId,
        description: "Platform fee for marketplace sale",
        createdAt: now,
        confirmedAt: now,
      });
    }

    // 5. Schedule balance refresh for both users
    await ctx.scheduler.runAfter(0, internalAny.economy.tokenBalance.refreshTokenBalance, {
      userId: pending.buyerId,
    });
    await ctx.scheduler.runAfter(0, internalAny.economy.tokenBalance.refreshTokenBalance, {
      userId: listing.sellerId,
    });

    console.log(
      `[completeTokenPurchase] Successfully completed purchase ${args.pendingPurchaseId}`
    );
    return { success: true };
  },
});

/**
 * Fail a token purchase due to transaction failure or timeout
 *
 * Called by pollTransactionConfirmation when:
 * - Transaction fails on-chain
 * - Confirmation timeout (2 minutes) is exceeded
 * - Other errors occur during polling
 *
 * Note: No card transfer happens; funds stay with buyer (transaction failed on-chain).
 *
 * @internal
 */
export const failTokenPurchase = internalMutation({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db.get(args.pendingPurchaseId);
    if (!pending) {
      console.error(`[failTokenPurchase] Pending purchase not found: ${args.pendingPurchaseId}`);
      return { success: false };
    }

    // Only fail if not already in terminal state
    if (pending.status !== "submitted" && pending.status !== "awaiting_signature") {
      console.warn(`[failTokenPurchase] Already in terminal state: ${pending.status}`);
      return { success: false };
    }

    await ctx.db.patch(args.pendingPurchaseId, {
      status: "failed",
    });

    console.log(`[failTokenPurchase] Failed purchase ${args.pendingPurchaseId}: ${args.reason}`);
    return { success: true };
  },
});

// ============================================================================
// TOKEN PURCHASE FLOW - INTERNAL ACTIONS
// ============================================================================

/**
 * Poll for Solana transaction confirmation
 *
 * Queries Solana RPC for transaction status:
 * - If confirmed → calls completeTokenPurchase
 * - If failed → calls failTokenPurchase
 * - If still pending → schedules another poll (up to 2 min timeout)
 *
 * @internal
 */
export const pollTransactionConfirmation = internalAction({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
    pollAttempt: v.number(),
  },
  handler: async (ctx, args) => {
    const { pendingPurchaseId, pollAttempt } = args;

    // Get pending purchase
    const pending = await ctx.runQuery(internalAny.economy.tokenMarketplace.getPendingPurchase, {
      pendingPurchaseId,
    });

    if (!pending) {
      console.error(
        `[pollTransactionConfirmation] Pending purchase not found: ${pendingPurchaseId}`
      );
      return;
    }

    // Check if already in terminal state
    if (pending.status !== "submitted") {
      console.log(`[pollTransactionConfirmation] Already in terminal state: ${pending.status}`);
      return;
    }

    // Check for timeout (2 minutes from submission)
    const now = Date.now();
    const timeoutMs = TOKEN.CONFIRMATION_TIMEOUT_MS;
    if (now - pending.createdAt > timeoutMs) {
      console.log(`[pollTransactionConfirmation] Timeout exceeded for ${pendingPurchaseId}`);
      await ctx.runMutation(internalAny.economy.tokenMarketplace.failTokenPurchase, {
        pendingPurchaseId,
        reason: "Transaction confirmation timeout",
      });
      return;
    }

    // Get transaction signature
    const signature = pending.transactionSignature;
    if (!signature) {
      // If no signature yet, maybe client is still submitting. Retry.
      if (pollAttempt < 20) {
        await ctx.scheduler.runAfter(
          3000,
          internalAny.economy.tokenMarketplace.pollTransactionConfirmation,
          { pendingPurchaseId, pollAttempt: pollAttempt + 1 }
        );
      } else {
        await ctx.runMutation(internalAny.economy.tokenMarketplace.failTokenPurchase, {
          pendingPurchaseId,
          reason: "No transaction signature provided",
        });
      }
      return;
    }

    try {
      // Query Solana RPC for transaction status
      const { getConnection } = await import("../lib/solana/connection");
      const connection = getConnection();

      // Use getSignatureStatus for faster polling (doesn't require full transaction data)
      const statusResult = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });

      if (!statusResult.value) {
        // Transaction not found yet - still pending
        console.log(
          `[pollTransactionConfirmation] Transaction ${signature} not found yet, retrying...`
        );
        await ctx.scheduler.runAfter(
          3000,
          internalAny.economy.tokenMarketplace.pollTransactionConfirmation,
          { pendingPurchaseId, pollAttempt: pollAttempt + 1 }
        );
        return;
      }

      const status = statusResult.value;

      // Check if transaction errored
      if (status.err) {
        console.error("[pollTransactionConfirmation] Transaction failed:", status.err);
        await ctx.runMutation(internalAny.economy.tokenMarketplace.failTokenPurchase, {
          pendingPurchaseId,
          reason: `Transaction failed: ${JSON.stringify(status.err)}`,
        });
        return;
      }

      // Check confirmation status
      const confirmationStatus = status.confirmationStatus;
      if (confirmationStatus === "confirmed" || confirmationStatus === "finalized") {
        console.log(`[pollTransactionConfirmation] Transaction confirmed: ${signature}`);
        await ctx.runMutation(internalAny.economy.tokenMarketplace.completeTokenPurchase, {
          pendingPurchaseId,
          transactionSignature: signature,
        });
        return;
      }

      // Still processing - schedule another poll
      console.log(
        `[pollTransactionConfirmation] Transaction ${signature} status: ${confirmationStatus}, retrying...`
      );
      await ctx.scheduler.runAfter(
        3000,
        internalAny.economy.tokenMarketplace.pollTransactionConfirmation,
        { pendingPurchaseId, pollAttempt: pollAttempt + 1 }
      );
    } catch (error) {
      console.error("[pollTransactionConfirmation] Error polling transaction:", error);

      // On network error, retry a few times before failing
      if (pollAttempt < 10) {
        await ctx.scheduler.runAfter(
          5000, // Wait longer on error
          internalAny.economy.tokenMarketplace.pollTransactionConfirmation,
          { pendingPurchaseId, pollAttempt: pollAttempt + 1 }
        );
      } else {
        await ctx.runMutation(internalAny.economy.tokenMarketplace.failTokenPurchase, {
          pendingPurchaseId,
          reason: `RPC error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  },
});

// ============================================================================
// TOKEN PURCHASE FLOW - INTERNAL QUERIES
// ============================================================================

/**
 * Get pending purchase for internal use by actions
 *
 * @internal
 */
export const getPendingPurchase = internalQuery({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.pendingPurchaseId);
  },
});
