use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Player has already deposited")]
    AlreadyDeposited,
    #[msg("Caller is not the authority")]
    NotAuthorized,
    #[msg("Both players haven't deposited yet")]
    EscrowNotFunded,
    #[msg("Escrow already settled")]
    AlreadySettled,
    #[msg("Winner is neither host nor opponent")]
    InvalidWinner,
    #[msg("Forfeiter is neither host nor opponent")]
    InvalidForfeiter,
    #[msg("Escrow doesn't have enough funds")]
    InsufficientFunds,
    #[msg("Required SPL account is missing")]
    MissingSplAccount,
}
