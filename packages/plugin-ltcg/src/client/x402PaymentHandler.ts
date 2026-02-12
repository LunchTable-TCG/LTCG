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

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { logger } from "../utils/logger";
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
  async handlePayment(
    requirements: X402PaymentRequirements,
  ): Promise<PaymentResult> {
    // Find a supported payment method
    const accept = requirements.accepts.find(
      (a) => a.scheme === "exact" && a.network.startsWith("solana:"),
    );

    if (!accept) {
      const schemes = requirements.accepts.map(
        (a) => `${a.scheme}:${a.network}`,
      );
      throw new UnsupportedPaymentError(
        "No supported Solana payment method available",
        schemes,
      );
    }

    const amount = BigInt(accept.amount);

    // Check against safety limit
    if (
      this.config.maxAutoPaymentAmount &&
      amount > this.config.maxAutoPaymentAmount
    ) {
      throw new PaymentLimitExceededError(
        amount,
        this.config.maxAutoPaymentAmount,
      );
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
        amount,
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
        error:
          error instanceof Error ? error.message : "Failed to sign transaction",
      };
    }
  }

  /**
   * Get wallet balance for a specific token (or native SOL).
   *
   * For native SOL (mint = System Program ID "1111..."), queries lamport balance.
   * For SPL tokens (e.g. USDC), queries the associated token account balance.
   */
  async getWalletBalance(tokenMint: string): Promise<bigint> {
    // Check cache
    if (
      this.balanceCache &&
      Date.now() - this.balanceCache.timestamp < this.BALANCE_CACHE_TTL_MS
    ) {
      return this.balanceCache.balance;
    }

    const connection = this.getConnection();
    const walletPubkey = new PublicKey(this.config.walletAddress);

    try {
      const isNativeSol = this.isNativeSol(tokenMint);

      if (isNativeSol) {
        // Native SOL balance
        const lamports = await connection.getBalance(walletPubkey, "confirmed");
        const balance = BigInt(lamports);
        this.balanceCache = { balance, timestamp: Date.now() };
        return balance;
      }

      // SPL token balance — find the associated token account
      const ataAddress = await this.getAssociatedTokenAddress(
        this.config.walletAddress,
        tokenMint,
      );

      const rpcUrl =
        this.config.solanaRpcUrl || "https://api.mainnet-beta.solana.com";
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
   * Build and sign a payment transaction.
   *
   * For native SOL (mint = System Program ID): uses SystemProgram.transfer.
   * For SPL tokens (e.g. USDC): builds an SPL token transfer instruction.
   *
   * Signs via Privy Server Wallet RPC (delegated signing), matching the
   * pattern used in convex/wager/escrow.ts signAndSendWithPrivy.
   *
   * @param recipient - Destination wallet address (payTo from x402 header)
   * @param tokenMint - Token mint address (SOL sentinel or SPL mint)
   * @param amount - Amount in atomic units (lamports for SOL, smallest unit for SPL)
   * @returns Base64-encoded signed transaction
   */
  private async buildAndSignTransaction(
    recipient: string,
    tokenMint: string,
    amount: bigint,
  ): Promise<string> {
    const connection = this.getConnection();
    const payerPubkey = new PublicKey(this.config.walletAddress);
    const recipientPubkey = new PublicKey(recipient);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payerPubkey;

    const isNativeSol = this.isNativeSol(tokenMint);

    if (isNativeSol) {
      // Native SOL transfer via SystemProgram
      logger.info(
        `[x402] Building SOL transfer: ${amount.toString()} lamports ` +
          `(${Number(amount) / LAMPORTS_PER_SOL} SOL) to ${recipient}`,
      );

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: payerPubkey,
          toPubkey: recipientPubkey,
          lamports: amount,
        }),
      );
    } else {
      // SPL token transfer (e.g. USDC)
      logger.info(
        `[x402] Building SPL token transfer: ${amount.toString()} atomic units ` +
          `(mint: ${tokenMint}) to ${recipient}`,
      );

      // Get sender's associated token account
      const senderAta = await this.getAssociatedTokenAddress(
        this.config.walletAddress,
        tokenMint,
      );
      // Get recipient's associated token account
      const recipientAta = await this.getAssociatedTokenAddress(
        recipient,
        tokenMint,
      );

      // TODO: Replace with @solana/spl-token createTransferInstruction when the
      // package is added to dependencies. For now, build the instruction manually
      // using the SPL Token Program transfer layout.
      const TOKEN_PROGRAM_ID = new PublicKey(
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      );

      // SPL Token transfer instruction (instruction index 3)
      // Layout: [1 byte instruction index (3)] [8 bytes LE amount]
      const dataBuffer = Buffer.alloc(9);
      dataBuffer.writeUInt8(3, 0); // Transfer instruction index
      dataBuffer.writeBigUInt64LE(amount, 1);

      transaction.add({
        keys: [
          {
            pubkey: new PublicKey(senderAta),
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: new PublicKey(recipientAta),
            isSigner: false,
            isWritable: true,
          },
          { pubkey: payerPubkey, isSigner: true, isWritable: false },
        ],
        programId: TOKEN_PROGRAM_ID,
        data: dataBuffer,
      });
    }

    // Sign via Privy Server Wallet RPC
    return await this.signWithPrivy(transaction);
  }

  /**
   * Sign a transaction using Privy Server Wallet RPC.
   *
   * Follows the same pattern as convex/wager/escrow.ts signAndSendWithPrivy,
   * but returns the signed transaction as base64 instead of broadcasting it.
   * The x402 protocol requires sending the signed tx in the PAYMENT-SIGNATURE
   * header — the server will broadcast it.
   *
   * @param transaction - The unsigned transaction to sign
   * @returns Base64-encoded signed transaction
   */
  private async signWithPrivy(transaction: Transaction): Promise<string> {
    const { privyAppId, privyAppSecret, agentPrivyUserId } = this.config;

    if (!privyAppId || !privyAppSecret || !agentPrivyUserId) {
      throw new Error(
        "Privy configuration incomplete. Provide privyAppId, privyAppSecret, and " +
          "agentPrivyUserId in x402Config to enable transaction signing.",
      );
    }

    const basicAuth = btoa(`${privyAppId}:${privyAppSecret}`);

    // Serialize the unsigned transaction
    const serializedTx = transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString("base64");

    logger.debug(
      `[x402] Signing transaction via Privy for user ${agentPrivyUserId}`,
    );

    // Use Privy's wallet RPC to sign (not signAndSend — the server broadcasts)
    const signResponse = await fetch(
      `https://api.privy.io/v1/wallets/${agentPrivyUserId}/rpc`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-app-id": privyAppId,
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          method: "signTransaction",
          params: {
            transaction: serializedTx,
            encoding: "base64",
            caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", // Solana mainnet
          },
        }),
      },
    );

    if (!signResponse.ok) {
      const errorText = await signResponse.text();
      throw new Error(
        `Privy transaction signing failed (${signResponse.status}): ${errorText}`,
      );
    }

    const result = await signResponse.json();

    if (!result.data?.signedTransaction) {
      throw new Error(
        `Privy signTransaction returned no signed transaction: ${JSON.stringify(result)}`,
      );
    }

    logger.info("[x402] Transaction signed successfully via Privy");
    return result.data.signedTransaction as string;
  }

  /**
   * Check whether a token mint represents native SOL.
   *
   * Native SOL uses the System Program ID ("1111...1111") as a sentinel mint,
   * matching the convention in convex/lib/wagerTiers.ts SOL_MINT.
   */
  private isNativeSol(tokenMint: string): boolean {
    return (
      tokenMint === "11111111111111111111111111111111" || tokenMint === "native"
    );
  }

  /**
   * Create a Solana Connection from configured RPC URL.
   */
  private getConnection(): Connection {
    const rpcUrl =
      this.config.solanaRpcUrl || "https://api.mainnet-beta.solana.com";
    return new Connection(rpcUrl, { commitment: "confirmed" });
  }

  /**
   * Get the associated token account address for a wallet and mint.
   *
   * Queries the RPC for existing token accounts. If none found, derives
   * the ATA address using the standard PDA seeds.
   */
  private async getAssociatedTokenAddress(
    wallet: string,
    mint: string,
  ): Promise<string> {
    const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    );
    const TOKEN_PROGRAM_ID = new PublicKey(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    );

    // First, try to find an existing token account via RPC
    const rpcUrl =
      this.config.solanaRpcUrl || "https://api.mainnet-beta.solana.com";

    try {
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
    } catch {
      // Fall through to PDA derivation
    }

    // Derive ATA address using standard PDA seeds:
    // seeds = [wallet, TOKEN_PROGRAM_ID, mint]
    // program = ASSOCIATED_TOKEN_PROGRAM_ID
    const walletPubkey = new PublicKey(wallet);
    const mintPubkey = new PublicKey(mint);

    const [ata] = PublicKey.findProgramAddressSync(
      [
        walletPubkey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    return ata.toBase58();
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
