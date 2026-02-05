"use node";
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Server-side HD wallet creation for AI Agents
 *
 * Uses Privy's server SDK to create NON-CUSTODIAL HD embedded wallets for agents.
 *
 * HD Wallet Architecture:
 * - User's main wallet: m/44'/501'/0/0' (created on login)
 * - Agent 1's wallet:   m/44'/501'/1/0' (walletIndex = 1)
 * - Agent 2's wallet:   m/44'/501'/2/0' (walletIndex = 2)
 * - etc.
 *
 * Two flows:
 * 1. Authenticated user creates agent → Wallet derived from user's HD tree
 * 2. API agent registration → New Privy user with own HD tree
 *
 * These are SELF-CUSTODIAL wallets - we NEVER have access to private keys.
 * Keys are sharded using Shamir's Secret Sharing in Privy's TEE infrastructure.
 *
 * SECURITY: This file uses "use node" to run in Node.js runtime
 * with access to the @privy-io/node package.
 */

import { PrivyClient } from "@privy-io/node";

// Types are defined inline to avoid module resolution issues with @privy-io/node in Convex
// When Privy updates their SDK, these may need adjustment

/** Linked account type for custom JWT auth */
interface LinkedAccountCustomJwtInput {
  type: "custom_auth";
  custom_user_id: string;
}

/** Privy wallet chain types */
type WalletChainType = "ethereum" | "solana";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

// Helper to get internal API without triggering TS2589
// eslint-disable-next-line @typescript-eslint/no-require-imports
function getInternalApi() {
  return require("../_generated/api").internal;
}

// Return type for wallet creation results
interface WalletCreationResult {
  success: boolean;
  error?: string;
  walletAddress?: string;
  walletIndex?: number;
  walletId?: string;
  privyUserId?: string;
}

// Type for pregenerate wallets request body parameters
interface PregenerateWalletConfig {
  chain_type: WalletChainType;
}

// Type for user creation request body parameters
interface CreateUserConfig {
  linked_accounts: LinkedAccountCustomJwtInput[];
  wallets: Array<{
    chain_type: WalletChainType;
  }>;
}

/**
 * Create a non-custodial HD Solana wallet for an agent owned by an authenticated user
 * The wallet is derived from the user's HD tree at the next available index
 */
export const createWalletForUserAgent = internalAction({
  args: {
    agentId: v.id("agents"),
    userId: v.id("users"), // Convex user ID
    privyUserId: v.string(), // User's Privy DID (did:privy:xxx)
  },
  handler: async (ctx, args): Promise<WalletCreationResult> => {
    const appId = process.env["PRIVY_APP_ID"];
    const appSecret = process.env["PRIVY_APP_SECRET"];

    if (!appId || !appSecret) {
      console.error("Missing Privy credentials for wallet creation");
      return {
        success: false,
        error: "Wallet creation not configured",
      };
    }

    try {
      const privy = new PrivyClient({
        appId,
        appSecret,
      });

      // Get and increment the user's wallet index
      const indexResult = await ctx.runMutation(
        getInternalApi().wallet.updateAgentWallet.incrementUserWalletIndex,
        { userId: args.userId }
      );
      const walletIndex = indexResult.nextIndex as number;

      // Create an additional HD wallet for the agent
      // Privy assigns the next available index automatically
      const pregenerateConfig: PregenerateWalletConfig = {
        chain_type: "solana",
      };

      const updatedUser = await privy.users().pregenerateWallets(args.privyUserId, {
        wallets: [pregenerateConfig],
      });

      // Find the newly created wallet
      const solanaWallets = updatedUser.linked_accounts.filter(
        (account: any) => account.type === "wallet" && account.chain_type === "solana"
      ) as any[];

      // Get the newly created wallet (last one in the array)
      const agentWallet = solanaWallets?.[solanaWallets.length - 1];

      if (!agentWallet?.address) {
        throw new Error("Failed to create HD wallet for agent");
      }

      // Use wallet_index from Privy's response (it's a read-only field assigned by Privy)
      const actualWalletIndex = agentWallet.wallet_index ?? walletIndex;

      // Update the agent record with wallet info
      await ctx.runMutation(getInternalApi().wallet.updateAgentWallet.updateWallet, {
        agentId: args.agentId,
        walletId: args.privyUserId, // User's Privy ID owns all wallets
        walletAddress: agentWallet.address,
        walletChainType: "solana",
        walletIndex: actualWalletIndex,
        privyUserId: args.privyUserId,
      });

      return {
        success: true,
        walletAddress: agentWallet.address,
        walletIndex: actualWalletIndex,
        privyUserId: args.privyUserId,
      };
    } catch (error) {
      console.error("Failed to create HD wallet for user agent:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update agent with failed status
      await ctx.runMutation(getInternalApi().wallet.updateAgentWallet.updateWalletFailed, {
        agentId: args.agentId,
        errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});

/**
 * Create a non-custodial HD Solana wallet for an API-registered agent
 * Creates a new Privy user for the agent with its own HD tree
 */
export const createSolanaWallet = internalAction({
  args: {
    agentId: v.id("agents"),
    ownerUserId: v.string(), // The internal user ID (agent:xxx or system:xxx)
  },
  handler: async (ctx, args): Promise<WalletCreationResult> => {
    const appId = process.env["PRIVY_APP_ID"];
    const appSecret = process.env["PRIVY_APP_SECRET"];

    if (!appId || !appSecret) {
      console.error("Missing Privy credentials for wallet creation");
      return {
        success: false,
        error: "Wallet creation not configured",
      };
    }

    try {
      const privy = new PrivyClient({
        appId,
        appSecret,
      });

      // Create a Privy user for the agent with a pregenerated HD embedded wallet
      // This is NON-CUSTODIAL - keys are sharded and we never have access
      // HD derivation path for Solana: m/44'/501'/0/0' (wallet_index = 0)
      const customAuthAccount: LinkedAccountCustomJwtInput = {
        type: "custom_auth",
        custom_user_id: args.ownerUserId,
      };

      const walletConfig: PregenerateWalletConfig = {
        chain_type: "solana",
      };

      const createUserConfig: CreateUserConfig = {
        linked_accounts: [customAuthAccount],
        wallets: [walletConfig],
      };

      const agentUser = await privy.users().create(createUserConfig);

      // Extract the wallet from the created user
      const solanaWallet = agentUser.linked_accounts.find(
        (account: any) => account.type === "wallet" && account.chain_type === "solana"
      ) as any;

      if (!solanaWallet?.address) {
        throw new Error("Failed to create embedded wallet for agent");
      }

      // Update the agent record with wallet info
      await ctx.runMutation(getInternalApi().wallet.updateAgentWallet.updateWallet, {
        agentId: args.agentId,
        walletId: agentUser.id, // Privy user ID serves as wallet ID
        walletAddress: solanaWallet.address,
        walletChainType: "solana",
        walletIndex: 0, // First wallet in agent's HD tree
        privyUserId: agentUser.id,
      });

      return {
        success: true,
        walletId: agentUser.id,
        walletAddress: solanaWallet.address,
        privyUserId: agentUser.id,
        walletIndex: 0,
      };
    } catch (error) {
      console.error("Failed to create HD wallet:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update agent with failed status
      await ctx.runMutation(getInternalApi().wallet.updateAgentWallet.updateWalletFailed, {
        agentId: args.agentId,
        errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});
