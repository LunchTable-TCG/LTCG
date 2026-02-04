/**
 * x402 Payment Handler
 *
 * Handles x402 payment flows for AI agents, including:
 * - Parsing payment requirements from 402 responses
 * - Building SPL token transfer transactions
 * - Signing transactions via Privy delegated actions
 * - Creating payment proofs for retry requests
 *
 * @see https://www.x402.org/
 */

import type { X402PaymentRequirements } from "./errors";
import {
  InsufficientBalanceError,
  PaymentLimitExceededError,
  UnsupportedPaymentError,
} from "./errors";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for x402 payment handling
 */
export interface X402Config {
  /** Enable x402 payment protocol */
  enabled: boolean;
  /** Privy App ID for delegated signing */
  privyAppId: string;
  /** Privy App Secret for server-side operations */
  privyAppSecret: string;
  /** Agent's Privy user ID (DID) */
  agentPrivyUserId: string;
  /** Agent's Solana wallet address */
  walletAddress: string;
  /** HD wallet derivation index */
  walletIndex?: number;
  /** Maximum auto-payment amount in atomic units (safety limit) */
  maxAutoPaymentAmount?: bigint;
  /** Whether to automatically pay when receiving 402 responses */
  autoPayEnabled?: boolean;
  /** Solana RPC URL for balance checks */
  solanaRpcUrl?: string;
}

/**
 * Payment proof to send with retry request
 */
export interface X402PaymentProof {
  x402Version: number;
  scheme: string;
  network: string;
  resource?: {
    url: string;
    description?: string;
  };
  accepted: {
    scheme: string;
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    maxTimeoutSeconds: number;
  };
  payload: {
    /** Base64-encoded signed transaction */
    transaction: string;
  };
}

/**
 * Result from payment handling
 */
export interface PaymentResult {
  /** Whether payment was successful */
  success: boolean;
  /** Payment proof to send with retry */
  proof?: X402PaymentProof;
  /** Error message if failed */
  error?: string;
  /** Payer wallet address */
  payer?: string;
}

// =============================================================================
// Payment Handler
// =============================================================================

/**
 * x402 Payment Handler
 *
 * Handles the client-side flow for x402 payments:
 * 1. Receives 402 response with PAYMENT-REQUIRED header
 * 2. Validates payment amount against safety limits
 * 3. Checks wallet balance
 * 4. Builds and signs SPL token transfer transaction
 * 5. Returns payment proof for retry request
 */
export class X402PaymentHandler {
  private readonly config: X402Config;
  private balanceCache: { balance: bigint; timestamp: number } | null = null;
  private readonly BALANCE_CACHE_TTL_MS = 30_000; // 30 seconds

  constructor(config: X402Config) {
    this.config = config;
  }

  /**
   * Handle a 402 Payment Required response
   */
  async handlePayment(requirements: X402PaymentRequirements): Promise<PaymentResult> {
    // Find a supported payment method
    const accept = requirements.accepts.find(
      (a) => a.scheme === "exact" && a.network.startsWith("solana:")
    );

    if (!accept) {
      const schemes = requirements.accepts.map((a) => `${a.scheme}:${a.network}`);
      throw new UnsupportedPaymentError("No supported Solana payment method available", schemes);
    }

    const amount = BigInt(accept.amount);

    // Check against safety limit
    if (this.config.maxAutoPaymentAmount && amount > this.config.maxAutoPaymentAmount) {
      throw new PaymentLimitExceededError(amount, this.config.maxAutoPaymentAmount);
    }

    // Check wallet balance
    const balance = await this.getWalletBalance(accept.asset);
    if (balance < amount) {
      throw new InsufficientBalanceError(balance, amount);
    }

    // Build and sign transaction
    try {
      const signedTransaction = await this.buildAndSignTransaction(
        accept.payTo,
        accept.asset,
        amount
      );

      // Build payment proof
      const proof: X402PaymentProof = {
        x402Version: requirements.x402Version,
        scheme: accept.scheme,
        network: accept.network,
        resource: requirements.resource,
        accepted: accept,
        payload: {
          transaction: signedTransaction,
        },
      };

      return {
        success: true,
        proof,
        payer: this.config.walletAddress,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign transaction",
      };
    }
  }

