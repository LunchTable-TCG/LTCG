"use node";

/**
 * Crypto Wager Escrow Actions
 *
 * Convex node actions that interact with the onchain Anchor MatchEscrow program.
 * Handles the full lifecycle of crypto-wagered matches:
 *
 * 1. initializeEscrow — Creates PDA, sets escrow params, confirms x402 deposits
 * 2. collectHostDeposit — Deposits host wager to escrow (agent hosts only)
 * 3. settleEscrow — Distributes pot: 90% winner, 10% treasury
 * 4. forfeitEscrow — Same as settle but triggered by forfeit/DC
 * 5. confirmOpponentDeposit — Confirms joiner's x402 deposit onchain
 *
 * PDA seeds: [b"escrow", sha256(lobbyId)[0..32]]
 *
 * Instructions are built manually without the Anchor TS SDK by computing
 * discriminators (sha256("global:<instruction_name>")[0..8]) and serializing
 * args with Borsh-compatible layouts. This avoids adding @coral-xyz/anchor
 * as a dependency.
 *
 * SECURITY: This file uses "use node" to run in Node.js runtime with access
 * to @solana/web3.js and @privy-io/node for server-side signing.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
import { internalAction } from "../_generated/server";
import { SOLANA } from "../lib/constants";
import {
  CRYPTO_WAGER_WINNER_PERCENTAGE,
  type WagerCurrency,
  getMintForCurrency,
  toAtomicUnits,
} from "../lib/wagerTiers";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Minimal action context shape for helper functions.
 * Uses FunctionReference-compatible signatures to avoid TS2589
 * while still being more descriptive than raw `any`.
 */
// biome-ignore lint/suspicious/noExplicitAny: Convex FunctionReference types trigger TS2589
type ActionQueryCtx = { runQuery: (fn: any, args: any) => Promise<any> };
type ActionCtx = ActionQueryCtx & {
  // biome-ignore lint/suspicious/noExplicitAny: Convex FunctionReference types trigger TS2589
  runMutation: (fn: any, args: any) => Promise<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Convex FunctionReference types trigger TS2589
  scheduler: { runAfter: (delay: number, fn: any, args: any) => Promise<any> };
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * MatchEscrow Anchor program ID.
 * Set via environment variable; falls back to a placeholder for development.
 */
const MATCH_ESCROW_PROGRAM_ID = new PublicKey(
  process.env["MATCH_ESCROW_PROGRAM_ID"] || "11111111111111111111111111111112"
);

/** PDA seed prefix for escrow accounts */
const ESCROW_SEED_PREFIX = Buffer.from("escrow");

/** Maximum retries for settlement before giving up (cron will retry later) */
const MAX_SETTLE_RETRIES = 3;

/** SPL Token Program ID */
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/** Associated Token Program ID */
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

// ============================================================================
// ANCHOR INSTRUCTION HELPERS
// ============================================================================

/**
 * Compute the 8-byte Anchor instruction discriminator.
 * Format: sha256("global:<instruction_name>")[0..8]
 */
async function anchorDiscriminator(instructionName: string): Promise<Buffer> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`global:${instructionName}`)
  );
  return Buffer.from(hash).subarray(0, 8);
}

/**
 * Check if a token mint represents native SOL (System Program sentinel).
 */
function isNativeSolMint(mint: string): boolean {
  return mint === "11111111111111111111111111111111";
}

/**
 * Derive the associated token account address for a wallet and mint.
 * Seeds: [wallet, TOKEN_PROGRAM_ID, mint] → ASSOCIATED_TOKEN_PROGRAM_ID PDA
 */
function getAssociatedTokenAddressSync(wallet: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata;
}

// ============================================================================
// PDA DERIVATION
// ============================================================================

/**
 * Derive the escrow PDA for a given lobby ID.
 *
 * PDA seeds: [b"escrow", sha256(lobbyId)[0..32]]
 *
 * We hash the Convex document ID to produce a fixed 32-byte seed,
 * which Anchor uses to deterministically locate the escrow account.
 *
 * @param lobbyId - Convex gameLobbies document ID string
 * @returns The PDA public key, bump seed, and lobby ID hash
 */
