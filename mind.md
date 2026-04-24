# 🧠 AfterLife V2 — Mind Map & Living Brain

> *This document is the central living knowledge base for the AfterLife V2 rebuild. It captures architecture decisions, context, key insights, blockers, and lessons learned as development progresses.*

---

## 📌 Project Identity

| Attribute | Value |
|---|---|
| **Project Name** | AfterLife — Temporal Asset Protocol |
| **Version** | V2 (Complete Rebuild) |
| **Core Concept** | Decentralized "Dead Man's Switch" for crypto inheritance |
| **Target Chain** | Stellar (Soroban) — Testnet initially |
| **Contract Language** | Rust (soroban-sdk → compiled to WebAssembly) |
| **Frontend Stack** | React 18 + TypeScript + Vite + Three.js |
| **Wallet Integration** | Freighter, Albedo, xBull via Stellar Wallets Kit |
| **GitHub Repo** | https://github.com/Mrinmoy-programmer07/AfterLife_.git |

---

## 🔁 Why V1 → V2? (Migration Context)

**V1 Tech Stack:** Solidity (EVM), deployed on Arbitrum Sepolia + Mantle Sepolia
- Used `wagmi` + `viem` + RainbowKit for wallet connection
- EVM timestamps (`block.timestamp`) for inactivity logic
- Hardhat for contract dev/deployment

