use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MatchEscrow {
    /// SHA-256 hash of the Convex lobby ID string
    pub lobby_id_hash: [u8; 32],
    /// Host player wallet
    pub host: Pubkey,
    /// Opponent player wallet
    pub opponent: Pubkey,
    /// Per-player wager in atomic units (lamports or token base units)
    pub wager_lamports: u64,
    /// Token mint: Pubkey::default() = native SOL, otherwise SPL mint (e.g. USDC)
    pub token_mint: Pubkey,
    /// Platform treasury wallet for fee collection
    pub treasury: Pubkey,
    /// Server-controlled signer (only authority can settle/forfeit)
    pub authority: Pubkey,
    /// Whether the host has deposited their wager
    pub host_deposited: bool,
    /// Whether the opponent has deposited their wager
    pub opponent_deposited: bool,
    /// Whether the escrow has been settled
    pub settled: bool,
    /// PDA bump seed
    pub bump: u8,
}

impl MatchEscrow {
    /// Returns true if this escrow uses native SOL (not an SPL token).
    pub fn is_native_sol(&self) -> bool {
        self.token_mint == Pubkey::default()
    }
}