  /**
   * Get wallet balance for a specific token
   */
  async getWalletBalance(tokenMint: string): Promise<bigint> {
    // Check cache
    if (this.balanceCache && Date.now() - this.balanceCache.timestamp < this.BALANCE_CACHE_TTL_MS) {
      return this.balanceCache.balance;
    }

    const rpcUrl = this.config.solanaRpcUrl || "https://api.mainnet-beta.solana.com";

    try {
      // Get associated token account address
      const ataAddress = await this.getAssociatedTokenAddress(this.config.walletAddress, tokenMint);

      // Query token account balance
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountBalance",
          params: [ataAddress],
        }),
      });

      const data = await response.json();

      if (data.error) {
        // Account might not exist yet
        this.balanceCache = { balance: BigInt(0), timestamp: Date.now() };
        return BigInt(0);
      }

      const balance = BigInt(data.result?.value?.amount || "0");
      this.balanceCache = { balance, timestamp: Date.now() };
      return balance;
    } catch {
      // On error, assume 0 balance to be safe
      return BigInt(0);
    }
  }

  /**
   * Build and sign an SPL token transfer transaction
   *
   * This is a placeholder - actual implementation requires:
   * 1. Building the transaction with @solana/web3.js
   * 2. Signing via Privy Server SDK delegated actions
   */
  private async buildAndSignTransaction(
    recipient: string,
    tokenMint: string,
    amount: bigint
  ): Promise<string> {
    // NOTE: This is a simplified implementation
    // In production, this would:
    // 1. Use @solana/web3.js to build the transaction
    // 2. Call Privy Server SDK to sign via delegated actions

    const rpcUrl = this.config.solanaRpcUrl || "https://api.mainnet-beta.solana.com";

    // Get recent blockhash
    const blockhashResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestBlockhash",
        params: [{ commitment: "confirmed" }],
      }),
    });

    const blockhashData = await blockhashResponse.json();
    const blockhash = blockhashData.result?.value?.blockhash;

    if (!blockhash) {
      throw new Error("Failed to get blockhash");
    }

    // For now, we'll throw an error indicating this needs Privy integration
    // The actual implementation would use Privy's walletApi.solana.signTransaction
    throw new Error(
      `Transaction signing not implemented. Would transfer ${amount.toString()} tokens from ${this.config.walletAddress} to ${recipient} (mint: ${tokenMint}, blockhash: ${blockhash}). Requires Privy Server SDK integration for delegated signing.`
    );
  }

  /**
   * Get the associated token account address for a wallet and mint
   * This is a simplified version - actual implementation would use @solana/spl-token
   */
  private async getAssociatedTokenAddress(wallet: string, mint: string): Promise<string> {
    // Associated Token Program constants
    const _ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
    const _TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

    // In production, use @solana/spl-token getAssociatedTokenAddress
    // For now, we'll query the RPC to find the account
    const rpcUrl = this.config.solanaRpcUrl || "https://api.mainnet-beta.solana.com";

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [wallet, { mint }, { encoding: "jsonParsed" }],
      }),
    });

    const data = await response.json();
    const accounts = data.result?.value || [];

    if (accounts.length > 0) {
      return accounts[0].pubkey;
    }

    // If no account exists, derive the ATA address
    // This is a placeholder - actual derivation requires PDA calculation
    throw new Error(
      `No token account found for wallet ${wallet} and mint ${mint}. ATA derivation requires @solana/spl-token integration.`
    );
  }

  /**
   * Encode payment proof as base64 for PAYMENT-SIGNATURE header
   */
  static encodePaymentProof(proof: X402PaymentProof): string {
    return Buffer.from(JSON.stringify(proof)).toString("base64");
  }

  /**
   * Decode PAYMENT-REQUIRED header from 402 response
   */
  static decodePaymentRequired(header: string): X402PaymentRequirements | null {
    try {
      const decoded = Buffer.from(header, "base64").toString("utf-8");
      return JSON.parse(decoded) as X402PaymentRequirements;
    } catch {
      return null;
    }
  }
}
