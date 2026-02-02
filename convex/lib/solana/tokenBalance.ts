/**
 * SPL Token Balance Utilities
 *
 * Functions for querying SPL token balances on Solana.
 * Used by Convex actions to verify user token holdings.
 */

import { PublicKey } from "@solana/web3.js";
import { TOKEN } from "../constants";
import { type SolanaNetwork, getConnection } from "./connection";

/**
 * Get the associated token account address for a wallet and mint
 *
 * This is a pure computation - no RPC calls needed.
 * Derives the PDA for the token account using the standard ATA program.
 *
 * @param walletAddress - Owner wallet public key
 * @param tokenMint - SPL token mint public key
 * @returns Associated token account public key
 */
export async function getAssociatedTokenAddress(
  walletAddress: PublicKey,
  tokenMint: PublicKey
): Promise<PublicKey> {
  // Associated Token Program ID
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  // Token Program ID
  const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

  // Derive the PDA
  const [address] = PublicKey.findProgramAddressSync(
    [walletAddress.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), tokenMint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return address;
}

/**
 * Token balance result
 */
export interface TokenBalanceResult {
  /** Balance in human-readable format (e.g., 1.5 tokens) */
  balance: number;
  /** Raw balance in smallest units (lamports equivalent) */
  rawBalance: bigint;
  /** Token decimals used for conversion */
  decimals: number;
  /** Whether the token account exists */
  accountExists: boolean;
}

/**
 * Get SPL token balance for a wallet
 *
 * Queries the Solana RPC for the token balance of a specific wallet.
 * Returns 0 if the token account doesn't exist (user has never held the token).
 *
 * @param walletAddress - Wallet address (base58 string)
 * @param tokenMint - SPL token mint address (defaults to LTCG token from env)
 * @param network - Solana network (defaults to configured network)
 * @returns Token balance result with human-readable and raw values
 *
 * @example
 * ```typescript
 * // Check LTCG token balance
 * const result = await getSPLTokenBalance("7xKXtg...");
 * console.log(`Balance: ${result.balance} LTCG`);
 *
 * // Check custom token
 * const usdcResult = await getSPLTokenBalance(
 *   "7xKXtg...",
 *   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 * );
 * ```
 */
export async function getSPLTokenBalance(
  walletAddress: string,
  tokenMint?: string,
  network?: SolanaNetwork
): Promise<TokenBalanceResult> {
  const connection = getConnection(network);

  // Use provided mint or default to LTCG token
  const mintAddress = tokenMint || TOKEN.MINT_ADDRESS;

  // Validate inputs
  if (!mintAddress) {
    throw new Error("Token mint address not configured. Set LTCG_TOKEN_MINT environment variable.");
  }

  try {
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(mintAddress);

    // Get the associated token account address
    const tokenAccountAddress = await getAssociatedTokenAddress(walletPubkey, mintPubkey);

    // Fetch the token account info
    const accountInfo = await connection.getAccountInfo(tokenAccountAddress);

    // If account doesn't exist, user has never held this token
    if (!accountInfo) {
      return {
        balance: 0,
        rawBalance: BigInt(0),
        decimals: TOKEN.DECIMALS,
        accountExists: false,
      };
    }

    // Parse the token account data
    // Token account data layout (first 64 bytes):
    // - mint: 32 bytes
    // - owner: 32 bytes
    // - amount: 8 bytes (u64, little-endian)
    const data = accountInfo.data;
    if (data.length < 72) {
      throw new Error("Invalid token account data");
    }

    // Read amount as u64 (8 bytes, little-endian) starting at byte 64
    const amountBuffer = data.slice(64, 72);
    const rawBalance = amountBuffer.readBigUInt64LE(0);

    // Convert to human-readable format using decimals
    const decimals = TOKEN.DECIMALS;
    const balance = Number(rawBalance) / 10 ** decimals;

    return {
      balance,
      rawBalance,
      decimals,
      accountExists: true,
    };
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error) {
      // Invalid public key format
      if (error.message.includes("Invalid public key")) {
        throw new Error(`Invalid wallet address: ${walletAddress}`);
      }
      // Re-throw with context
      throw new Error(`Failed to fetch token balance: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if a wallet has sufficient token balance
 *
 * Convenience function for verifying a user can afford a purchase.
 *
 * @param walletAddress - Wallet address to check
 * @param requiredAmount - Required balance in human-readable format
 * @param tokenMint - Optional custom token mint
 * @returns True if balance >= requiredAmount
 */
export async function hasEnoughTokens(
  walletAddress: string,
  requiredAmount: number,
  tokenMint?: string
) {
  const result = await getSPLTokenBalance(walletAddress, tokenMint);
  return result.balance >= requiredAmount;
}

/**
 * Convert human-readable amount to raw token units
 *
 * @param amount - Human-readable amount (e.g., 1.5)
 * @param decimals - Token decimals (defaults to TOKEN.DECIMALS)
 * @returns Raw amount in smallest units
 */
export function toRawAmount(amount: number, decimals: number = TOKEN.DECIMALS) {
  return BigInt(Math.floor(amount * 10 ** decimals));
}

/**
 * Convert raw token units to human-readable amount
 *
 * @param rawAmount - Raw amount in smallest units
 * @param decimals - Token decimals (defaults to TOKEN.DECIMALS)
 * @returns Human-readable amount
 */
export function fromRawAmount(rawAmount: bigint, decimals: number = TOKEN.DECIMALS) {
  return Number(rawAmount) / 10 ** decimals;
}