**V2 Philosophy:**
- Full migration to **Stellar's Soroban** smart contract platform
- Replace EVM timestamps with **ledger sequence numbers** (Stellar's native time unit)
- Replace ETH with **XLM** as the native asset in the vault
- Replace wagmi/viem with **Stellar Wallets Kit** (universal Stellar wallet interface)
- Keep all business logic identical — only the blockchain layer changes
- **No multi-chain** in V2 — focus on Stellar exclusively and do it properly

---

## 🏛️ Core Architecture

### Roles (Unchanged from V1)

```
OWNER      → Registers, deposits XLM, manages guardians/beneficiaries, proves life
GUARDIAN   → Trusted oracle; confirms inactivity (no fund access)
BENEFICIARY → Claims allocated XLM after vesting begins
```

### State Machine

```
ACTIVE → WARNING → PENDING → EXECUTING → COMPLETED
   ↑_____________________________________________|
         (Owner can revive within 7-day grace period)
```

| State | Trigger |
|---|---|
| `ACTIVE` | Default; owner heartbeat is fresh |
| `WARNING` | Inactivity reaches 70% of ledger threshold |
| `PENDING` | Guardian calls `confirm_inactivity()` |
| `EXECUTING` | Vesting clock starts; beneficiaries may claim |
| `COMPLETED` | All beneficiaries have fully claimed |

---

## 🔧 Soroban Contract Architecture

### Key Design Decisions

1. **Ledger Sequences instead of Timestamps**
   - Stellar produces ~1 ledger every 5 seconds
   - `inactivity_threshold` is stored in **ledger counts**
   - Example: 30 days ≈ 518,400 ledgers
   - UI converts days → ledger count for user friendliness

2. **Storage Model**
   - `Instance` storage for protocol-level data (auto-expires with ledger)
   - `Persistent` storage for guardian/beneficiary maps
   - Owner address is the primary key for all mappings

3. **Asset Handling**
   - Native XLM via `token::Client` or `stellar_sdk` token interface
   - 10% platform fee on every claim (sent to treasury address)
   - Pull-pattern for claims (beneficiary calls `claim()`)

4. **Vesting Types**
   - `Linear`: proportional unlock over time
   - `Cliff`: 100% unlocks after full duration passes

### Contract Functions (Soroban)

```rust
// Owner
fn register(env, threshold_ledgers: u32)
fn prove_life(env)
fn add_guardian(env, name: String, wallet: Address)
fn remove_guardian(env, wallet: Address)
fn set_guardian_fixed(env, wallet: Address, fixed: bool)
fn add_beneficiary(env, name: String, wallet: Address, allocation_bps: u32, vesting_type: VestingType, duration_ledgers: u32)
fn remove_beneficiary(env, wallet: Address)
fn deposit(env, amount: i128)
fn withdraw(env, amount: i128)
fn update_threshold(env, new_threshold: u32)

// Guardian
fn confirm_inactivity(env, owner: Address)

// Beneficiary
fn claim(env, owner: Address)

// Views
fn get_protocol(env, owner: Address) -> Protocol
fn get_guardians(env, owner: Address) -> Vec<Guardian>
fn get_beneficiaries(env, owner: Address) -> Vec<Beneficiary>
fn get_claimable(env, owner: Address, beneficiary: Address) -> i128
fn get_owner_balance(env, owner: Address) -> i128
fn is_registered(env, owner: Address) -> bool
```

### Constants

```rust
MAX_GUARDIANS = 10
MAX_BENEFICIARIES = 20
PLATFORM_FEE_BPS = 1000  // 10%
REVIVE_GRACE_LEDGERS = 120_960  // ~7 days
MIN_THRESHOLD_LEDGERS = 17_280  // ~1 day
```

---

## 🎨 Frontend Architecture

### Pages / Views

```
/ (EntryView)         → Landing page, connect wallet CTA
/role                 → Role selection (Owner / Guardian / Beneficiary)
/owner                → Owner dashboard (vault, guardians, beneficiaries, heartbeat)
/guardian             → Guardian dashboard (monitor owner, confirm inactivity)
/beneficiary          → Beneficiary dashboard (view allocation, claim assets)
```

### Key Tech Choices

| Concern | Solution |
|---|---|
| Stellar wallet connection | `@stellar/stellar-wallets-kit` |
| Contract invocation | `@stellar/stellar-sdk` (soroban RPC) |
| 3D background | `three.js` + `@react-three/fiber` + `@react-three/drei` |
| Animations | `framer-motion` |
| Toasts | `react-hot-toast` |
| Icons | `lucide-react` |
| Fonts | Google Fonts — `Space Grotesk` + `Inter` |

### Design System — "Deep Space" Theme

```
Primary:     Neon Gold    #F5C518
Accent:      Cosmic Teal  #00CED1
Background:  Void Black   #030712
Surface:     Deep Navy    #0D1117
Border:      Galactic     rgba(245, 197, 24, 0.2)
Danger:      Nebula Red   #FF453A
Success:     Aurora Green #30D158
```

---

## 🖼️ Logo & Branding

### Logo Concept (from PRD)
- **Elements**: Hourglass (time), Keyhole (security), Cosmic ring (eternity)
- **Style**: Minimalist glowing SVG — gold/teal gradient
- **Usage**: Animated on landing page, static in nav
- **Tagline**: *"Your legacy, secured by code"*

---

## 🔗 Key Dependencies (V2)

```json
{
  "@stellar/stellar-wallets-kit": "latest",
  "@stellar/stellar-sdk": "^12.x",
  "react": "^18",
  "vite": "^5",
  "typescript": "^5",
  "three": "^0.165",
  "@react-three/fiber": "^8",
  "@react-three/drei": "^9",
  "framer-motion": "^11",
  "lucide-react": "latest",
  "react-hot-toast": "^2"
}
```

---

## 🧪 Testing Strategy

### Contract Tests (Rust)
- Unit tests in `contracts/afterlife/src/test.rs`
- Test all state transitions
- Test edge cases: claim before vesting, double claim, revival after grace period
- Use `soroban-sdk` test harness with mock ledger environment

### Frontend Tests
- Manual testing flow for each role (Owner, Guardian, Beneficiary)
- End-to-end on Stellar Testnet (Futurenet or Testnet)

---

## 🚀 Deployment Plan

| Stage | Network | Notes |
|---|---|---|
| Dev | `soroban-env` local | `stellar contract deploy --network local` |
| Testing | Stellar Testnet | Freighter configured for testnet |
| Production | Stellar Mainnet | After full audit |

---

## 📝 Dev Log (Ongoing)

### 2026-04-24 — Project Kickoff
- Read AfterLife V2 PRD in full
- Existing codebase is EVM/Solidity-based (V1)
- Decision: Full clean rebuild — new Soroban contract + new frontend
- Retaining: Business logic, state machine, role model, vesting types, 10% fee
- Removing: Wagmi, Viem, RainbowKit, Hardhat, Solidity, EVM dependencies, multi-chain
- Adding: Stellar SDK, Stellar Wallets Kit, Soroban SDK (Rust)
- Created `mind.md`, `todo.md`, implementation plan

---

## 🔴 Known Risks & Blockers

| Risk | Mitigation |
|---|---|
| Soroban storage auto-expiry | Use `extend_ttl()` on critical storage entries |
| Ledger count drift | Document conversion: 1 day ≈ 17,280 ledgers |
| Freighter wallet availability | Fallback prompts for Albedo/xBull |
| Large state on-chain | Use `Persistent` storage wisely; avoid storing full arrays |

---

## 💡 Key Lessons from V1

1. Never hardcode EVM timestamps — use ledger-native time units
2. Multi-chain adds complexity early on — solve single-chain first
3. The `confirm_inactivity` guard (threshold check) MUST be on-chain, not UI-side
4. Pull-over-push for asset transfers prevents batch-revert attacks
5. The 3D background (Three.js) is expensive — use `useFrame` carefully with frame limiting

---

*Last updated: 2026-04-24 | Maintained by Antigravity Agent*
