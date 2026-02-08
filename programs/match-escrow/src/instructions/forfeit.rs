use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{TokenAccount, Transfer as SplTransfer};
use crate::constants::{ESCROW_SEED, FEE_BPS};
use crate::error::EscrowError;
use crate::state::MatchEscrow;

#[derive(Accounts)]
pub struct Forfeit<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.lobby_id_hash.as_ref()],
        bump = escrow.bump,
        has_one = authority @ EscrowError::NotAuthorized,
        close = authority,
    )]
    pub escrow: Account<'info, MatchEscrow>,

    /// CHECK: Validated as the non-forfeiting player (winner) in handler.
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,

    /// CHECK: Validated against escrow.treasury in handler.
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    /// Winner's token account (only needed for SPL settlements).
    #[account(mut)]
    pub winner_token_account: Option<Account<'info, TokenAccount>>,

    /// Treasury's token account (only needed for SPL settlements).
    #[account(mut)]
    pub treasury_token_account: Option<Account<'info, TokenAccount>>,

    /// Escrow's token account (only needed for SPL settlements).
    #[account(mut)]
    pub escrow_token_account: Option<Account<'info, TokenAccount>>,

    /// CHECK: Token program, validated by address constraint. Only needed for SPL settlements.
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Option<UncheckedAccount<'info>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Forfeit>, forfeiter: Pubkey) -> Result<()> {
    // ---------------------------------------------------------------
    // Extract all values from escrow before any transfers.
    // Avoids E0502 when we need &mut ctx.accounts.escrow later.
    // ---------------------------------------------------------------
    let host = ctx.accounts.escrow.host;
    let opponent = ctx.accounts.escrow.opponent;
    let host_deposited = ctx.accounts.escrow.host_deposited;
    let opponent_deposited = ctx.accounts.escrow.opponent_deposited;
    let settled = ctx.accounts.escrow.settled;
    let wager_lamports = ctx.accounts.escrow.wager_lamports;
    let is_native = ctx.accounts.escrow.is_native_sol();
    let treasury_key = ctx.accounts.escrow.treasury;
    let lobby_id_hash = ctx.accounts.escrow.lobby_id_hash;
    let bump = ctx.accounts.escrow.bump;

    // ---------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------
    require!(
        forfeiter == host || forfeiter == opponent,
        EscrowError::InvalidForfeiter
    );
    require!(!settled, EscrowError::AlreadySettled);
    require!(
        host_deposited && opponent_deposited,
        EscrowError::EscrowNotFunded
    );

    // The winner is the other player
    let winner = if forfeiter == host { opponent } else { host };

    require!(
        ctx.accounts.winner.key() == winner,
        EscrowError::InvalidWinner
    );
    require!(
        ctx.accounts.treasury.key() == treasury_key,
        EscrowError::NotAuthorized
    );

    // ---------------------------------------------------------------
    // Calculate distribution: 90% to winner, 10% treasury fee
    // ---------------------------------------------------------------
    let total_pot = wager_lamports
        .checked_mul(2)
        .ok_or(EscrowError::InsufficientFunds)?;
    let fee = (total_pot as u128)
        .checked_mul(FEE_BPS as u128)
        .ok_or(EscrowError::InsufficientFunds)?
        .checked_div(10_000)
        .ok_or(EscrowError::InsufficientFunds)? as u64;
    let payout = total_pot
        .checked_sub(fee)
        .ok_or(EscrowError::InsufficientFunds)?;

    // PDA signer seeds for CPI
    let signer_seeds: &[&[&[u8]]] = &[&[ESCROW_SEED, lobby_id_hash.as_ref(), &[bump]]];

    // ---------------------------------------------------------------
    // Transfer funds (identical distribution logic to settle)
    // ---------------------------------------------------------------
    if is_native {
        let escrow_info = ctx.accounts.escrow.to_account_info();
        let winner_info = ctx.accounts.winner.to_account_info();
        let treasury_info = ctx.accounts.treasury.to_account_info();

        require!(
            escrow_info.lamports() >= total_pot,
            EscrowError::InsufficientFunds
        );

        **escrow_info.try_borrow_mut_lamports()? -= payout;
        **winner_info.try_borrow_mut_lamports()? += payout;

        **escrow_info.try_borrow_mut_lamports()? -= fee;
        **treasury_info.try_borrow_mut_lamports()? += fee;
    } else {
        let escrow_ta = ctx
            .accounts
            .escrow_token_account
            .as_ref()
            .ok_or(EscrowError::MissingSplAccount)?;
        let winner_ta = ctx
            .accounts
            .winner_token_account
            .as_ref()
            .ok_or(EscrowError::MissingSplAccount)?;
        let treasury_ta = ctx
            .accounts
            .treasury_token_account
            .as_ref()
            .ok_or(EscrowError::MissingSplAccount)?;
        let token_prog = ctx
            .accounts
            .token_program
            .as_ref()
            .ok_or(EscrowError::MissingSplAccount)?;

        require!(
            escrow_ta.amount >= total_pot,
            EscrowError::InsufficientFunds
        );

        // Payout to winner
        token::transfer(
            CpiContext::new_with_signer(
                token_prog.to_account_info(),
                SplTransfer {
                    from: escrow_ta.to_account_info(),
                    to: winner_ta.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            ),
            payout,
        )?;

        // Fee to treasury
        token::transfer(
            CpiContext::new_with_signer(
                token_prog.to_account_info(),
                SplTransfer {
                    from: escrow_ta.to_account_info(),
                    to: treasury_ta.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            ),
            fee,
        )?;
    }

    // ---------------------------------------------------------------
    // Mark settled (mutable borrow after all CPI).
    // The `close = authority` constraint reclaims rent after handler.
    // ---------------------------------------------------------------
    let escrow = &mut ctx.accounts.escrow;
    escrow.settled = true;

    Ok(())
}