async function deriveEscrowPda(lobbyId: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(lobbyId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const lobbyIdHash = Buffer.from(hashBuffer);

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [ESCROW_SEED_PREFIX, lobbyIdHash],
    MATCH_ESCROW_PROGRAM_ID
  );

  return { pda, bump, lobbyIdHash };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get a Solana RPC connection using project-wide config.
 */
function getConnection() {
  return new Connection(SOLANA.RPC_URL, {
    commitment: SOLANA.COMMITMENT,
    confirmTransactionInitialTimeout: 60_000,
  });
}

/**
 * Get the treasury authority wallet address and Privy wallet ID.
 * This is the server-controlled wallet that acts as the escrow authority.
 *
 * The treasury authority is fetched from the fee_collection treasury wallet
 * in the database, or falls back to environment variables.
 */
async function getTreasuryAuthority(ctx: ActionQueryCtx) {
  // Try to get from database first
  try {
    const wallet = await ctx.runQuery(
      internalAny.treasury.wallets.getActiveFeeCollectionWallet,
      {}
    );
    if (wallet?.address && wallet?.privyWalletId) {
      return {
        address: wallet.address,
        privyWalletId: wallet.privyWalletId,
      };
    }
  } catch {
    // Fall through to env vars
  }

  // Fallback to environment variables
  const address = process.env["TREASURY_AUTHORITY_WALLET"];
  const privyWalletId = process.env["TREASURY_AUTHORITY_PRIVY_WALLET_ID"];

  if (!address || !privyWalletId) {
    throw new Error(
      "Treasury authority not configured. Set TREASURY_AUTHORITY_WALLET and TREASURY_AUTHORITY_PRIVY_WALLET_ID environment variables, or create a fee_collection treasury wallet via admin dashboard."
    );
  }

  return { address, privyWalletId };
}

/**
 * Sign and send a transaction using Privy server wallet.
 *
 * Uses Privy's RPC endpoint to sign a transaction with the server-controlled
 * treasury wallet, then submits it to Solana.
 *
 * @param transaction - The unsigned transaction to sign and send
 * @param privyWalletId - The Privy wallet ID of the signer
 * @returns Transaction signature
 */
async function signAndSendWithPrivy(transaction: Transaction, privyWalletId: string) {
  const PRIVY_APP_ID = process.env["PRIVY_APP_ID"] ?? "";
  const PRIVY_APP_SECRET = process.env["PRIVY_APP_SECRET"] ?? "";
  const basicAuth = btoa(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`);

  // Serialize the unsigned transaction
  const serializedTx = transaction
    .serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })
    .toString("base64");

  // Sign via Privy Server Wallet RPC
  const signResponse = await fetch(`https://api.privy.io/v1/wallets/${privyWalletId}/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "privy-app-id": PRIVY_APP_ID,
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify({
      method: "signAndSendTransaction",
      params: {
        transaction: serializedTx,
        encoding: "base64",
        caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", // Solana mainnet
      },
    }),
  });

  if (!signResponse.ok) {
    const errorText = await signResponse.text();
    throw new Error(`Privy sign-and-send failed (${signResponse.status}): ${errorText}`);
  }

  const result = await signResponse.json();

  if (!result.data?.signature) {
    throw new Error(`Privy sign-and-send returned no signature: ${JSON.stringify(result)}`);
  }

  return result.data.signature as string;
}

/**
 * Record a transaction in the cryptoWagerTransactions table.
 */
async function recordTransaction(
  ctx: ActionCtx,
  params: {
    lobbyId: string;
    userId: string;
    walletAddress: string;
    type: "deposit" | "payout" | "treasury_fee";
    currency: WagerCurrency;
    amount: number;
    amountAtomic: string;
    txSignature?: string;
    escrowPda: string;
    status: "pending" | "confirmed" | "failed";
  }
) {
  await ctx.runMutation(internalAny.wager.escrowMutations.recordTransaction, {
    lobbyId: params.lobbyId,
    userId: params.userId,
    walletAddress: params.walletAddress,
    type: params.type,
    currency: params.currency,
    amount: params.amount,
    amountAtomic: params.amountAtomic,
    txSignature: params.txSignature,
    escrowPda: params.escrowPda,
    status: params.status,
    createdAt: Date.now(),
  });
}

// ============================================================================
// ANCHOR INSTRUCTION BUILDERS
// ============================================================================

/**
 * Build the initialize_escrow instruction.
 *
 * Accounts: authority (signer, mut), escrow (PDA, init), system_program
 * Args: lobby_id_hash [u8;32], host Pubkey, opponent Pubkey,
 *       wager_lamports u64, token_mint Pubkey, treasury Pubkey
 */
