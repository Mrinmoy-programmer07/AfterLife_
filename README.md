# AfterLife | Temporal Asset Protocol ⏳⚖️

<div align="center">

**A decentralized "dead man's switch" protocol for secure crypto inheritance**

[![Multi-Chain](https://img.shields.io/badge/Multi--Chain-Arbitrum%20%7C%20Mantle-blue)](https://github.com)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Live Demo](#) • [Documentation](#-architecture) • [Deploy](#-getting-started)

</div>

---

## 📖 Overview

AfterLife ensures your digital assets are securely distributed to beneficiaries if you become inactive for a defined period. The protocol operates on a **"Dead Man's Switch"** principle — lack of activity triggers a state change that eventually unlocks assets for your chosen beneficiaries.

### Why AfterLife?
- 🔐 **Trustless Execution** — No centralized authority controls your assets
- ⏱️ **Time-Based Triggers** — Customizable inactivity thresholds
- 🛡️ **Owner Override** — Cancel inheritance at any time with proof of life
- 🔗 **Multi-Chain** — Deploy independently on Arbitrum and Mantle

---

## 🔗 Deployed Contracts

### Mainnet (Coming Soon)

### Testnets

| Network | Chain ID | Contract Address | Explorer | Status |
|---------|:--------:|------------------|----------|:------:|
| **Arbitrum Sepolia** | 421614 | `0x6D2Bd7091CE36F15C944AB99c4cfc8833c2B8957` | [Arbiscan ↗](https://sepolia.arbiscan.io/address/0x6D2Bd7091CE36F15C944AB99c4cfc8833c2B8957) | ✅ Live |
| **Mantle Sepolia** | 5003 | `0xe04250cE4a9A2362eaC92B2BaA3E16E3691EBcE9` | [Mantlescan ↗](https://explorer.sepolia.mantle.xyz/address/0xe04250cE4a9A2362eaC92B2BaA3E16E3691EBcE9) | ✅ Live |

> 💡 **Platform Fee:** 10% on all beneficiary claims (sent to protocol treasury)

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AFTERLIFE PROTOCOL                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│   │    OWNER     │     │   GUARDIAN   │     │ BENEFICIARY  │            │
│   │   Register   │     │   Confirm    │     │    Claim     │            │
│   │   Deposit    │     │  Inactivity  │     │   Assets     │            │
│   │  Prove Life  │     │              │     │              │            │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘            │
│          │                    │                    │                     │
│          └────────────────────┼────────────────────┘                     │
│                               │                                          │
│                    ┌──────────▼──────────┐                              │
│                    │   SMART CONTRACT    │                              │
│                    │   (Multi-Tenant)    │                              │
│                    │                     │                              │
│                    │  • State Machine    │                              │
│                    │  • Fund Storage     │                              │
│                    │  • Vesting Logic    │                              │
│                    └──────────┬──────────┘                              │
│                               │                                          │
│          ┌────────────────────┼────────────────────┐                     │
│          │                    │                    │                     │
│   ┌──────▼──────┐      ┌──────▼──────┐     ┌──────▼──────┐              │
│   │  ARBITRUM   │      │   MANTLE    │     │   FUTURE    │              │
│   │   SEPOLIA   │      │   SEPOLIA   │     │   CHAINS    │              │
│   └─────────────┘      └─────────────┘     └─────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Entity Roles

| Entity | Role | Permissions |
|--------|------|-------------|
| **👤 Owner** | Asset Holder | Register, deposit/withdraw, add guardians/beneficiaries, prove life, revive |
| **🛡️ Guardian** | Inactivity Oracle | Confirm owner inactivity (cannot touch funds) |
| **💰 Beneficiary** | Asset Receiver | Claim allocated assets after vesting begins |

---

## 🔄 Protocol Flow

### Protocol States

```
ACTIVE → WARNING → PENDING → EXECUTING → COMPLETED
   ↑__________|_________|_________|
              (Owner can revive)
```

### State Transitions

| From | To | Trigger |
|------|-----|---------|
| `ACTIVE` | `WARNING` | Inactivity reaches 70% of threshold |
| `WARNING` | `PENDING` | Guardian confirms inactivity |
| `PENDING` | `EXECUTING` | Vesting period begins |
| `EXECUTING` | `COMPLETED` | All beneficiaries have claimed |
| `ANY STATE` | `ACTIVE` | Owner proves life (7-day grace period) |

---

### User Workflows

**� Owner Flow**
```
Register → Add Guardians → Add Beneficiaries → Deposit Funds → Prove Life (Periodic)
```

**�️ Guardian Flow**
```
Monitor Owner → Detect Inactivity → Confirm Inactivity → Wait for Vesting
```

**� Beneficiary Flow**
```
Wait for Execution → Check Claimable Amount → Claim Assets → Receive Funds
```

---

## ⚙️ Technical Stack

| Layer | Technology |
|-------|------------|
| **Smart Contracts** | Solidity 0.8.20, Hardhat |
| **Frontend** | React 18, Vite, TypeScript |
| **Web3** | Wagmi v2, Viem, TanStack Query |
| **Styling** | CSS3 (Glassmorphism), Framer Motion |
| **3D Graphics** | Three.js, React Three Fiber |

---

## 🛡️ Security Model

### Safety Mechanisms

| Mechanism | Description |
|-----------|-------------|
| **Owner Override** | `proveLife()` cancels inheritance at ANY time |
| **7-Day Grace Period** | Owner can revive even after execution starts |
| **Vesting Delay** | Funds unlock gradually, not instantly |
| **Guardian Isolation** | Guardians have ZERO fund access |
| **Reentrancy Guards** | All transfers protected |

### Smart Contract Security
- ✅ Custom errors (gas efficient)
- ✅ Strict modifiers for access control
- ✅ Bounded arrays (max 10 guardians, 20 beneficiaries)
- ✅ Pull-over-push for fund transfers

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/)
- [MetaMask](https://metamask.io/) wallet

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-repo/afterlife.git
cd afterlife

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

### Deploy Contract (Optional)

```bash
# Arbitrum Sepolia
npx hardhat run scripts/deploy.js --network arbitrumSepolia

# Mantle Sepolia
npx hardhat run scripts/deploy.js --network mantleSepolia
```

---

## 📘 User Guide

### For Owners

1. **Connect Wallet** → Select network (Arbitrum or Mantle)
2. **Register** → Set inactivity threshold (e.g., 30 days)
3. **Add Guardians** → Trusted addresses to monitor you
4. **Add Beneficiaries** → Set allocations (must total ≤100%)
5. **Deposit Funds** → Transfer ETH/MNT to your vault
6. **Prove Life** → Click periodically to stay active

### For Guardians

1. **Enter Owner Address** → Monitor their status
2. **Wait for Threshold** → Inactivity timer must expire
3. **Confirm Inactivity** → Triggers inheritance process

### For Beneficiaries

1. **Enter Owner Address** → Check your allocation
2. **Wait for Execution** → Vesting must begin
3. **Claim Assets** → Withdraw your share based on vesting schedule

---

## 🌐 Network Configuration

### Add to MetaMask

<details>
<summary><b>Arbitrum Sepolia</b></summary>

| Setting | Value |
|---------|-------|
| Network Name | Arbitrum Sepolia |
| RPC URL | `https://sepolia-rollup.arbitrum.io/rpc` |
| Chain ID | `421614` |
| Currency | ETH |
| Explorer | `https://sepolia.arbiscan.io` |

</details>

<details>
<summary><b>Mantle Sepolia</b></summary>

| Setting | Value |
|---------|-------|
| Network Name | Mantle Sepolia Testnet |
| RPC URL | `https://rpc.sepolia.mantle.xyz` |
| Chain ID | `5003` |
| Currency | MNT |
| Explorer | `https://explorer.sepolia.mantle.xyz` |

</details>

### Faucets
- **Arbitrum Sepolia**: [Alchemy Faucet](https://www.alchemy.com/faucets/arbitrum-sepolia)
- **Mantle Sepolia**: [Mantle Faucet](https://faucet.sepolia.mantle.xyz)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for the decentralized future**

[⬆ Back to Top](#afterlife--temporal-asset-protocol-️)

</div>
