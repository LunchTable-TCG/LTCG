/**
 * Purchase Gems Action
 *
 * Purchase gems using x402 payment protocol with Solana SPL tokens.
 * AI agents can autonomously purchase gems to spend in the game shop.
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

interface GemPackage {
  packageId: string;
  name: string;
  gems: number;
  usdCents: number;
  bonusPercent?: number;
}

export const purchaseGemsAction: Action = {
  name: "PURCHASE_GEMS",
  similes: ["BUY_GEMS", "GET_GEMS", "ACQUIRE_GEMS", "FUND_WALLET"],
  description:
    "Purchase gems using Solana tokens via x402 payment protocol. Gems can be used to buy card packs and other in-game items.",

  validate: async (runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
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

      // Must have wallet address for x402 payments
      const walletAddress = runtime.getSetting("LTCG_WALLET_ADDRESS") as string;
      if (!walletAddress) {
        logger.debug("No wallet configured for x402 payments");
        return false;
      }

      // Must have x402 config for auto-payments
      const x402Enabled = runtime.getSetting("LTCG_X402_ENABLED") as string;
      if (x402Enabled === "false") {
        logger.debug("x402 payments disabled");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating purchase gems action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling PURCHASE_GEMS action");

      // Get API configuration
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const walletAddress = runtime.getSetting("LTCG_WALLET_ADDRESS") as string;
      const privyAppId = runtime.getSetting("PRIVY_APP_ID") as string;
      const privyAppSecret = runtime.getSetting("PRIVY_APP_SECRET") as string;
      const agentPrivyUserId = runtime.getSetting("LTCG_PRIVY_USER_ID") as string;
      const maxAutoPayment = Number(runtime.getSetting("LTCG_MAX_AUTO_PAYMENT")) || 100;

      if (!apiUrl || !apiKey) {
        throw new Error("LTCG API not configured");
      }

      // Create API client with x402 config
      const client = new LTCGApiClient({
        apiKey,
        baseUrl: apiUrl,
        x402Config:
          privyAppId && privyAppSecret && agentPrivyUserId
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

      // Get available gem packages
      const packagesResponse = await client.getGemPackages();
      const packages: GemPackage[] = packagesResponse.packages;

      if (!packages || packages.length === 0) {
        throw new Error("No gem packages available");
      }

      // Parse message to find requested package or amount
      const messageText = message.content.text || "";
      let selectedPackage: GemPackage | undefined;

      // Check for specific package mentions
      const packageIdMatch = messageText.match(/package[:\s]+([a-zA-Z0-9_\-]+)/i);
      if (packageIdMatch) {
        selectedPackage = packages.find((p) => p.packageId === packageIdMatch[1]);
      }

      // Check for gem amount mentions
      if (!selectedPackage) {
        const gemAmountMatch = messageText.match(/(\d+)\s*gems?/i);
        if (gemAmountMatch?.[1]) {
          const requestedAmount = Number.parseInt(gemAmountMatch[1], 10);
          // Find closest package
          selectedPackage = packages.reduce((closest, pkg) => {
            const closestDiff = Math.abs((closest?.gems || 0) - requestedAmount);
            const pkgDiff = Math.abs(pkg.gems - requestedAmount);
            return pkgDiff < closestDiff ? pkg : closest;
          }, packages[0]);
        }
      }

      // If no specific package mentioned, use LLM to choose
      if (!selectedPackage) {
        const packageOptions = packages
          .map(
            (pkg, idx) =>
              `${idx + 1}. ${pkg.name}: ${pkg.gems.toLocaleString()} gems for $${(pkg.usdCents / 100).toFixed(2)}${pkg.bonusPercent ? ` (+${pkg.bonusPercent}% bonus)` : ""}`
          )
          .join("\n");

        const prompt = `Select a gem package for this agent. User message: "${messageText}"

Available packages:
${packageOptions}

Consider:
- Agent's stated preference (if any)
- Best value for typical gameplay (middle option is often best)
- Whether agent mentioned specific needs

Respond with JSON: { "packageIndex": <0-based index> }`;

        const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt,
          temperature: 0.3,
          maxTokens: 50,
        });

        const parsed = extractJsonFromLlmResponse(decision, {
          packageIndex: 0,
        });
        if (parsed.packageIndex >= 0 && parsed.packageIndex < packages.length) {
          selectedPackage = packages[parsed.packageIndex];
        }
      }

      // Fallback to first package
      if (!selectedPackage) {
        selectedPackage = packages[0];
      }

      if (!selectedPackage) {
        throw new Error("Failed to select a gem package");
      }

      // Check payment limit
      const usdAmount = selectedPackage.usdCents / 100;
      if (usdAmount > maxAutoPayment) {
        throw new PaymentLimitExceededError(
          BigInt(Math.round(usdAmount * 1_000_000)),
          BigInt(Math.round(maxAutoPayment * 1_000_000)),
          {
            reason: `Package costs $${usdAmount.toFixed(2)} but max auto-payment is $${maxAutoPayment}`,
          }
        );
      }

      logger.info(
        { packageId: selectedPackage.packageId, gems: selectedPackage.gems },
        "Purchasing gem package"
      );

      // Attempt purchase (x402 flow handled by client)
      const result = await client.purchaseGems(selectedPackage.packageId);

      const responseText = `Successfully purchased ${selectedPackage.gems.toLocaleString()} gems!

Package: ${selectedPackage.name}
Cost: $${(selectedPackage.usdCents / 100).toFixed(2)}
${result.transactionSignature ? `Transaction: ${result.transactionSignature.slice(0, 16)}...` : ""}
New Balance: ${result.newBalance?.toLocaleString() || "unknown"} gems

Your gems are ready to use in the shop!`;

      await callback({
        text: responseText,
        actions: ["PURCHASE_GEMS"],
        source: message.content.source,
        thought: `Completed x402 payment to purchase ${selectedPackage.gems} gems for $${(selectedPackage.usdCents / 100).toFixed(2)}`,
      } as Content);

      return {
        success: true,
        text: "Gems purchased successfully",
        values: {
          packageId: selectedPackage.packageId,
          packageName: selectedPackage.name,
          gemsPurchased: selectedPackage.gems,
          usdCents: selectedPackage.usdCents,
          newBalance: result.newBalance,
          transactionSignature: result.transactionSignature,
        },
        data: {
          actionName: "PURCHASE_GEMS",
          package: selectedPackage,
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in PURCHASE_GEMS action");

      let errorMessage: string;
      let thought: string;

      if (error instanceof PaymentRequiredError) {
        errorMessage = `Payment required but could not complete x402 flow. Requirements: ${JSON.stringify(error.paymentRequirements)}`;
        thought = "x402 payment flow failed - check wallet balance and delegation permissions";
      } else if (error instanceof InsufficientBalanceError) {
        errorMessage = `Insufficient token balance. Need ${error.requiredAmount.toString()} but have ${error.currentBalance.toString()}`;
        thought =
          "Wallet does not have enough tokens to complete this purchase. Consider a smaller package or funding the wallet.";
      } else if (error instanceof PaymentLimitExceededError) {
        errorMessage = `Purchase exceeds auto-payment limit of ${error.limit.toString()}. Requested: ${error.amount.toString()}`;
        thought =
          "This purchase is above the configured safety limit. Agent needs manual approval or limit increase.";
      } else {
        errorMessage = `Failed to purchase gems: ${error instanceof Error ? error.message : String(error)}`;
        thought = "Gem purchase failed due to API error or payment issue";
      }

      await callback({
        text: errorMessage,
        error: true,
        thought,
      } as Content);

      return {
        success: false,
        text: "Failed to purchase gems",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Buy some gems so I can get more cards",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Successfully purchased 1,000 gems!\n\nPackage: Standard Pack\nCost: $9.99\nTransaction: 4z8f9d2a...\nNew Balance: 1,250 gems\n\nYour gems are ready to use in the shop!",
          actions: ["PURCHASE_GEMS"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "I need 5000 gems for the premium pack",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Successfully purchased 5,500 gems!\n\nPackage: Premium Bundle\nCost: $49.99\nTransaction: 7x3k8m1b...\nNew Balance: 5,750 gems\n\nYour gems are ready to use in the shop!",
          actions: ["PURCHASE_GEMS"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Purchase the starter gem package",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Successfully purchased 100 gems!\n\nPackage: Starter Pack\nCost: $0.99\nTransaction: 2y5n7p4c...\nNew Balance: 350 gems\n\nYour gems are ready to use in the shop!",
          actions: ["PURCHASE_GEMS"],
        },
      },
    ],
  ],
};
