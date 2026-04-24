#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token, Address, Env, String,
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

fn create_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

fn setup(env: &Env) -> (AfterLifeContractClient, Address, Address) {
    let contract_id = env.register_contract(None, AfterLifeContract);
    let client = AfterLifeContractClient::new(env, &contract_id);

    // Deploy a mock native token
    let native_token_id = env.register_stellar_asset_contract(Address::generate(env));
    let platform_wallet = Address::generate(env);

    client.initialize(&native_token_id, &platform_wallet);

    (client, native_token_id, platform_wallet)
}

fn advance_ledger(env: &Env, by: u32) {
    let current = env.ledger().sequence();
    env.ledger().set(LedgerInfo {
        sequence_number: current + by,
        timestamp: env.ledger().timestamp() + (by as u64 * 5),
        ..env.ledger().get()
    });
}

// ---------------------------------------------------------------------------
// Registration tests
// ---------------------------------------------------------------------------

#[test]
fn test_register_success() {
    let env = create_env();
    let (client, _, _) = setup(&env);
    let owner = Address::generate(&env);

    client.register(&owner, &17_280); // 1 day
    let p = client.get_protocol(&owner).unwrap();
    assert!(p.is_registered);
    assert!(!p.is_dead);
    assert_eq!(p.total_allocation_bps, 0);
}

#[test]
#[should_panic]
fn test_register_threshold_too_short() {
    let env = create_env();
    let (client, _, _) = setup(&env);
    let owner = Address::generate(&env);
    client.register(&owner, &100); // below minimum
}

#[test]
#[should_panic]
fn test_register_twice_fails() {
    let env = create_env();
    let (client, _, _) = setup(&env);
    let owner = Address::generate(&env);
    client.register(&owner, &17_280);
    client.register(&owner, &17_280); // should panic
}

// ---------------------------------------------------------------------------
// Guardian tests
// ---------------------------------------------------------------------------

#[test]
fn test_add_and_remove_guardian() {
    let env = create_env();
    let (client, _, _) = setup(&env);
    let owner = Address::generate(&env);
    let guardian = Address::generate(&env);

    client.register(&owner, &17_280);
    client.add_guardian(&owner, &String::from_str(&env, "Alice"), &guardian);

    let guardians = client.get_guardians(&owner);
    assert_eq!(guardians.len(), 1);
    assert_eq!(guardians.get(0).unwrap().wallet, guardian);

    client.remove_guardian(&owner, &guardian);
    assert_eq!(client.get_guardians(&owner).len(), 0);
}

// ---------------------------------------------------------------------------
// Beneficiary tests
// ---------------------------------------------------------------------------

#[test]
fn test_add_beneficiary() {
    let env = create_env();
    let (client, _, _) = setup(&env);
    let owner = Address::generate(&env);
    let bene = Address::generate(&env);

    client.register(&owner, &17_280);
    client.add_beneficiary(
        &owner,
        &String::from_str(&env, "Bob"),
        &bene,
        &5_000, // 50%
        &VestingType::Linear,
        &17_280, // 1 day vesting
    );

    let p = client.get_protocol(&owner).unwrap();
    assert_eq!(p.total_allocation_bps, 5_000);
    assert_eq!(client.get_beneficiaries(&owner).len(), 1);
}

#[test]
#[should_panic]
fn test_allocation_exceeds_100_percent() {
    let env = create_env();
    let (client, _, _) = setup(&env);
    let owner = Address::generate(&env);

    client.register(&owner, &17_280);
    client.add_beneficiary(
        &owner,
        &String::from_str(&env, "Bob"),
        &Address::generate(&env),
        &6_000,
        &VestingType::Linear,
        &17_280,
    );
    client.add_beneficiary(
        &owner,
        &String::from_str(&env, "Carol"),
        &Address::generate(&env),
        &5_000, // 6000 + 5000 = 11000 > 10000
        &VestingType::Linear,
        &17_280,
    );
}

// ---------------------------------------------------------------------------
// Prove life / heartbeat
// ---------------------------------------------------------------------------

#[test]
fn test_prove_life_resets_heartbeat() {
    let env = create_env();
    let (client, _, _) = setup(&env);
    let owner = Address::generate(&env);

    client.register(&owner, &17_280);

    advance_ledger(&env, 1000);
    client.prove_life(&owner);

    let p = client.get_protocol(&owner).unwrap();
    assert_eq!(p.last_heartbeat_ledger, env.ledger().sequence());
}

