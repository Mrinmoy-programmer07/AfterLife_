use soroban_sdk::{contracttype, Address, Env, Vec};
use crate::types::{Beneficiary, Guardian, Protocol};

// ---------------------------------------------------------------------------
// Storage Key Enum
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    /// Contract initialized flag
    Initialized,
    /// Native XLM token contract address
    NativeToken,
    /// Platform treasury wallet
    PlatformWallet,
    /// Protocol state for an owner
    Protocol(Address),
    /// List of guardian structs for an owner
    Guardians(Address),
    /// List of beneficiary structs for an owner
    Beneficiaries(Address),
    /// XLM balance (in stroops) held for an owner
    Balance(Address),
}

// ---------------------------------------------------------------------------
// TTL helpers  (~90-day bump for persistent storage entries)
// ---------------------------------------------------------------------------

const PERSISTENT_BUMP_AMOUNT: u32 = 1_555_200; // ~90 days in ledgers
const PERSISTENT_LIFETIME_THRESHOLD: u32 = 777_600; // 45 days

fn bump(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
}

// ---------------------------------------------------------------------------
// Protocol
// ---------------------------------------------------------------------------

pub fn has_protocol(env: &Env, owner: &Address) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Protocol(owner.clone()))
}

pub fn get_protocol(env: &Env, owner: &Address) -> Option<Protocol> {
    let key = DataKey::Protocol(owner.clone());
    let val = env.storage().persistent().get::<DataKey, Protocol>(&key);
    if val.is_some() {
        bump(env, &key);
    }
    val
}

pub fn set_protocol(env: &Env, owner: &Address, protocol: &Protocol) {
    let key = DataKey::Protocol(owner.clone());
    env.storage().persistent().set(&key, protocol);
    bump(env, &key);
}

// ---------------------------------------------------------------------------
// Guardians
// ---------------------------------------------------------------------------

pub fn get_guardians(env: &Env, owner: &Address) -> Vec<Guardian> {
    let key = DataKey::Guardians(owner.clone());
    let val = env
        .storage()
        .persistent()
        .get::<DataKey, Vec<Guardian>>(&key)
        .unwrap_or_else(|| Vec::new(env));
    bump(env, &key);
    val
}

pub fn set_guardians(env: &Env, owner: &Address, guardians: &Vec<Guardian>) {
    let key = DataKey::Guardians(owner.clone());
    env.storage().persistent().set(&key, guardians);
    bump(env, &key);
}

// ---------------------------------------------------------------------------
// Beneficiaries
// ---------------------------------------------------------------------------

pub fn get_beneficiaries(env: &Env, owner: &Address) -> Vec<Beneficiary> {
    let key = DataKey::Beneficiaries(owner.clone());
    let val = env
        .storage()
        .persistent()
        .get::<DataKey, Vec<Beneficiary>>(&key)
        .unwrap_or_else(|| Vec::new(env));
    bump(env, &key);
    val
}

pub fn set_beneficiaries(env: &Env, owner: &Address, beneficiaries: &Vec<Beneficiary>) {
    let key = DataKey::Beneficiaries(owner.clone());
    env.storage().persistent().set(&key, beneficiaries);
    bump(env, &key);
}

// ---------------------------------------------------------------------------
// Balance (in stroops)
// ---------------------------------------------------------------------------

pub fn get_balance(env: &Env, owner: &Address) -> i128 {
    let key = DataKey::Balance(owner.clone());
    let val = env
        .storage()
        .persistent()
        .get::<DataKey, i128>(&key)
        .unwrap_or(0i128);
    bump(env, &key);
    val
}

pub fn set_balance(env: &Env, owner: &Address, balance: &i128) {
    let key = DataKey::Balance(owner.clone());
    env.storage().persistent().set(&key, balance);
    bump(env, &key);
}
