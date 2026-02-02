/**
 * Solana RPC Connection Utilities
 *
 * Provides connection management for Solana blockchain interactions.
 * Used by Convex actions to query Solana RPC endpoints.
 */

import { type Commitment, Connection } from "@solana/web3.js";
import { SOLANA } from "../constants";

/**
 * Connection cache to avoid creating new connections for every call
 * Key format: `${network}-${commitment}`
 */
const connectionCache = new Map<string, Connection>();

/**
 * Supported Solana networks
 */
export type SolanaNetwork = "mainnet-beta" | "devnet";

/**
 * RPC URLs for different networks
 */
const NETWORK_RPC_URLS: Record<SolanaNetwork, string> = {
  "mainnet-beta": SOLANA.RPC_URL,
  devnet: "https://api.devnet.solana.com",
};

/**
 * Get a Solana RPC connection
 *
 * Creates or retrieves a cached Connection instance for the specified network.
 * Uses configuration from SOLANA constants by default.
 *
 * @param network - Target network (defaults to SOLANA.NETWORK from env)
 * @param commitment - Commitment level (defaults to SOLANA.COMMITMENT)
 * @returns Connection instance
 *
 * @example
 * ```typescript
 * // Use default config from env
 * const conn = getConnection();
 *
 * // Force devnet for testing
 * const devConn = getConnection("devnet");
 *
 * // Custom commitment level
 * const finalizedConn = getConnection("mainnet-beta", "finalized");
 * ```
 */
export function getConnection(
  network: SolanaNetwork = SOLANA.NETWORK,
  commitment: Commitment = SOLANA.COMMITMENT
) {
  const cacheKey = `${network}-${commitment}`;

  // Return cached connection if available
  const cached = connectionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Determine RPC URL based on network
  // If mainnet and we have a custom RPC_URL (e.g., Helius), use it
  const rpcUrl =
    network === "mainnet-beta" && SOLANA.RPC_URL !== "https://api.mainnet-beta.solana.com"
      ? SOLANA.RPC_URL
      : NETWORK_RPC_URLS[network];

  // Create new connection with specified commitment
  const connection = new Connection(rpcUrl, {
    commitment,
    confirmTransactionInitialTimeout: 60000, // 60 seconds
  });

  // Cache the connection
  connectionCache.set(cacheKey, connection);

  return connection;
}

/**
 * Clear the connection cache
 *
 * Useful for testing or when RPC configuration changes.
 */
export function clearConnectionCache() {
  connectionCache.clear();
}

/**
 * Get the current RPC URL being used
 *
 * Useful for debugging and logging.
 *
 * @param network - Target network
 * @returns The RPC URL for the network
 */
export function getRpcUrl(network: SolanaNetwork = SOLANA.NETWORK) {
  if (network === "mainnet-beta" && SOLANA.RPC_URL !== "https://api.mainnet-beta.solana.com") {
    return SOLANA.RPC_URL;
  }
  return NETWORK_RPC_URLS[network];
}