// ---------------------------------------------------------------------------
// Inactivity confirmation
// ---------------------------------------------------------------------------

#[test]
#[should_panic]
fn test_confirm_inactivity_too_early() {
    let env = create_env();
    let (client, _, _) = setup(&env);
    let owner = Address::generate(&env);
    let guardian = Address::generate(&env);

    client.register(&owner, &17_280);
    client.add_guardian(&owner, &String::from_str(&env, "G"), &guardian);

    // Only 1000 ledgers passed, threshold is 17280
    advance_ledger(&env, 1000);
    client.confirm_inactivity(&guardian, &owner); // should panic OwnerStillActive
}

#[test]
fn test_confirm_inactivity_success() {
    let env = create_env();
    let (client, _, _) = setup(&env);
    let owner = Address::generate(&env);
    let guardian = Address::generate(&env);

    client.register(&owner, &17_280);
    client.add_guardian(&owner, &String::from_str(&env, "G"), &guardian);

    // Advance past threshold
    advance_ledger(&env, 17_281);
    client.confirm_inactivity(&guardian, &owner);

    let p = client.get_protocol(&owner).unwrap();
    assert!(p.is_dead);
}

// ---------------------------------------------------------------------------
// Claim (Linear vesting)
// ---------------------------------------------------------------------------

#[test]
fn test_claim_linear_vesting() {
    let env = create_env();
    let (client, native_token_id, _) = setup(&env);

    let owner = Address::generate(&env);
    let guardian = Address::generate(&env);
    let bene = Address::generate(&env);

    // Mint 1000 XLM to owner (in stroops: 1 XLM = 10_000_000 stroops)
    let deposit_amount: i128 = 1_000 * 10_000_000;
    let token_admin = token::StellarAssetClient::new(&env, &native_token_id);
    token_admin.mint(&owner, &deposit_amount);

    client.register(&owner, &17_280);
    client.add_guardian(&owner, &String::from_str(&env, "G"), &guardian);
    client.add_beneficiary(
        &owner,
        &String::from_str(&env, "Bob"),
        &bene,
        &10_000, // 100%
        &VestingType::Linear,
        &17_280, // 1 day linear
    );
    client.deposit(&owner, &deposit_amount);

    // Trigger death
    advance_ledger(&env, 17_281);
    client.confirm_inactivity(&guardian, &owner);

    // Advance to 50% of vesting period
    advance_ledger(&env, 8_640);

    let info = client.get_claimable(&owner, &bene);
    // 50% of 1000 XLM minus 10% fee = ~450 XLM claimable (vested_amount * 0.9)
    assert!(info.claimable > 0);
    assert!(info.vested_amount > 0);
}

// ---------------------------------------------------------------------------
// Revival test
// ---------------------------------------------------------------------------

#[test]
fn test_revive_within_grace_period() {
    let env = create_env();
    let (client, _, _) = setup(&env);

    let owner = Address::generate(&env);
    let guardian = Address::generate(&env);

    client.register(&owner, &17_280);
    client.add_guardian(&owner, &String::from_str(&env, "G"), &guardian);

    advance_ledger(&env, 17_281);
    client.confirm_inactivity(&guardian, &owner);

    let p = client.get_protocol(&owner).unwrap();
    assert!(p.is_dead);

    // Revive within grace
    advance_ledger(&env, 1_000);
    client.prove_life(&owner);

    let p2 = client.get_protocol(&owner).unwrap();
    assert!(!p2.is_dead);
}

#[test]
#[should_panic]
fn test_revive_after_grace_period_fails() {
    let env = create_env();
    let (client, _, _) = setup(&env);

    let owner = Address::generate(&env);
    let guardian = Address::generate(&env);

    client.register(&owner, &17_280);
    client.add_guardian(&owner, &String::from_str(&env, "G"), &guardian);

    advance_ledger(&env, 17_281);
    client.confirm_inactivity(&guardian, &owner);

    // Advance past grace period (120,960 ledgers)
    advance_ledger(&env, 120_961);
    client.prove_life(&owner); // should panic GracePeriodExpired
}
