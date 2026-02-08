use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("3483xDBJewW1qERNjMrQuvgoFj2utKgZGFWrKBgCiHKS");

#[program]
pub mod match_escrow {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        lobby_id_hash: [u8; 32],
        host: Pubkey,
        opponent: Pubkey,
        wager_lamports: u64,
        token_mint: Pubkey,
        treasury: Pubkey,
    ) -> Result<()> {
        instructions::initialize::handler(
            ctx,
            lobby_id_hash,
            host,
            opponent,
            wager_lamports,
            token_mint,
            treasury,
        )
    }

    pub fn deposit(ctx: Context<Deposit>) -> Result<()> {
        instructions::deposit::handler(ctx)
    }

    pub fn settle(ctx: Context<Settle>, winner: Pubkey) -> Result<()> {
        instructions::settle::handler(ctx, winner)
    }

    pub fn forfeit(ctx: Context<Forfeit>, forfeiter: Pubkey) -> Result<()> {
        instructions::forfeit::handler(ctx, forfeiter)
    }

    pub fn confirm_deposit(ctx: Context<ConfirmDeposit>, depositor: Pubkey) -> Result<()> {
        instructions::confirm_deposit::handler(ctx, depositor)
    }
}
