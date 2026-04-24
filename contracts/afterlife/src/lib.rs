#![no_std]

mod errors;
mod storage;
mod types;

pub use errors::Error;
pub use types::*;

use soroban_sdk::{
    contract, contractimpl, panic_with_error, symbol_short, token, Address, Env, String, Vec,
};

use storage::DataKey;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Absolute maximum guardians per protocol
const MAX_GUARDIANS: u32 = 10;
/// Absolute maximum beneficiaries per protocol
const MAX_BENEFICIARIES: u32 = 20;
/// Platform fee: 10%
const PLATFORM_FEE_BPS: i128 = 1_000;
/// Grace period after death declaration: ~7 days (5 s/ledger)
const REVIVE_GRACE_LEDGERS: u32 = 120_960;
/// Minimum inactivity threshold: ~1 day
const MIN_THRESHOLD_LEDGERS: u32 = 17_280;

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct AfterLifeContract;

#[contractimpl]
impl AfterLifeContract {
    // -----------------------------------------------------------------------
    // Initialization (one-time)
    // -----------------------------------------------------------------------

    /// Set the native XLM token contract address and platform treasury wallet.
    /// Must be called once immediately after deployment.
    pub fn initialize(env: Env, native_token: Address, platform_wallet: Address) {
        if env
            .storage()
            .instance()
            .has(&DataKey::Initialized)
        {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage()
            .instance()
            .set(&DataKey::NativeToken, &native_token);
        env.storage()
            .instance()
            .set(&DataKey::PlatformWallet, &platform_wallet);
        env.storage()
            .instance()
            .set(&DataKey::Initialized, &true);
    }

    // -----------------------------------------------------------------------
    // Owner — Registration & Configuration
    // -----------------------------------------------------------------------

    /// Register a new AfterLife protocol instance.
    /// `threshold_ledgers`: number of ledgers of inactivity before guardians can declare death.
    pub fn register(env: Env, caller: Address, threshold_ledgers: u32) {
        caller.require_auth();

        if threshold_ledgers < MIN_THRESHOLD_LEDGERS {
            panic_with_error!(&env, Error::ThresholdTooShort);
        }

        if storage::has_protocol(&env, &caller) {
            panic_with_error!(&env, Error::AlreadyRegistered);
        }

        let protocol = Protocol {
            is_registered: true,
            last_heartbeat_ledger: env.ledger().sequence(),
            inactivity_threshold_ledgers: threshold_ledgers,
            is_dead: false,
            initial_vault_balance: 0,
            vesting_start_ledger: 0,
            total_allocation_bps: 0,
            death_declaration_ledger: 0,
        };

        storage::set_protocol(&env, &caller, &protocol);
        storage::set_guardians(&env, &caller, &Vec::new(&env));
        storage::set_beneficiaries(&env, &caller, &Vec::new(&env));
        storage::set_balance(&env, &caller, &0i128);

        env.events()
            .publish((symbol_short!("register"), caller), threshold_ledgers);
    }

    /// Update the inactivity threshold (minimum: MIN_THRESHOLD_LEDGERS).
    pub fn update_threshold(env: Env, caller: Address, new_threshold: u32) {
        caller.require_auth();

        if new_threshold < MIN_THRESHOLD_LEDGERS {
            panic_with_error!(&env, Error::ThresholdTooShort);
        }

        let mut protocol = storage::get_protocol(&env, &caller)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        protocol.inactivity_threshold_ledgers = new_threshold;
        storage::set_protocol(&env, &caller, &protocol);
    }

    // -----------------------------------------------------------------------
    // Owner — Heartbeat
    // -----------------------------------------------------------------------

    /// Send a proof-of-life heartbeat to reset the inactivity timer.
    /// Also serves as the revival mechanism within the 7-day grace period.
    pub fn prove_life(env: Env, caller: Address) {
        caller.require_auth();

        let mut protocol = storage::get_protocol(&env, &caller)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        let current_ledger = env.ledger().sequence();

        if protocol.is_dead {
            // Revival attempt
            if current_ledger > protocol.death_declaration_ledger + REVIVE_GRACE_LEDGERS {
                panic_with_error!(&env, Error::GracePeriodExpired);
            }

            // Reset death state
            protocol.is_dead = false;
            protocol.vesting_start_ledger = 0;
            protocol.initial_vault_balance = 0;
            protocol.death_declaration_ledger = 0;
            protocol.last_heartbeat_ledger = current_ledger;

            // Reset all claimed amounts
            let mut beneficiaries = storage::get_beneficiaries(&env, &caller);
            let len = beneficiaries.len();
            for i in 0..len {
                let mut b = beneficiaries.get(i).unwrap();
                b.amount_claimed = 0;
                beneficiaries.set(i, b);
            }
            storage::set_beneficiaries(&env, &caller, &beneficiaries);

            env.events()
                .publish((symbol_short!("revived"), caller.clone()), current_ledger);
        } else {
            protocol.last_heartbeat_ledger = current_ledger;
            env.events()
                .publish((symbol_short!("pulse"), caller.clone()), current_ledger);
        }

        storage::set_protocol(&env, &caller, &protocol);
    }

    // -----------------------------------------------------------------------
    // Owner — Guardians
    // -----------------------------------------------------------------------

    pub fn add_guardian(env: Env, caller: Address, name: String, wallet: Address) {
        caller.require_auth();

        let _p = storage::get_protocol(&env, &caller)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        if wallet == caller {
            panic_with_error!(&env, Error::CannotBeSelf);
        }

        let mut guardians = storage::get_guardians(&env, &caller);

        if guardians.len() >= MAX_GUARDIANS {
            panic_with_error!(&env, Error::TooManyGuardians);
        }

        for i in 0..guardians.len() {
            if guardians.get(i).unwrap().wallet == wallet {
                panic_with_error!(&env, Error::GuardianExists);
            }
        }

        guardians.push_back(Guardian {
            name,
            wallet: wallet.clone(),
            is_fixed: false,
        });

        storage::set_guardians(&env, &caller, &guardians);
        env.events()
            .publish((symbol_short!("g_add"), caller), wallet);
    }

    pub fn remove_guardian(env: Env, caller: Address, wallet: Address) {
        caller.require_auth();

        let _p = storage::get_protocol(&env, &caller)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        let mut guardians = storage::get_guardians(&env, &caller);
        let mut found = false;
        let mut idx = 0u32;

        for i in 0..guardians.len() {
            let g = guardians.get(i).unwrap();
            if g.wallet == wallet {
                if g.is_fixed {
                    panic_with_error!(&env, Error::FixedGuardian);
                }
                found = true;
                idx = i;
                break;
            }
        }

        if !found {
            panic_with_error!(&env, Error::GuardianNotFound);
        }

        guardians.remove(idx);
        storage::set_guardians(&env, &caller, &guardians);
        env.events()
            .publish((symbol_short!("g_rm"), caller), wallet);
    }

    pub fn set_guardian_fixed(env: Env, caller: Address, wallet: Address, fixed: bool) {
        caller.require_auth();

        let _p = storage::get_protocol(&env, &caller)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        let mut guardians = storage::get_guardians(&env, &caller);
        let mut found = false;

        for i in 0..guardians.len() {
            let mut g = guardians.get(i).unwrap();
            if g.wallet == wallet {
                g.is_fixed = fixed;
                guardians.set(i, g);
                found = true;
                break;
            }
        }

        if !found {
            panic_with_error!(&env, Error::GuardianNotFound);
        }

        storage::set_guardians(&env, &caller, &guardians);
    }

    // -----------------------------------------------------------------------
    // Owner — Beneficiaries
    // -----------------------------------------------------------------------

    pub fn add_beneficiary(
        env: Env,
        caller: Address,
        name: String,
        wallet: Address,
        allocation_bps: u32,
        vesting_type: VestingType,
        duration_ledgers: u32,
    ) {
        caller.require_auth();

        let mut protocol = storage::get_protocol(&env, &caller)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        if allocation_bps == 0 {
            panic_with_error!(&env, Error::ZeroAllocation);
        }
        if duration_ledgers == 0 {
            panic_with_error!(&env, Error::ZeroDuration);
        }
        if protocol.total_allocation_bps + allocation_bps > 10_000 {
            panic_with_error!(&env, Error::AllocationExceeds100);
        }

        let mut beneficiaries = storage::get_beneficiaries(&env, &caller);

        if beneficiaries.len() >= MAX_BENEFICIARIES {
            panic_with_error!(&env, Error::TooManyBeneficiaries);
        }

        for i in 0..beneficiaries.len() {
            if beneficiaries.get(i).unwrap().wallet == wallet {
                panic_with_error!(&env, Error::BeneficiaryExists);
            }
        }

        beneficiaries.push_back(Beneficiary {
            name,
            wallet: wallet.clone(),
            allocation_bps,
            amount_claimed: 0,
            vesting_type,
            vesting_duration_ledgers: duration_ledgers,
        });

        protocol.total_allocation_bps += allocation_bps;

        storage::set_beneficiaries(&env, &caller, &beneficiaries);
        storage::set_protocol(&env, &caller, &protocol);

        env.events()
            .publish((symbol_short!("b_add"), caller), wallet);
    }

    pub fn remove_beneficiary(env: Env, caller: Address, wallet: Address) {
        caller.require_auth();

        let mut protocol = storage::get_protocol(&env, &caller)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        let mut beneficiaries = storage::get_beneficiaries(&env, &caller);
        let mut found = false;
        let mut idx = 0u32;
        let mut allocation = 0u32;

        for i in 0..beneficiaries.len() {
            let b = beneficiaries.get(i).unwrap();
            if b.wallet == wallet {
                found = true;
                idx = i;
                allocation = b.allocation_bps;
                break;
            }
        }

        if !found {
            panic_with_error!(&env, Error::BeneficiaryNotFound);
        }

        beneficiaries.remove(idx);
        protocol.total_allocation_bps -= allocation;

        storage::set_beneficiaries(&env, &caller, &beneficiaries);
        storage::set_protocol(&env, &caller, &protocol);

        env.events()
            .publish((symbol_short!("b_rm"), caller), wallet);
    }

    // -----------------------------------------------------------------------
    // Owner — Vault (XLM)
    // -----------------------------------------------------------------------

    /// Deposit XLM into the vault. Caller must have pre-authorized the token transfer.
    pub fn deposit(env: Env, caller: Address, amount: i128) {
        caller.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let _p = storage::get_protocol(&env, &caller)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        // Pull XLM from caller into this contract
        let native_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::NativeToken)
            .unwrap();
        token::Client::new(&env, &native_token).transfer(
            &caller,
            &env.current_contract_address(),
            &amount,
        );

        let bal = storage::get_balance(&env, &caller);
        storage::set_balance(&env, &caller, &(bal + amount));

        env.events()
            .publish((symbol_short!("deposit"), caller), amount);
    }

