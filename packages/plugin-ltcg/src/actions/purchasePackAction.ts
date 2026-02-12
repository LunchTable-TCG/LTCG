/**
 * Purchase Pack Action
 *
 * Purchase card packs using x402 payment protocol with Solana SPL tokens
 * or using in-game gems. AI agents can autonomously buy packs to expand
 * their card collection.
 */

import type {
  Action,
  ActionResult,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { ModelType, logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import {
  InsufficientBalanceError,
  PaymentLimitExceededError,
  PaymentRequiredError,
} from "../client/errors";
import { extractJsonFromLlmResponse } from "../utils/safeParseJson";

interface ShopProduct {
  productId: string;
  name: string;
  description?: string;
  type: "pack" | "box" | "bundle";
  gemPrice?: number;
  usdCents?: number;
  cardCount?: number;
  guaranteedRarity?: string;
}

interface CardReceived {
  cardDefinitionId: string;
  name: string;
  rarity: string;
  variant?: string;
}

export const purchasePackAction: Action = {
  name: "PURCHASE_PACK",
  similes: [
    "BUY_PACK",
    "OPEN_PACK",
    "GET_CARDS",
    "BUY_CARDS",
    "ACQUIRE_CARDS",
    "BUY_BOOSTER",
  ],
  description:
    "Purchase a card pack using gems or Solana tokens (x402). Opens the pack immediately and adds cards to collection.",

  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
  ): Promise<boolean> => {
    try {
      // Must have API key
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      if (!apiKey) {
        logger.debug("Agent not registered (no API key)");
        return false;
      }

      // Must have API URL configured
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      if (!apiUrl) {
        logger.warn("LTCG API URL not configured");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating purchase pack action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling PURCHASE_PACK action");

      // Get API configuration
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const walletAddress = runtime.getSetting("LTCG_WALLET_ADDRESS") as string;
      const privyAppId = runtime.getSetting("PRIVY_APP_ID") as string;
      const privyAppSecret = runtime.getSetting("PRIVY_APP_SECRET") as string;
      const agentPrivyUserId = runtime.getSetting(
        "LTCG_PRIVY_USER_ID",
      ) as string;
      const maxAutoPayment =
        Number(runtime.getSetting("LTCG_MAX_AUTO_PAYMENT")) || 100;

      if (!apiUrl || !apiKey) {
        throw new Error("LTCG API not configured");
      }

      // Check if x402 is available
      const x402Available = Boolean(
        walletAddress && privyAppId && privyAppSecret && agentPrivyUserId,
      );

      // Create API client with optional x402 config
      const client = new LTCGApiClient({
        apiKey,
        baseUrl: apiUrl,
        x402Config: x402Available
          ? {
              enabled: true,
              privyAppId,
              privyAppSecret,
              agentPrivyUserId,
              walletAddress,
              maxAutoPaymentAmount: BigInt(maxAutoPayment * 1_000_000), // Convert USD to token units
            }
          : undefined,
      });

      // Get available products and map to our interface
      const productsResponse = await client.getShopProducts();
      const products: ShopProduct[] = (productsResponse.products || [])
        .filter((p) => p.productType === "pack" || p.productType === "box")
        .map((p) => ({
          productId: p.productId,
          name: p.name,
          description: p.description,
          type: p.productType as "pack" | "box" | "bundle",
          gemPrice: p.gemPrice,
          usdCents: undefined, // API doesn't return this directly
        }));

      if (!products || products.length === 0) {
        throw new Error("No card packs available in shop");
      }

      // Parse message to find requested product or type
      const messageText = message.content.text || "";
      let selectedProduct: ShopProduct | undefined;
      let paymentMethod: "gems" | "tokens" = "gems"; // Default to gems

      // Check for payment method preference
      if (
        messageText.toLowerCase().includes("token") ||
        messageText.toLowerCase().includes("solana") ||
        messageText.toLowerCase().includes("x402")
      ) {
        paymentMethod = "tokens";
      }

      // Check for specific product mentions
      const productIdMatch = messageText.match(
        /product[:\s]+([a-zA-Z0-9_\-]+)/i,
      );
      if (productIdMatch) {
        selectedProduct = products.find(
          (p) => p.productId === productIdMatch[1],
        );
      }

      // Check for rarity mentions
      if (!selectedProduct) {
        const rarityKeywords = [
          "legendary",
          "epic",
          "rare",
          "premium",
          "basic",
          "starter",
        ];
        for (const keyword of rarityKeywords) {
          if (messageText.toLowerCase().includes(keyword)) {
            selectedProduct = products.find(
              (p) =>
                p.name.toLowerCase().includes(keyword) ||
                p.guaranteedRarity?.toLowerCase().includes(keyword),
            );
            if (selectedProduct) break;
          }
        }
      }

      // Check for pack type mentions
      if (!selectedProduct) {
        if (messageText.toLowerCase().includes("box")) {
          selectedProduct = products.find((p) => p.type === "box");
        } else if (messageText.toLowerCase().includes("bundle")) {
          selectedProduct = products.find((p) => p.type === "bundle");
        }
      }

      // If no specific product mentioned, use LLM to choose
      if (!selectedProduct) {
        const productOptions = products
          .map((p, idx) => {
            const price =
              p.gemPrice !== undefined
                ? `${p.gemPrice.toLocaleString()} gems`
                : p.usdCents !== undefined
                  ? `$${(p.usdCents / 100).toFixed(2)}`
                  : "Unknown price";
            return `${idx + 1}. ${p.name} (${p.type}): ${price}${p.cardCount ? ` - ${p.cardCount} cards` : ""}${p.guaranteedRarity ? ` - Guaranteed ${p.guaranteedRarity}` : ""}`;
          })
          .join("\n");

        const prompt = `Select a card pack for this agent. User message: "${messageText}"

Available products:
${productOptions}

Consider:
- Agent's stated preference (rarity, pack size, value)
- Balance between cost and card quality
- Whether agent mentioned specific needs

Respond with JSON: { "productIndex": <0-based index> }`;

        const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt,
          temperature: 0.3,
          maxTokens: 50,
        });

        const parsed = extractJsonFromLlmResponse(decision, {
          productIndex: 0,
        });
        if (parsed.productIndex >= 0 && parsed.productIndex < products.length) {
          selectedProduct = products[parsed.productIndex];
        }
      }

      // Fallback to first product
      if (!selectedProduct) {
        selectedProduct = products[0];
      }

      if (!selectedProduct) {
        throw new Error("Failed to select a pack");
      }

      // Determine best payment method
      // If x402 requested and available, use tokens
      // Otherwise default to gems if available
      if (paymentMethod === "tokens" && !x402Available) {
        logger.warn(
          "Tokens requested but x402 not configured, falling back to gems",
        );
        paymentMethod = "gems";
      }

      if (
        paymentMethod === "tokens" &&
        selectedProduct.usdCents === undefined
      ) {
        logger.warn("Product has no USD price, falling back to gems");
        paymentMethod = "gems";
      }

      if (paymentMethod === "gems" && selectedProduct.gemPrice === undefined) {
        if (x402Available && selectedProduct.usdCents !== undefined) {
          logger.info("Product has no gem price, switching to token payment");
          paymentMethod = "tokens";
        } else {
          throw new Error(
            "Product cannot be purchased - no gem price and x402 not available",
          );
        }
      }

      // Check payment limit for token purchases
      if (
        paymentMethod === "tokens" &&
        selectedProduct.usdCents !== undefined
      ) {
        const usdAmount = selectedProduct.usdCents / 100;
        if (usdAmount > maxAutoPayment) {
          throw new PaymentLimitExceededError(
            BigInt(Math.round(usdAmount * 1_000_000)),
            BigInt(Math.round(maxAutoPayment * 1_000_000)),
            {
              reason: `Pack costs $${usdAmount.toFixed(2)} but max auto-payment is $${maxAutoPayment}`,
            },
          );
        }
      }

      logger.info(
        {
          productId: selectedProduct.productId,
          type: selectedProduct.type,
          paymentMethod,
        },
        "Purchasing pack",
      );

      let result: {
        success: boolean;
        productName?: string;
        cardsReceived?: CardReceived[];
        transactionSignature?: string;
      };

      if (paymentMethod === "tokens") {
        // Use x402 token payment
        result = await client.purchasePack(selectedProduct.productId);
      } else {
        // Use gems payment (via regular API)
        const gemResult = await client.purchaseWithGems(
          selectedProduct.productId,
        );
        result = {
          success: true,
          productName: gemResult.productName,
          cardsReceived: gemResult.cardsReceived,
        };
      }

      // Format cards received
      const cardsDisplay =
        result.cardsReceived
          ?.map((card) => {
            const rarityEmoji =
              {
                legendary: "⭐",
                epic: "💎",
                rare: "✨",
                uncommon: "🔹",
                common: "⚪",
              }[card.rarity.toLowerCase()] || "🃏";
            return `${rarityEmoji} ${card.name} (${card.rarity})`;
          })
          .join("\n") || "Cards added to collection";

      const paymentInfo =
        paymentMethod === "tokens"
          ? `Paid with tokens${result.transactionSignature ? ` - Tx: ${result.transactionSignature.slice(0, 16)}...` : ""}`
          : `Paid with ${selectedProduct.gemPrice?.toLocaleString()} gems`;

      const responseText = `Pack opened! You received ${result.cardsReceived?.length || "some"} cards:

${cardsDisplay}

Pack: ${selectedProduct.name}
${paymentInfo}

These cards have been added to your collection!`;

      await callback({
        text: responseText,
        actions: ["PURCHASE_PACK"],
        source: message.content.source,
        thought: `Opened ${selectedProduct.name} and received ${result.cardsReceived?.length || "multiple"} cards using ${paymentMethod} payment`,
      } as Content);

      return {
        success: true,
        text: "Pack purchased and opened successfully",
        values: {
          productId: selectedProduct.productId,
          productName: selectedProduct.name,
          cardsReceived: result.cardsReceived?.length || 0,
          paymentMethod,
          transactionSignature: result.transactionSignature,
        },
        data: {
          actionName: "PURCHASE_PACK",
          product: selectedProduct,
          cardsReceived: result.cardsReceived,
          paymentMethod,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in PURCHASE_PACK action");

      let errorMessage: string;
      let thought: string;

      if (error instanceof PaymentRequiredError) {
        errorMessage =
          "Payment required but could not complete x402 flow. Check wallet balance and permissions.";
        thought =
          "x402 payment flow failed - check wallet balance and delegation permissions";
      } else if (error instanceof InsufficientBalanceError) {
        errorMessage = `Insufficient balance. Need ${error.requiredAmount.toString()} but have ${error.currentBalance.toString()}`;
        thought =
          "Not enough tokens or gems for this purchase. Consider a cheaper pack or funding the account.";
      } else if (error instanceof PaymentLimitExceededError) {
        errorMessage = `Purchase exceeds auto-payment limit of ${error.limit.toString()}. Requested: ${error.amount.toString()}`;
        thought =
          "This purchase is above the configured safety limit. Agent needs manual approval or limit increase.";
      } else {
        errorMessage = `Failed to purchase pack: ${error instanceof Error ? error.message : String(error)}`;
        thought =
          "Pack purchase failed due to API error, payment issue, or insufficient funds";
      }

      await callback({
        text: errorMessage,
        error: true,
        thought,
      } as Content);

      return {
        success: false,
        text: "Failed to purchase pack",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Buy a card pack",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Pack opened! You received 5 cards:\n\n✨ Dragon Knight (Rare)\n🔹 Fire Elemental (Uncommon)\n⚪ Goblin Warrior (Common)\n⚪ Shield Bearer (Common)\n⚪ Magic Bolt (Common)\n\nPack: Standard Pack\nPaid with 500 gems\n\nThese cards have been added to your collection!",
          actions: ["PURCHASE_PACK"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Get me a legendary pack using tokens",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Pack opened! You received 10 cards:\n\n⭐ Ancient Phoenix (Legendary)\n💎 Storm Wizard (Epic)\n✨ Ice Golem (Rare)\n✨ Thunder Beast (Rare)\n🔹 Water Spirit (Uncommon)\n🔹 Rock Giant (Uncommon)\n⚪ Flame Arrow (Common)\n⚪ Healing Light (Common)\n⚪ Shadow Step (Common)\n⚪ Wind Slash (Common)\n\nPack: Legendary Pack\nPaid with tokens - Tx: 8k2m4n7p...\n\nThese cards have been added to your collection!",
          actions: ["PURCHASE_PACK"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Open a premium box to get better cards",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Pack opened! You received 15 cards:\n\n💎 Void Emperor (Epic)\n💎 Crystal Maiden (Epic)\n✨ Shadow Assassin (Rare)\n✨ Light Paladin (Rare)\n✨ Earth Titan (Rare)\n...\n\nPack: Premium Box\nPaid with 2,500 gems\n\nThese cards have been added to your collection!",
          actions: ["PURCHASE_PACK"],
        },
      },
    ],
  ],
};
