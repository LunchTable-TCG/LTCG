/**
 * SPL Token Transfer Transaction Utilities
 *
 * Functions for building unsigned token transfer transactions.
 * Transactions are built on the backend and signed on the frontend with Privy.
 */

import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TOKEN } from "../constants";
import { type SolanaNetwork, getConnection } from "./connection";
import { getAssociatedTokenAddress, toRawAmount } from "./tokenBalance";

/**
 * Token Program ID (SPL Token)
 */
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/**
 * Associated Token Program ID
 */
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

/**
 * Create a transfer instruction for SPL tokens
 *
 * This creates an unsigned instruction that transfers tokens
 * from one associated token account to another.
 *
 * @param from - Sender wallet address (base58)
 * @param to - Recipient wallet address (base58)
 * @param amount - Amount to transfer in human-readable format
 * @param tokenMint - Token mint address (defaults to LTCG token)
 * @returns TransactionInstruction for the transfer
 *
 * @example
 * ```typescript
 * const instruction = await createTokenTransferInstruction(
 *   "7xKXtg...", // sender
 *   "9yLMnh...", // recipient
 *   100 // 100 tokens
 * );
 * ```
 */
export async function createTokenTransferInstruction(
  from: string,
  to: string,
  amount: number,
  tokenMint?: string
) {
  const mintAddress = tokenMint || TOKEN.MINT_ADDRESS;

  if (!mintAddress) {
    throw new Error("Token mint address not configured. Set LTCG_TOKEN_MINT environment variable.");
  }

  const fromPubkey = new PublicKey(from);
  const toPubkey = new PublicKey(to);
  const mintPubkey = new PublicKey(mintAddress);

  // Get associated token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(fromPubkey, mintPubkey);
  const toTokenAccount = await getAssociatedTokenAddress(toPubkey, mintPubkey);

  // Convert to raw amount
  const rawAmount = toRawAmount(amount);

  // Create the transfer instruction
  // SPL Token transfer instruction layout:
  // - Instruction index: 3 (Transfer)
  // - Amount: u64 (8 bytes, little-endian)
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0); // Transfer instruction index
  data.writeBigUInt64LE(rawAmount, 1);

  return new TransactionInstruction({
    keys: [
      { pubkey: fromTokenAccount, isSigner: false, isWritable: true },
      { pubkey: toTokenAccount, isSigner: false, isWritable: true },
      { pubkey: fromPubkey, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_PROGRAM_ID,
    data,
  });
}

/**
 * Create an instruction to create an associated token account if needed
 *
 * This instruction will create the ATA for the recipient if it doesn't exist.
 * The sender (payer) pays for the account creation.
 *
 * @param payer - Account paying for creation (base58)
 * @param owner - Owner of the new token account (base58)
 * @param tokenMint - Token mint address
 * @returns TransactionInstruction for creating the ATA
 */
export async function createAssociatedTokenAccountInstruction(
  payer: string,
  owner: string,
  tokenMint?: string
) {
  const mintAddress = tokenMint || TOKEN.MINT_ADDRESS;

  if (!mintAddress) {
    throw new Error("Token mint address not configured.");
  }

  const payerPubkey = new PublicKey(payer);
  const ownerPubkey = new PublicKey(owner);
  const mintPubkey = new PublicKey(mintAddress);

  const associatedToken = await getAssociatedTokenAddress(ownerPubkey, mintPubkey);

  // Create ATA instruction (idempotent - will succeed even if account exists)
  // Instruction data is empty for create instruction
  return new TransactionInstruction({
    keys: [
      { pubkey: payerPubkey, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: ownerPubkey, isSigner: false, isWritable: false },
      { pubkey: mintPubkey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.alloc(0),
  });
}

/**
 * Parameters for building a token transfer transaction
 */
export interface TokenTransferParams {
  /** Sender wallet address (base58) */
  from: string;
  /** Recipient wallet address (base58) */
  to: string;
  /** Amount to transfer in human-readable format */
  amount: number;
  /** Optional fee recipient wallet address */
  feeRecipient?: string;
  /** Optional fee amount in human-readable format */
  feeAmount?: number;
  /** Token mint address (defaults to LTCG token) */
  tokenMint?: string;
  /** Network to use for blockhash (defaults to configured) */
  network?: SolanaNetwork;
  /** Whether to create recipient ATA if it doesn't exist */
  createRecipientAta?: boolean;
}

/**
 * Result of building a token transfer transaction
 */
export interface TokenTransferResult {
  /** The unsigned transaction (serialized as base64) */
  transaction: string;
  /** Human-readable description of the transaction */
  description: string;
  /** Total amount being transferred (including fees) */
  totalAmount: number;
  /** The recent blockhash used */
  blockhash: string;
  /** Block height when transaction expires */
  lastValidBlockHeight: number;
}

/**
 * Build an unsigned token transfer transaction
 *
 * Creates a complete transaction that can be signed by the frontend (via Privy).
 * Optionally includes a platform fee as a separate transfer.
 *
 * @param params - Transfer parameters
 * @returns Unsigned transaction ready for signing
 *
 * @example
 * ```typescript
 * // Simple transfer
 * const result = await buildTokenTransferTransaction({
 *   from: "7xKXtg...",
 *   to: "9yLMnh...",
 *   amount: 100,
 * });
 *
 * // Transfer with platform fee
 * const result = await buildTokenTransferTransaction({
 *   from: "7xKXtg...",
 *   to: "9yLMnh...", // seller
 *   amount: 95, // seller receives
 *   feeRecipient: "TREASURY...",
 *   feeAmount: 5, // platform fee
 * });
 * ```
 */
export async function buildTokenTransferTransaction(
  params: TokenTransferParams
): Promise<TokenTransferResult> {
  const {
    from,
    to,
    amount,
    feeRecipient,
    feeAmount,
    tokenMint,
    network,
    createRecipientAta = true,
  } = params;

  const connection = getConnection(network);

  // Validate amounts
  if (amount <= 0) {
    throw new Error("Transfer amount must be positive");
  }
  if (feeAmount !== undefined && feeAmount < 0) {
    throw new Error("Fee amount cannot be negative");
  }

  // Get recent blockhash for transaction
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  // Build transaction
  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(from);

  // Create recipient ATA if requested (common for first-time transfers)
  if (createRecipientAta) {
    const createAtaIx = await createAssociatedTokenAccountInstruction(from, to, tokenMint);
    transaction.add(createAtaIx);
  }

  // Add main transfer instruction
  const transferIx = await createTokenTransferInstruction(from, to, amount, tokenMint);
  transaction.add(transferIx);

  // Add fee transfer if specified
  if (feeRecipient && feeAmount && feeAmount > 0) {
    // Create fee recipient ATA if needed
    if (createRecipientAta) {
      const feeAtaIx = await createAssociatedTokenAccountInstruction(from, feeRecipient, tokenMint);
      transaction.add(feeAtaIx);
    }

    const feeIx = await createTokenTransferInstruction(from, feeRecipient, feeAmount, tokenMint);
    transaction.add(feeIx);
  }

  // Serialize the transaction (unsigned)
  const serialized = transaction
    .serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })
    .toString("base64");

  // Calculate total
  const totalAmount = amount + (feeAmount || 0);

  // Build description
  let description = `Transfer ${amount} tokens to ${to.slice(0, 8)}...`;
  if (feeAmount && feeRecipient) {
    description += ` (+ ${feeAmount} platform fee)`;
  }

  return {
    transaction: serialized,
    description,
    totalAmount,
    blockhash,
    lastValidBlockHeight,
  };
}

/**
 * Build a marketplace purchase transaction
 *
 * Convenience function for marketplace purchases that automatically
 * splits payment between seller and platform treasury.
 *
 * @param buyer - Buyer wallet address
 * @param seller - Seller wallet address
 * @param price - Total purchase price
 * @param tokenMint - Optional token mint (defaults to LTCG)
 * @param network - Optional network override
 * @returns Unsigned transaction for the purchase
 */
export async function buildMarketplacePurchaseTransaction(
  buyer: string,
  seller: string,
  price: number,
  tokenMint?: string,
  network?: SolanaNetwork
) {
  // Calculate platform fee
  const feeAmount = price * TOKEN.PLATFORM_FEE_PERCENT;
  const sellerAmount = price - feeAmount;

  // Validate treasury is configured
  if (!TOKEN.TREASURY_WALLET) {
    throw new Error(
      "Treasury wallet not configured. Set LTCG_TREASURY_WALLET environment variable."
    );
  }

  return buildTokenTransferTransaction({
    from: buyer,
    to: seller,
    amount: sellerAmount,
    feeRecipient: TOKEN.TREASURY_WALLET,
    feeAmount,
    tokenMint,
    network,
  });
}

/**
 * Deserialize a base64 transaction for inspection
 *
 * Useful for debugging and logging transaction details.
 *
 * @param serializedTransaction - Base64-encoded transaction
 * @returns Deserialized Transaction object
 */
export function deserializeTransaction(serializedTransaction: string) {
  const buffer = Buffer.from(serializedTransaction, "base64");
  return Transaction.from(buffer);
}
