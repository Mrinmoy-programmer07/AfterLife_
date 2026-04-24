# AfterLife V2 ⏳ — Temporal Asset Protocol on Stellar

<div align="center">

**A decentralized dead man's switch for secure crypto inheritance on the Stellar blockchain**

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue?logo=stellar)](https://stellar.org)
[![Rust](https://img.shields.io/badge/Contract-Rust%2FSoroban-orange?logo=rust)](https://soroban.stellar.org)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb?logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

*Your legacy, secured by code.*

</div>

---

## 📖 Overview

AfterLife ensures your digital XLM assets are distributed to your chosen beneficiaries if you become inactive on the Stellar network. The protocol runs entirely on **Soroban** smart contracts — trustless, permissionless, and auditable.

### How It Works

1. **Owner** registers, deposits XLM, adds guardians & beneficiaries, and sends periodic heartbeats ("proof of life")
2. **Guardian** monitors the owner. If the inactivity threshold passes, they confirm it on-chain
3. **Beneficiary** claims their allocated XLM based on a customizable vesting schedule (linear or cliff)

---

## 🔗 Deployed Contract

| Network | Contract Address | Explorer |
|---------|-----------------|----------|
| **Stellar Testnet** | `CBTAWNMZRYCAR4FFAANJ537CI2W4ZLKM4B4ETN3ZADBSBTTWBS7QW27T` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CBTAWNMZRYCAR4FFAANJ537CI2W4ZLKM4B4ETN3ZADBSBTTWBS7QW27T) |

> **Platform Fee:** 10% deducted on every beneficiary claim → platform treasury

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  AFTERLIFE PROTOCOL                  │
├───────────────┬──────────────────┬──────────────────┤
│     OWNER     │    GUARDIAN      │   BENEFICIARY    │
│  register()   │                  │                  │
│  prove_life() │confirm_inactivity│    claim()       │
│  deposit()    │     (owner)      │                  │
│  withdraw()   │                  │                  │
│  add_guardian │                  │                  │
│  add_bene     │                  │                  │
└───────┬───────┴──────────────────┴──────────────────┘
        │
        ▼
┌───────────────────────────────┐
│  SOROBAN SMART CONTRACT       │
│  • Persistent storage per     │
│    owner (Address key)        │
│  • Ledger-based time model    │
│  • Linear + Cliff vesting     │
│  • 7-day revival grace period │
│  • Pull-over-push transfers   │
└───────────────────────────────┘
        │
        ▼
  STELLAR TESTNET / MAINNET
```

### Protocol State Machine

```
ACTIVE → WARNING → PENDING → EXECUTING → COMPLETED
   ↑_____________________________________________|
         (Owner proves life within 7-day grace period)
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contract** | Rust + Soroban SDK 22 (compiled to WASM) |
| **Frontend** | React 18 + TypeScript + Vite |
| **Wallet** | @creit-tech/stellar-wallets-kit (Freighter, Lobstr, xBull, Albedo) |
| **Blockchain** | @stellar/stellar-sdk v13 (Soroban RPC) |
| **State** | Zustand + TanStack Query |
| **3D / Animations** | Three.js + React Three Fiber + Framer Motion |
| **Fonts** | Cinzel (headings) + DM Sans (body) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/) (for contract compilation)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) (for deployment)
- [Freighter Wallet](https://freighter.app/) browser extension

### Frontend Setup

```bash
# Clone repo
git clone https://github.com/Mrinmoy-programmer07/AfterLife_.git
cd AfterLife_

# Install dependencies
pnpm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your deployed contract address

# Start dev server
pnpm dev
```

### Compile & Deploy Contract

```bash
cd contracts/afterlife

# Build WASM
cargo build --target wasm32-unknown-unknown --release

# Deploy to Stellar Testnet
stellar contract deploy \
  --wasm ../../target/wasm32-unknown-unknown/release/afterlife.wasm \
  --source YOUR_SECRET_KEY \
  --network testnet

# Initialize (one-time)
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source YOUR_SECRET_KEY \
  --network testnet \
  -- initialize \
  --native_token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN3 \
  --platform_wallet YOUR_TREASURY_ADDRESS

# Run contract tests
cargo test
```

---

## 🔢 Ledger Time Reference

Stellar produces ~1 ledger every 5 seconds:

| Time | Ledgers |
|------|---------|
| 1 minute | 12 |
| 1 hour | 720 |
| 1 day | 17,280 |
| 7 days (grace period) | 120,960 |
| 30 days | 518,400 |

---

## 🛡️ Security Model

| Mechanism | Description |
|-----------|-------------|
| **Owner Override** | `prove_life()` resets the timer at any time |
| **7-Day Grace Period** | Owner can revive even after execution starts |
| **Vesting Delay** | Funds unlock gradually, not instantly |
| **Guardian Isolation** | Guardians have zero fund access |
| **TTL Bumping** | Persistent storage entries extended on every access |
| **Auth Required** | Every state mutation requires `require_auth()` |

---

## 📘 User Guide

### Owner
1. Connect Freighter → Select **Owner** role
2. **Register** with your chosen inactivity threshold (e.g., 30 days)
3. **Deposit** XLM to your vault
4. **Add Guardians** — trusted wallets to monitor you
5. **Add Beneficiaries** — set allocations (must total ≤ 100%)
6. Click **PROVE LIFE** periodically to reset your heartbeat

### Guardian
1. Connect wallet → Select **Guardian** → Enter owner's address
2. Monitor the inactivity gauge
3. After the threshold passes, click **CONFIRM INACTIVITY**

### Beneficiary
1. Connect wallet → Select **Beneficiary** → Enter owner's address
2. Wait for the protocol to enter **EXECUTING** state
3. Click **CLAIM** to receive your XLM (10% platform fee applied)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for the Stellar ecosystem**

[⬆ Back to Top](#afterlife-v2--temporal-asset-protocol-on-stellar)

</div>
