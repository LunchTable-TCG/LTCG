use anchor_lang::prelude::*;
use crate::constants::ESCROW_SEED;
use crate::state::MatchEscrow;

#[derive(Accounts)]
#[instruction(lobby_id_hash: [u8; 32])]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + MatchEscrow::INIT_SPACE,
        seeds = [ESCROW_SEED, lobby_id_hash.as_ref()],
        bump,
    )]
    pub escrow: Account<'info, MatchEscrow>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeEscrow>,
    lobby_id_hash: [u8; 32],
    host: Pubkey,
    opponent: Pubkey,
    wager_lamports: u64,
    token_mint: Pubkey,
    treasury: Pubkey,
) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.lobby_id_hash = lobby_id_hash;
    escrow.host = host;
    escrow.opponent = opponent;
    escrow.wager_lamports = wager_lamports;
    escrow.token_mint = token_mint;
    escrow.treasury = treasury;
    escrow.authority = ctx.accounts.authority.key();
    escrow.host_deposited = false;
    escrow.opponent_deposited = false;
    escrow.settled = false;
    escrow.bump = ctx.bumps.escrow;

    Ok(())
}
