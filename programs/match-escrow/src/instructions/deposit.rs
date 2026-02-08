use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token;
use anchor_spl::token::{TokenAccount, Transfer as SplTransfer};
use crate::constants::ESCROW_SEED;
use crate::error::EscrowError;
use crate::state::MatchEscrow;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.lobby_id_hash.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, MatchEscrow>,

    /// Depositor's token account (only needed for SPL deposits).
    /// CHECK: Validated in handler; optional for native SOL path.
    #[account(mut)]
    pub depositor_token_account: Option<Account<'info, TokenAccount>>,

    /// Escrow's token account (ATA owned by PDA, only needed for SPL deposits).
    /// CHECK: Validated in handler; optional for native SOL path.
    #[account(mut)]
    pub escrow_token_account: Option<Account<'info, TokenAccount>>,

    /// CHECK: Token program, validated by address constraint. Only needed for SPL deposits.
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Option<UncheckedAccount<'info>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>) -> Result<()> {
    // ---------------------------------------------------------------
    // Extract all needed values BEFORE any CPI calls.
    // This avoids E0502: cannot borrow `ctx.accounts.escrow` as mutable
    // because it is also borrowed as immutable.
    // ---------------------------------------------------------------
    let depositor_key = ctx.accounts.depositor.key();
    let host = ctx.accounts.escrow.host;
    let opponent = ctx.accounts.escrow.opponent;
    let host_deposited = ctx.accounts.escrow.host_deposited;
    let opponent_deposited = ctx.accounts.escrow.opponent_deposited;
    let settled = ctx.accounts.escrow.settled;
    let amount = ctx.accounts.escrow.wager_lamports;
    let is_native = ctx.accounts.escrow.is_native_sol();

    // Determine role
    let is_host = depositor_key == host;
    let is_opponent = depositor_key == opponent;

    require!(is_host || is_opponent, EscrowError::NotAuthorized);
    require!(!settled, EscrowError::AlreadySettled);

    if is_host {
        require!(!host_deposited, EscrowError::AlreadyDeposited);
    } else {
        require!(!opponent_deposited, EscrowError::AlreadyDeposited);
    }

    // ---------------------------------------------------------------
    // Transfer funds into the escrow
    // ---------------------------------------------------------------
    if is_native {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, amount)?;
    } else {
        let depositor_ta = ctx
            .accounts
            .depositor_token_account
            .as_ref()
            .ok_or(EscrowError::MissingSplAccount)?;
        let escrow_ta = ctx
            .accounts
            .escrow_token_account
            .as_ref()
            .ok_or(EscrowError::MissingSplAccount)?;
        let token_prog = ctx
            .accounts
            .token_program
            .as_ref()
            .ok_or(EscrowError::MissingSplAccount)?;

        let cpi_ctx = CpiContext::new(
            token_prog.to_account_info(),
            SplTransfer {
                from: depositor_ta.to_account_info(),
                to: escrow_ta.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;
    }

    // ---------------------------------------------------------------
    // Mark deposit flag (mutable borrow begins here, after all CPI)
    // ---------------------------------------------------------------
    let escrow = &mut ctx.accounts.escrow;
    if is_host {
        escrow.host_deposited = true;
    } else {
        escrow.opponent_deposited = true;
    }

    Ok(())
}