    /// Withdraw XLM from the vault (only while protocol is ACTIVE).
    pub fn withdraw(env: Env, caller: Address, amount: i128) {
        caller.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let protocol = storage::get_protocol(&env, &caller)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        if protocol.is_dead {
            panic_with_error!(&env, Error::ProtocolDead);
        }

        let bal = storage::get_balance(&env, &caller);
        if bal < amount {
            panic_with_error!(&env, Error::InsufficientBalance);
        }

        storage::set_balance(&env, &caller, &(bal - amount));

        // Push XLM from contract back to caller
        let native_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::NativeToken)
            .unwrap();
        token::Client::new(&env, &native_token).transfer(
            &env.current_contract_address(),
            &caller,
            &amount,
        );

        env.events()
            .publish((symbol_short!("withdraw"), caller), amount);
    }

    // -----------------------------------------------------------------------
    // Guardian
    // -----------------------------------------------------------------------

    /// Confirm that `owner` has been inactive beyond their threshold.
    /// Only callable by a registered guardian of that owner.
    pub fn confirm_inactivity(env: Env, guardian: Address, owner: Address) {
        guardian.require_auth();

        let mut protocol = storage::get_protocol(&env, &owner)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        if protocol.is_dead {
            panic_with_error!(&env, Error::AlreadyDead);
        }

        // Verify guardian membership
        let guardians = storage::get_guardians(&env, &owner);
        let mut is_guardian = false;
        for i in 0..guardians.len() {
            if guardians.get(i).unwrap().wallet == guardian {
                is_guardian = true;
                break;
            }
        }
        if !is_guardian {
            panic_with_error!(&env, Error::NotGuardian);
        }

        let current_ledger = env.ledger().sequence();
        if current_ledger <= protocol.last_heartbeat_ledger + protocol.inactivity_threshold_ledgers {
            panic_with_error!(&env, Error::OwnerStillActive);
        }

        // Declare death
        let current_balance = storage::get_balance(&env, &owner);
        protocol.is_dead = true;
        protocol.vesting_start_ledger = current_ledger;
        protocol.death_declaration_ledger = current_ledger;
        protocol.initial_vault_balance = current_balance;

        storage::set_protocol(&env, &owner, &protocol);

        env.events()
            .publish((symbol_short!("dead"), owner), current_ledger);
    }

    // -----------------------------------------------------------------------
    // Beneficiary
    // -----------------------------------------------------------------------

    /// Claim vested XLM from the vault of a dead protocol owner.
    /// 10% platform fee is deducted on every claim.
    pub fn claim(env: Env, caller: Address, owner: Address) {
        caller.require_auth();

        let protocol = storage::get_protocol(&env, &owner)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotRegistered));

        if !protocol.is_dead {
            panic_with_error!(&env, Error::ProtocolActive);
        }
        if protocol.vesting_start_ledger == 0 {
            panic_with_error!(&env, Error::VestingNotStarted);
        }

        // Find beneficiary
        let mut beneficiaries = storage::get_beneficiaries(&env, &owner);
        let mut found = false;
        let mut b_idx = 0u32;

        for i in 0..beneficiaries.len() {
            if beneficiaries.get(i).unwrap().wallet == caller {
                found = true;
                b_idx = i;
                break;
            }
        }
        if !found {
            panic_with_error!(&env, Error::NotBeneficiary);
        }

        let mut b = beneficiaries.get(b_idx).unwrap();
        let current_ledger = env.ledger().sequence();

        // Elapsed since vesting started (saturating to avoid underflow)
        let elapsed = current_ledger.saturating_sub(protocol.vesting_start_ledger);

        let total_entitlement =
            (protocol.initial_vault_balance * b.allocation_bps as i128) / 10_000;

        let vested_amount = match b.vesting_type {
            VestingType::Cliff => {
                if elapsed >= b.vesting_duration_ledgers {
                    total_entitlement
                } else {
                    0
                }
            }
            VestingType::Linear => {
                if elapsed >= b.vesting_duration_ledgers {
                    total_entitlement
                } else {
                    (total_entitlement * elapsed as i128) / b.vesting_duration_ledgers as i128
                }
            }
        };

        if vested_amount <= b.amount_claimed {
            panic_with_error!(&env, Error::NothingToClaim);
        }

        let claimable = vested_amount - b.amount_claimed;
        let current_balance = storage::get_balance(&env, &owner);

        if current_balance < claimable {
            panic_with_error!(&env, Error::VaultInsolvency);
        }

        // Platform fee (10%)
        let platform_fee = (claimable * PLATFORM_FEE_BPS) / 10_000;
        let beneficiary_amount = claimable - platform_fee;

        // Update state before transfers (checks-effects-interactions)
        b.amount_claimed += claimable;
        beneficiaries.set(b_idx, b.clone());
        storage::set_beneficiaries(&env, &owner, &beneficiaries);
        storage::set_balance(&env, &owner, &(current_balance - claimable));

        // Perform transfers
        let native_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::NativeToken)
            .unwrap();
        let platform_wallet: Address = env
            .storage()
            .instance()
            .get(&DataKey::PlatformWallet)
            .unwrap();
        let token = token::Client::new(&env, &native_token);

        token.transfer(
            &env.current_contract_address(),
            &b.wallet,
            &beneficiary_amount,
        );
        token.transfer(
            &env.current_contract_address(),
            &platform_wallet,
            &platform_fee,
        );

        env.events()
            .publish((symbol_short!("claim"), owner), claimable);
    }

    // -----------------------------------------------------------------------
    // View Functions (read-only)
    // -----------------------------------------------------------------------

    pub fn get_protocol(env: Env, owner: Address) -> Option<Protocol> {
        storage::get_protocol(&env, &owner)
    }

    pub fn get_guardians(env: Env, owner: Address) -> Vec<Guardian> {
        storage::get_guardians(&env, &owner)
    }

    pub fn get_beneficiaries(env: Env, owner: Address) -> Vec<Beneficiary> {
        storage::get_beneficiaries(&env, &owner)
    }

    pub fn get_balance(env: Env, owner: Address) -> i128 {
        storage::get_balance(&env, &owner)
    }

    pub fn is_registered(env: Env, owner: Address) -> bool {
        storage::get_protocol(&env, &owner)
            .map(|p| p.is_registered)
            .unwrap_or(false)
    }

    pub fn get_claimable(env: Env, owner: Address, beneficiary: Address) -> ClaimInfo {
        let empty = ClaimInfo {
            claimable: 0,
            total_entitlement: 0,
            already_claimed: 0,
            vested_amount: 0,
        };

        let protocol = match storage::get_protocol(&env, &owner) {
            Some(p) => p,
            None => return empty,
        };

        if !protocol.is_dead || protocol.vesting_start_ledger == 0 {
            return empty;
        }

        let beneficiaries = storage::get_beneficiaries(&env, &owner);
        for i in 0..beneficiaries.len() {
            let b = beneficiaries.get(i).unwrap();
            if b.wallet == beneficiary {
                let current_ledger = env.ledger().sequence();
                let elapsed = current_ledger.saturating_sub(protocol.vesting_start_ledger);
                let total_entitlement =
                    (protocol.initial_vault_balance * b.allocation_bps as i128) / 10_000;

                let vested_amount = match b.vesting_type {
                    VestingType::Cliff => {
                        if elapsed >= b.vesting_duration_ledgers {
                            total_entitlement
                        } else {
                            0
                        }
                    }
                    VestingType::Linear => {
                        if elapsed >= b.vesting_duration_ledgers {
                            total_entitlement
                        } else {
                            (total_entitlement * elapsed as i128)
                                / b.vesting_duration_ledgers as i128
                        }
                    }
                };

                let claimable = if vested_amount > b.amount_claimed {
                    vested_amount - b.amount_claimed
                } else {
                    0
                };

                return ClaimInfo {
                    claimable,
                    total_entitlement,
                    already_claimed: b.amount_claimed,
                    vested_amount,
                };
            }
        }

        empty
    }

    pub fn get_revive_status(env: Env, owner: Address) -> (bool, u32) {
        let protocol = match storage::get_protocol(&env, &owner) {
            Some(p) => p,
            None => return (false, 0),
        };

        if !protocol.is_dead {
            return (false, 0);
        }

        let grace_end = protocol.death_declaration_ledger + REVIVE_GRACE_LEDGERS;
        let current = env.ledger().sequence();

        if current >= grace_end {
            (false, 0)
        } else {
            (true, grace_end - current)
        }
    }
}
