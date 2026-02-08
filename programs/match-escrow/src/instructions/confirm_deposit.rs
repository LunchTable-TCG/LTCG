use anchor_lang::prelude::*;
use crate::constants::ESCROW_SEED;
use crate::error::EscrowError;
use crate::state::MatchEscrow;

/// Authority-only instruction to mark a player's deposit as confirmed
/// without moving funds onchain.
///
/// Used after x402 payment verification: the joiner pays via the x402
/// protocol (verified offchain by the facilitator), then the server calls
/// this instruction to update the onchain deposit flag.
#[derive(Accounts)]
pub struct ConfirmDeposit<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.lobby_id_hash.as_ref()],
        bump = escrow.bump,
        has_one = authority @ EscrowError::NotAuthorized,
    )]
    pub escrow: Account<'info, MatchEscrow>,
}

pub fn handler(ctx: Context<ConfirmDeposit>, depositor: Pubkey) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    let is_host = depositor == escrow.host;
    let is_opponent = depositor == escrow.opponent;

    require!(is_host || is_opponent, EscrowError::NotAuthorized);
    require!(!escrow.settled, EscrowError::AlreadySettled);

    if is_host {
        require!(!escrow.host_deposited, EscrowError::AlreadyDeposited);
        escrow.host_deposited = true;
    } else {
        require!(!escrow.opponent_deposited, EscrowError::AlreadyDeposited);
        escrow.opponent_deposited = true;
    }

    Ok(())
}
