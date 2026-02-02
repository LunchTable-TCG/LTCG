/**
 * Get Wallet Info Action
 *
 * Check the agent's non-custodial HD wallet status and balance.
 * Wallets are automatically created during agent registration via Privy.
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
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";

export const getWalletInfoAction: Action = {
  name: "GET_WALLET_INFO",
  similes: ["CHECK_WALLET", "WALLET_STATUS", "WALLET_BALANCE", "MY_WALLET"],
  description: "Check the agent's Solana wallet address and balance",

  validate: async (runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    try {
      // Must have API key (be registered)
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
      logger.error({ error }, "Error validating get wallet info action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling GET_WALLET_INFO action");

      // Get API configuration
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

      if (!apiKey || !apiUrl) {
        throw new Error("Agent not properly configured - missing API key or URL");
      }

      // Create API client
      const client = new LTCGApiClient({
        apiKey,
        baseUrl: apiUrl,
      });

      // Get wallet info
      const walletData = await client.getWalletInfo();

      if (!walletData.hasWallet || !walletData.wallet) {
        const responseText = `No wallet found for this agent.

Wallets are automatically created during agent registration. If you registered before the wallet feature was added, contact support for assistance.`;

        await callback({
          text: responseText,
          actions: ["GET_WALLET_INFO"],
          thought: "Agent does not have an associated wallet",
        } as Content);

        return {
          success: true,
          text: "No wallet found",
          values: {
            hasWallet: false,
          },
          data: {
            actionName: "GET_WALLET_INFO",
            hasWallet: false,
          },
        };
      }

      const { wallet } = walletData;
      const balanceInfo = wallet.balance
        ? `\nBalance: ${wallet.balance.sol.toFixed(6)} SOL (${wallet.balance.lamports} lamports)`
        : "";

      const responseText = `Wallet Information:

Address: ${wallet.address}
Chain: ${wallet.chainType.toUpperCase()}
Wallet Index: ${wallet.walletIndex} (HD derivation path)
Created: ${new Date(wallet.createdAt).toLocaleString()}${balanceInfo}

This is a non-custodial HD wallet managed via Privy. Your private keys are never stored on LTCG servers.`;

      // Update stored wallet address if different
      const storedAddress = runtime.getSetting("LTCG_WALLET_ADDRESS") as string;
      if (storedAddress !== wallet.address) {
        runtime.setSetting("LTCG_WALLET_ADDRESS", wallet.address);
      }

      await callback({
        text: responseText,
        actions: ["GET_WALLET_INFO"],
        thought: "Successfully retrieved agent wallet information",
      } as Content);

      return {
        success: true,
        text: "Wallet info retrieved",
        values: {
          hasWallet: true,
          walletAddress: wallet.address,
          chainType: wallet.chainType,
          walletIndex: wallet.walletIndex,
          balanceSol: wallet.balance?.sol,
          balanceLamports: wallet.balance?.lamports,
        },
        data: {
          actionName: "GET_WALLET_INFO",
          wallet,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in GET_WALLET_INFO action");

      await callback({
        text: `Failed to get wallet info: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought: "Failed to retrieve wallet information from API",
      } as Content);

      return {
        success: false,
        text: "Failed to get wallet info",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Check my wallet",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Wallet Information:\n\nAddress: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\nChain: SOLANA\nWallet Index: 1 (HD derivation path)\nCreated: 1/15/2026, 10:30:00 AM\n\nThis is a non-custodial HD wallet managed via Privy. Your private keys are never stored on LTCG servers.",
          actions: ["GET_WALLET_INFO"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "What is my wallet balance?",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Wallet Information:\n\nAddress: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\nChain: SOLANA\nWallet Index: 1 (HD derivation path)\nCreated: 1/15/2026, 10:30:00 AM\nBalance: 0.500000 SOL (500000000 lamports)\n\nThis is a non-custodial HD wallet managed via Privy. Your private keys are never stored on LTCG servers.",
          actions: ["GET_WALLET_INFO"],
        },
      },
    ],
  ],
};