async function buildInitializeEscrowIx(params: {
  escrowPda: PublicKey;
  authority: PublicKey;
  lobbyIdHash: Buffer;
  host: PublicKey;
  opponent: PublicKey;
  wagerLamports: bigint;
  tokenMint: PublicKey;
  treasury: PublicKey;
}): Promise<TransactionInstruction> {
  const disc = await anchorDiscriminator("initialize_escrow");

  // Data: disc(8) + lobby_id_hash(32) + host(32) + opponent(32)
  //       + wager_lamports(8) + token_mint(32) + treasury(32) = 176 bytes
  const data = Buffer.alloc(176);
  let offset = 0;
  disc.copy(data, offset);
  offset += 8;
  params.lobbyIdHash.copy(data, offset);
  offset += 32;
  params.host.toBuffer().copy(data, offset);
  offset += 32;
  params.opponent.toBuffer().copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(params.wagerLamports, offset);
  offset += 8;
  params.tokenMint.toBuffer().copy(data, offset);
  offset += 32;
  params.treasury.toBuffer().copy(data, offset);

  return new TransactionInstruction({
    keys: [
      { pubkey: params.authority, isSigner: true, isWritable: true },
      { pubkey: params.escrowPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: MATCH_ESCROW_PROGRAM_ID,
    data,
  });
}

/**
 * Build the deposit instruction.
 *
 * Accounts: depositor (signer, mut), escrow (PDA, mut),
 *   depositor_token_account (optional), escrow_token_account (optional),
 *   token_program (optional), system_program
 * Args: none (wager amount read from escrow state)
 */
async function buildDepositIx(params: {
  depositor: PublicKey;
  escrowPda: PublicKey;
  mint: string;
}): Promise<TransactionInstruction> {
  const disc = await anchorDiscriminator("deposit");
  const nativeSol = isNativeSolMint(params.mint);
  const mintPubkey = new PublicKey(params.mint);

  // For absent optional accounts, pass the program ID
  const absent = MATCH_ESCROW_PROGRAM_ID;

  const depositorTokenAccount = nativeSol
    ? absent
    : getAssociatedTokenAddressSync(params.depositor, mintPubkey);
  const escrowTokenAccount = nativeSol
    ? absent
    : getAssociatedTokenAddressSync(params.escrowPda, mintPubkey);
  const tokenProgram = nativeSol ? absent : TOKEN_PROGRAM_ID;

  return new TransactionInstruction({
    keys: [
      { pubkey: params.depositor, isSigner: true, isWritable: true },
      { pubkey: params.escrowPda, isSigner: false, isWritable: true },
      { pubkey: depositorTokenAccount, isSigner: false, isWritable: !nativeSol },
      { pubkey: escrowTokenAccount, isSigner: false, isWritable: !nativeSol },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: MATCH_ESCROW_PROGRAM_ID,
    data: disc,
  });
}

/**
 * Build the settle or forfeit instruction.
 *
 * Accounts: authority (signer, mut), escrow (PDA, mut, close),
 *   winner (mut), treasury (mut),
 *   winner_token_account (optional), treasury_token_account (optional),
 *   escrow_token_account (optional), token_program (optional), system_program
 *
 * Settle args: winner Pubkey
 * Forfeit args: forfeiter Pubkey
 */
async function buildSettleOrForfeitIx(params: {
  reason: "settle" | "forfeit";
  escrowPda: PublicKey;
  authority: PublicKey;
  winnerWallet: PublicKey;
  loserWallet: PublicKey;
  treasuryWallet: PublicKey;
  mint: string;
}): Promise<TransactionInstruction> {
  const isForfeit = params.reason === "forfeit";
  const disc = await anchorDiscriminator(params.reason);

  // Settle: arg = winner pubkey. Forfeit: arg = forfeiter pubkey.
  const argPubkey = isForfeit ? params.loserWallet : params.winnerWallet;
  const data = Buffer.alloc(40);
  disc.copy(data, 0);
  argPubkey.toBuffer().copy(data, 8);

  const nativeSol = isNativeSolMint(params.mint);
  const mintPubkey = new PublicKey(params.mint);
  const absent = MATCH_ESCROW_PROGRAM_ID;

  const winnerTokenAccount = nativeSol
    ? absent
    : getAssociatedTokenAddressSync(params.winnerWallet, mintPubkey);
  const treasuryTokenAccount = nativeSol
    ? absent
    : getAssociatedTokenAddressSync(params.treasuryWallet, mintPubkey);
  const escrowTokenAccount = nativeSol
    ? absent
    : getAssociatedTokenAddressSync(params.escrowPda, mintPubkey);
  const tokenProgram = nativeSol ? absent : TOKEN_PROGRAM_ID;

  return new TransactionInstruction({
    keys: [
      { pubkey: params.authority, isSigner: true, isWritable: true },
      { pubkey: params.escrowPda, isSigner: false, isWritable: true },
      { pubkey: params.winnerWallet, isSigner: false, isWritable: true },
      { pubkey: params.treasuryWallet, isSigner: false, isWritable: true },
      { pubkey: winnerTokenAccount, isSigner: false, isWritable: !nativeSol },
      { pubkey: treasuryTokenAccount, isSigner: false, isWritable: !nativeSol },
      { pubkey: escrowTokenAccount, isSigner: false, isWritable: !nativeSol },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: MATCH_ESCROW_PROGRAM_ID,
    data,
  });
}

/**
 * Build the confirm_deposit instruction (authority-only).
 *
 * Accounts: authority (signer), escrow (PDA, mut)
 * Args: depositor Pubkey
 */
async function buildConfirmDepositIx(params: {
  authority: PublicKey;
  escrowPda: PublicKey;
  depositor: PublicKey;
}): Promise<TransactionInstruction> {
  const disc = await anchorDiscriminator("confirm_deposit");
  const data = Buffer.alloc(40);
  disc.copy(data, 0);
  params.depositor.toBuffer().copy(data, 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: params.authority, isSigner: true, isWritable: false },
      { pubkey: params.escrowPda, isSigner: false, isWritable: true },
    ],
    programId: MATCH_ESCROW_PROGRAM_ID,
    data,
  });
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Initialize the onchain escrow account for a crypto wager lobby.
 *
 * Called when an opponent joins a crypto wager lobby (both players known).
 * Derives the escrow PDA, builds the initialize_escrow instruction, and
 * optionally confirms the opponent's x402 deposit in the same transaction.
 *
 * After initialization, schedules collectHostDeposit for agent hosts.
 *
 * @param lobbyId - The game lobby to initialize escrow for
 */
export const initializeEscrow = internalAction({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // 1. Query lobby to get crypto wager fields
    const lobby = await ctx.runQuery(internalAny.gameplay.games.queries.getLobbyInternal, {
      lobbyId: args.lobbyId,
    });

    if (!lobby) {
      throw new Error(`Lobby not found: ${args.lobbyId}`);
    }

    if (!lobby.cryptoWagerCurrency || !lobby.cryptoWagerTier) {
      throw new Error(
        `Lobby ${args.lobbyId} is not a crypto wager lobby — missing currency or tier`
      );
    }

    if (lobby.cryptoEscrowPda) {
      console.log(`Escrow already initialized for lobby ${args.lobbyId}: ${lobby.cryptoEscrowPda}`);
      // Still schedule host deposit in case it hasn't happened
      await ctx.scheduler.runAfter(0, internalAny.wager.escrow.collectHostDeposit, {
        lobbyId: args.lobbyId,
      });
      return {
        success: true,
        escrowPda: lobby.cryptoEscrowPda,
        alreadyInitialized: true,
      };
    }

    // 2. Validate both wallets are known
    const hostWallet = lobby.cryptoHostWallet;
    const opponentWallet = lobby.cryptoOpponentWallet;

    if (!hostWallet) {
      throw new Error(`Host wallet not set for lobby ${args.lobbyId}`);
    }
    if (!opponentWallet) {
      throw new Error(
        `Opponent wallet not set for lobby ${args.lobbyId}. initializeEscrow should be called after the opponent joins.`
      );
    }

    // 3. Derive escrow PDA from lobby ID
    const { pda, lobbyIdHash } = await deriveEscrowPda(args.lobbyId);
    const escrowPdaAddress = pda.toBase58();

    // 4. Get treasury authority for signing
    const treasury = await getTreasuryAuthority(ctx);
    const connection = getConnection();

    const currency = lobby.cryptoWagerCurrency as WagerCurrency;
    const wagerTier = lobby.cryptoWagerTier;
    const wagerAtomicUnits = toAtomicUnits(wagerTier, currency);
    const mint = getMintForCurrency(currency);

    // 5. Build transaction
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const authorityPubkey = new PublicKey(treasury.address);

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authorityPubkey;

    // 5a. initialize_escrow instruction
    const initIx = await buildInitializeEscrowIx({
      escrowPda: pda,
      authority: authorityPubkey,
      lobbyIdHash,
      host: new PublicKey(hostWallet),
      opponent: new PublicKey(opponentWallet),
      wagerLamports: wagerAtomicUnits,
      tokenMint: new PublicKey(mint),
      treasury: authorityPubkey,
    });
    transaction.add(initIx);

    // 5b. If opponent already deposited via x402, forward their wager from
    //     treasury to PDA (x402 paid to treasury, not PDA) and confirm the
    //     deposit flag onchain — all in the same atomic transaction.
    if (lobby.cryptoOpponentDeposited) {
      const mintStr = getMintForCurrency(currency);
      if (isNativeSolMint(mintStr)) {
        // SOL: system transfer from treasury to escrow PDA
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: authorityPubkey,
            toPubkey: pda,
            lamports: Number(wagerAtomicUnits),
          })
        );
      } else {
        // SPL: transfer from treasury ATA to escrow PDA ATA
        const mintPubkey = new PublicKey(mintStr);
        const treasuryAta = getAssociatedTokenAddressSync(authorityPubkey, mintPubkey);
        const escrowAta = getAssociatedTokenAddressSync(pda, mintPubkey);

        // Create escrow ATA idempotently (instruction index 1)
        transaction.add(
          new TransactionInstruction({
            programId: ASSOCIATED_TOKEN_PROGRAM_ID,
            keys: [
              { pubkey: authorityPubkey, isSigner: true, isWritable: true },
              { pubkey: escrowAta, isSigner: false, isWritable: true },
              { pubkey: pda, isSigner: false, isWritable: false },
              { pubkey: mintPubkey, isSigner: false, isWritable: false },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
              { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            data: Buffer.from([1]), // CreateIdempotent
          })
        );

        // SPL Token Transfer (instruction index 3): treasury ATA → escrow ATA
        const amountBuf = Buffer.alloc(9);
        amountBuf[0] = 3; // Transfer instruction index
        amountBuf.writeBigUInt64LE(wagerAtomicUnits, 1);
        transaction.add(
          new TransactionInstruction({
            programId: TOKEN_PROGRAM_ID,
            keys: [
              { pubkey: treasuryAta, isSigner: false, isWritable: true },
              { pubkey: escrowAta, isSigner: false, isWritable: true },
              { pubkey: authorityPubkey, isSigner: true, isWritable: false },
            ],
            data: amountBuf,
          })
        );
      }

      // Confirm the opponent's deposit flag onchain
      const confirmIx = await buildConfirmDepositIx({
        authority: authorityPubkey,
        escrowPda: pda,
        depositor: new PublicKey(opponentWallet),
      });
      transaction.add(confirmIx);
    }

    // 6. Sign and send via Privy server wallet
    console.log(`Initializing escrow PDA ${escrowPdaAddress} for lobby ${args.lobbyId}`);
    const txSignature = await signAndSendWithPrivy(transaction, treasury.privyWalletId);
    console.log(`Escrow initialized: ${txSignature}`);

    // 7. Update lobby with escrow PDA
    await ctx.runMutation(internalAny.wager.escrowMutations.updateLobbyEscrowPda, {
      lobbyId: args.lobbyId,
      cryptoEscrowPda: escrowPdaAddress,
    });

    // 8. Schedule host deposit collection
    await ctx.scheduler.runAfter(0, internalAny.wager.escrow.collectHostDeposit, {
      lobbyId: args.lobbyId,
    });

    return {
      success: true,
      escrowPda: escrowPdaAddress,
      txSignature,
      alreadyInitialized: false,
    };
  },
});

