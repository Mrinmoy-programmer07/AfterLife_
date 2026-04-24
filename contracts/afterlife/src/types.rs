use soroban_sdk::{contracttype, Address, String};

/// Vesting schedule type
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum VestingType {
    /// Proportional unlock over duration
    Linear,
    /// Full unlock after duration passes
    Cliff,
}

/// Per-owner protocol state
#[contracttype]
#[derive(Clone, Debug)]
pub struct Protocol {
    pub is_registered: bool,
    /// Ledger sequence of the last heartbeat
    pub last_heartbeat_ledger: u32,
    /// Number of ledgers of inactivity before guardian can trigger
    pub inactivity_threshold_ledgers: u32,
    pub is_dead: bool,
    /// Vault balance at the time of death declaration (for vesting math)
    pub initial_vault_balance: i128,
    /// Ledger when vesting started (same as death declaration ledger)
    pub vesting_start_ledger: u32,
    /// Sum of all beneficiary allocations in basis points (max 10000)
    pub total_allocation_bps: u32,
    /// Ledger when inactivity was confirmed (for grace period)
    pub death_declaration_ledger: u32,
}

/// A trusted guardian address
#[contracttype]
#[derive(Clone, Debug)]
pub struct Guardian {
    pub name: String,
    pub wallet: Address,
    /// Fixed guardians cannot be removed without owner explicitly unfixing them
    pub is_fixed: bool,
}

/// A beneficiary with allocation and vesting settings
#[contracttype]
#[derive(Clone, Debug)]
pub struct Beneficiary {
    pub name: String,
    pub wallet: Address,
    /// Basis points: 5000 = 50%
    pub allocation_bps: u32,
    /// Total amount already claimed (in stroops)
    pub amount_claimed: i128,
    pub vesting_type: VestingType,
    /// How many ledgers after death before vesting completes
    pub vesting_duration_ledgers: u32,
}

/// Returned by get_claimable for detailed info
#[contracttype]
#[derive(Clone, Debug)]
pub struct ClaimInfo {
    pub claimable: i128,
    pub total_entitlement: i128,
    pub already_claimed: i128,
    pub vested_amount: i128,
}