/**
 * Collect deposit from the host into the escrow.
 *
 * For agent hosts: signs and submits the Anchor deposit instruction using the
 * agent's Privy server wallet. For human hosts: this should NOT be called
 * (humans deposit via frontend with their own wallet).
 *
 * After host deposit, if opponent already deposited, starts the game.
 *
 * @param lobbyId - The game lobby to deposit for
 */
export const collectHostDeposit = internalAction({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // 1. Query lobby to get host wallet, wager tier, currency
    const lobby = await ctx.runQuery(internalAny.gameplay.games.queries.getLobbyInternal, {
      lobbyId: args.lobbyId,
    });

    if (!lobby) {
      throw new Error(`Lobby not found: ${args.lobbyId}`);
    }

    if (lobby.cryptoHostDeposited) {
      console.log(`Host already deposited for lobby ${args.lobbyId}`);
      return { success: true, alreadyDeposited: true };
    }

    if (!lobby.cryptoEscrowPda) {
      throw new Error(
        `Escrow not initialized for lobby ${args.lobbyId}. Call initializeEscrow first.`
      );
    }

    const currency = lobby.cryptoWagerCurrency as WagerCurrency;
    const wagerTier = lobby.cryptoWagerTier as number;
    const escrowPda = lobby.cryptoEscrowPda;
    const hostWallet = lobby.cryptoHostWallet;

    if (!currency || !wagerTier || !hostWallet) {
      throw new Error(
        `Lobby ${args.lobbyId} missing crypto wager fields (currency, tier, or host wallet)`
      );
    }

    // 2. Check if host is an agent (agents use server wallet signing)
    const hostAgent = await ctx.runQuery(internalAny.agents.agents.getAgentByUserId, {
      userId: lobby.hostId,
    });

    if (!hostAgent?.privyUserId) {
      // Human host — they deposit via frontend, not via this action
      console.log(
        `Host for lobby ${args.lobbyId} is human. Skipping server-side deposit.`
      );
      return {
        success: false,
        error: "Human host — deposit via frontend wallet required",
        alreadyDeposited: false,
      };
    }

    // 3. Build deposit transaction
    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const wagerAtomicUnits = toAtomicUnits(wagerTier, currency);
    const mint = getMintForCurrency(currency);
    const escrowPdaPubkey = new PublicKey(escrowPda);
    const hostPubkey = new PublicKey(hostWallet);

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = hostPubkey;

    const depositIx = await buildDepositIx({
      depositor: hostPubkey,
      escrowPda: escrowPdaPubkey,
      mint,
    });
    transaction.add(depositIx);

    // 4. Sign and send via Privy (agent's server wallet)
    console.log(`Collecting host deposit for lobby ${args.lobbyId}: ${wagerTier} ${currency}`);
    const txSignature = await signAndSendWithPrivy(transaction, hostAgent.privyUserId);
    console.log(`Host deposit tx: ${txSignature}`);

    // 5. Update lobby: host deposited
    await ctx.runMutation(internalAny.wager.escrowMutations.updateLobbyHostDeposited, {
      lobbyId: args.lobbyId,
    });

    // 6. Record deposit transaction
    await recordTransaction(ctx, {
      lobbyId: args.lobbyId,
      userId: lobby.hostId,
      walletAddress: hostWallet,
      type: "deposit",
      currency,
      amount: wagerTier,
      amountAtomic: wagerAtomicUnits.toString(),
      txSignature,
      escrowPda,
      status: "confirmed",
    });

    // 7. If opponent already deposited, start the game now
    if (lobby.cryptoOpponentDeposited && lobby.opponentId) {
      try {
        await ctx.runMutation(internalAny.gameplay.games.lobby.joinLobbyInternal, {
          userId: lobby.opponentId,
          lobbyId: args.lobbyId,
        });
        console.log(`Both deposits confirmed — game started for lobby ${args.lobbyId}`);
      } catch (error) {
        // Game may already be started or lobby state changed — log but don't fail
        console.warn(
          `Could not auto-start game after host deposit for lobby ${args.lobbyId}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return {
      success: true,
      txSignature,
      alreadyDeposited: false,
    };
  },
});

/**
 * Confirm the opponent's x402 deposit onchain.
 *
 * Called after x402 payment verification when the escrow PDA already exists.
 * Uses the confirm_deposit instruction (authority-only) to set the
 * opponent_deposited flag onchain without moving funds again.
 *
 * If the escrow PDA doesn't exist yet, this is a no-op — initializeEscrow
 * will handle the confirmation when it runs.
 *
 * @param lobbyId - The game lobby
 * @param depositorWallet - The wallet address to confirm
 */
export const confirmOpponentDeposit = internalAction({
  args: {
    lobbyId: v.id("gameLobbies"),
    depositorWallet: v.string(),
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.runQuery(internalAny.gameplay.games.queries.getLobbyInternal, {
      lobbyId: args.lobbyId,
    });

    if (!lobby?.cryptoEscrowPda) {
      // Escrow not initialized yet — initializeEscrow will confirm when it runs
      console.log(
        `Escrow not yet initialized for lobby ${args.lobbyId}. confirm_deposit will be handled by initializeEscrow.`
      );
      return { success: true, deferred: true };
    }

    const treasury = await getTreasuryAuthority(ctx);
    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const authorityPubkey = new PublicKey(treasury.address);
    const escrowPdaPubkey = new PublicKey(lobby.cryptoEscrowPda);
    const depositorPubkey = new PublicKey(args.depositorWallet);

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authorityPubkey;

    const confirmIx = await buildConfirmDepositIx({
      authority: authorityPubkey,
      escrowPda: escrowPdaPubkey,
      depositor: depositorPubkey,
    });
    transaction.add(confirmIx);

    const txSignature = await signAndSendWithPrivy(transaction, treasury.privyWalletId);
    console.log(`Confirmed opponent deposit onchain for lobby ${args.lobbyId}: ${txSignature}`);

    return { success: true, txSignature, deferred: false };
  },
});

/**
 * Settle the escrow after a game completes.
 *
 * Distributes the pot:
 *   - 90% to the winner
 *   - 10% to the treasury
 *
 * NO draws — every settle has exactly one winner.
 *
 * If settlement fails, it will be retried by a separate cron job.
 * The lobby is marked with `cryptoSettled: true` and `cryptoSettleTxSig`
 * only on successful onchain confirmation.
 *
 * @param lobbyId - The game lobby to settle
 * @param winnerId - The winning player's user ID
 * @param loserId - The losing player's user ID
 */
export const settleEscrow = internalAction({
  args: {
    lobbyId: v.id("gameLobbies"),
    winnerId: v.id("users"),
    loserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await _settleOrForfeit(ctx, args, "settle");
  },
});

/**
 * Forfeit escrow settlement — triggered when a player forfeits or disconnects.
 *
 * Uses the same settlement math as settleEscrow (90% winner, 10% treasury)
 * but records the trigger reason as "forfeit" for audit purposes.
 *
 * @param lobbyId - The game lobby to forfeit-settle
 * @param winnerId - The non-forfeiting player's user ID
 * @param loserId - The forfeiting/disconnected player's user ID
 */
export const forfeitEscrow = internalAction({
  args: {
    lobbyId: v.id("gameLobbies"),
    winnerId: v.id("users"),
    loserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await _settleOrForfeit(ctx, args, "forfeit");
  },
});

// ============================================================================
// SHARED SETTLEMENT LOGIC
// ============================================================================

/**
 * Internal settlement logic shared by settleEscrow and forfeitEscrow.
 *
 * Both paths use the same distribution: 90% winner, 10% treasury.
 * The Anchor instruction differs:
 *   - settle(winner) — for normal game completion
 *   - forfeit(forfeiter) — for DC/surrender (determines winner onchain)
 *
 * @param ctx - Convex action context
 * @param args - Lobby ID, winner ID, loser ID
 * @param reason - "settle" for normal game end, "forfeit" for DC/forfeit
 */
async function _settleOrForfeit(
  ctx: ActionCtx,
  args: {
    lobbyId: string;
    winnerId: string;
    loserId: string;
  },
  reason: "settle" | "forfeit"
) {
  // 1. Query lobby
  const lobby = await ctx.runQuery(internalAny.gameplay.games.queries.getLobbyInternal, {
    lobbyId: args.lobbyId,
  });

  if (!lobby) {
    throw new Error(`Lobby not found: ${args.lobbyId}`);
  }

  if (lobby.cryptoSettled) {
    console.log(`Escrow already settled for lobby ${args.lobbyId}`);
    return {
      success: true,
      alreadySettled: true,
      txSignature: lobby.cryptoSettleTxSig,
    };
  }

  if (!lobby.cryptoEscrowPda) {
    throw new Error(`Escrow not initialized for lobby ${args.lobbyId}. Cannot settle.`);
  }

  const currency = lobby.cryptoWagerCurrency as WagerCurrency;
  const wagerTier = lobby.cryptoWagerTier as number;
  const escrowPda = lobby.cryptoEscrowPda;

  if (!currency || !wagerTier) {
    throw new Error(`Lobby ${args.lobbyId} missing crypto wager fields`);
  }

  // 2. Calculate settlement amounts
  const totalPot = wagerTier * 2;
  const winnerPayout = totalPot * CRYPTO_WAGER_WINNER_PERCENTAGE; // 90%
  const treasuryFee = totalPot - winnerPayout; // 10%

  const winnerPayoutAtomic = toAtomicUnits(winnerPayout, currency);
  const treasuryFeeAtomic = toAtomicUnits(treasuryFee, currency);
  const mint = getMintForCurrency(currency);

  // 3. Get winner's and loser's wallet addresses
  const winnerWallet =
    args.winnerId === lobby.hostId ? lobby.cryptoHostWallet : lobby.cryptoOpponentWallet;
  const loserWallet =
    args.loserId === lobby.hostId ? lobby.cryptoHostWallet : lobby.cryptoOpponentWallet;

  if (!winnerWallet) {
    throw new Error(`Winner wallet not found for user ${args.winnerId} in lobby ${args.lobbyId}`);
  }
  if (!loserWallet) {
    throw new Error(`Loser wallet not found for user ${args.loserId} in lobby ${args.lobbyId}`);
  }

  // 4. Get treasury authority for signing
  const treasury = await getTreasuryAuthority(ctx);
  const connection = getConnection();

  // 5. Build settlement transaction
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const authorityPubkey = new PublicKey(treasury.address);
  const escrowPdaPubkey = new PublicKey(escrowPda);

  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authorityPubkey;

  const settleIx = await buildSettleOrForfeitIx({
    reason,
    escrowPda: escrowPdaPubkey,
    authority: authorityPubkey,
    winnerWallet: new PublicKey(winnerWallet),
    loserWallet: new PublicKey(loserWallet),
    treasuryWallet: authorityPubkey,
    mint,
  });
  transaction.add(settleIx);

  // 6. Sign and send via Privy with retries
  let txSignature: string | undefined;
  let retries = 0;

  while (retries < MAX_SETTLE_RETRIES) {
    try {
      txSignature = await signAndSendWithPrivy(transaction, treasury.privyWalletId);
      console.log(`Escrow ${reason} tx: ${txSignature}`);
      break;
    } catch (error) {
      retries++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`Settlement attempt ${retries}/${MAX_SETTLE_RETRIES} failed: ${errorMsg}`);

      if (retries >= MAX_SETTLE_RETRIES) {
        console.error(
          `All ${MAX_SETTLE_RETRIES} settlement attempts failed for lobby ${args.lobbyId}. Cron job will retry.`
        );
        return {
          success: false,
          error: `Settlement failed after ${MAX_SETTLE_RETRIES} attempts: ${errorMsg}`,
          retriesExhausted: true,
        };
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (retries - 1)));
    }
  }

  // 7. Update lobby: settled
  await ctx.runMutation(internalAny.wager.escrowMutations.updateLobbySettled, {
    lobbyId: args.lobbyId,
    cryptoSettleTxSig: txSignature,
  });

  // 8. Record payout transaction (winner receives 90%)
  await recordTransaction(ctx, {
    lobbyId: args.lobbyId,
    userId: args.winnerId,
    walletAddress: winnerWallet,
    type: "payout",
    currency,
    amount: winnerPayout,
    amountAtomic: winnerPayoutAtomic.toString(),
    txSignature,
    escrowPda,
    status: txSignature ? "confirmed" : "pending",
  });

  // 9. Record treasury fee transaction (treasury receives 10%)
  await recordTransaction(ctx, {
    lobbyId: args.lobbyId,
    userId: args.loserId,
    walletAddress: treasury.address,
    type: "treasury_fee",
    currency,
    amount: treasuryFee,
    amountAtomic: treasuryFeeAtomic.toString(),
    txSignature,
    escrowPda,
    status: txSignature ? "confirmed" : "pending",
  });

  console.log(
    `Escrow ${reason} complete for lobby ${args.lobbyId}: ` +
      `winner=${winnerWallet.slice(0, 8)}... gets ${winnerPayout} ${currency}, ` +
      `treasury gets ${treasuryFee} ${currency}`
  );

  return {
    success: true,
    txSignature,
    winnerPayout,
    treasuryFee,
    reason,
    alreadySettled: false,
  };
}
