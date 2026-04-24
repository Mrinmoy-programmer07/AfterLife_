// ============================================================
// AfterLife V2 — TypeScript Types (Stellar Edition)
// ============================================================

export type StellarAddress = string; // G... public key

// ------------------------------------------------------------------
// Protocol State Machine
// ------------------------------------------------------------------

export enum ProtocolState {
  ACTIVE    = 'ACTIVE',
  WARNING   = 'WARNING',
  PENDING   = 'PENDING',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
}

export enum UserRole {
  NONE        = 'NONE',
  OWNER       = 'OWNER',
  GUARDIAN    = 'GUARDIAN',
  BENEFICIARY = 'BENEFICIARY',
}

export enum VestingType {
  LINEAR = 'Linear',
  CLIFF  = 'Cliff',
}

// ------------------------------------------------------------------
// On-chain entities (mirrors Rust structs)
// ------------------------------------------------------------------

export interface Protocol {
  isRegistered:               boolean;
  lastHeartbeatLedger:        number;
  inactivityThresholdLedgers: number;
  isDead:                     boolean;
  initialVaultBalance:        bigint; // stroops
  vestingStartLedger:         number;
  totalAllocationBps:         number;
  deathDeclarationLedger:     number;
}

export interface Guardian {
  name:    string;
  wallet:  StellarAddress;
  isFixed: boolean;
}

export interface Beneficiary {
  name:                  string;
  wallet:                StellarAddress;
  allocationBps:         number;   // basis points: 5000 = 50%
  amountClaimed:         bigint;   // stroops
  vestingType:           VestingType;
  vestingDurationLedgers: number;
}

export interface ClaimInfo {
  claimable:        bigint;
  totalEntitlement: bigint;
  alreadyClaimed:   bigint;
  vestedAmount:     bigint;
}

// ------------------------------------------------------------------
// UI State
// ------------------------------------------------------------------

export interface ProtocolEvent {
  id:        string;
  timestamp: number;
  message:   string;
  type:      'INFO' | 'WARNING' | 'CRITICAL';
}

// ------------------------------------------------------------------
// Context / Store types
// ------------------------------------------------------------------

export interface WalletState {
  isConnected:   boolean;
  publicKey:     StellarAddress | null;
  walletName:    string | null;
  connect:       () => Promise<void>;
  disconnect:    () => void;
  signTransaction: (xdr: string) => Promise<string>;
}

export interface AppState {
  // Role & routing
  role:        UserRole;
  setRole:     (role: UserRole) => void;

  // Protocol data
  protocol:         Protocol | null;
  guardians:        Guardian[];
  beneficiaries:    Beneficiary[];
  ownerAddress:     StellarAddress;
  setOwnerAddress:  (addr: StellarAddress) => void;
  targetOwner:      StellarAddress;
  setTargetOwner:   (addr: StellarAddress) => void;

  // Derived state
  protocolState:    ProtocolState;
  currentLedger:    number;
  vaultBalance:     bigint;
  claimInfo:        ClaimInfo | null;

  // Event Log
  events:    ProtocolEvent[];
  addEvent:  (msg: string, type?: ProtocolEvent['type']) => void;

  // Loading / refresh
  isLoading:      boolean;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

// ------------------------------------------------------------------
// Utility
// ------------------------------------------------------------------

export const STROOPS_PER_XLM = 10_000_000n;

export function stroopsToXlm(stroops: bigint): string {
  const whole = stroops / STROOPS_PER_XLM;
  const frac  = stroops % STROOPS_PER_XLM;
  const fracStr = frac.toString().padStart(7, '0').slice(0, 2);
  return `${whole}.${fracStr}`;
}

export function xlmToStroops(xlm: string): bigint {
  const n = parseFloat(xlm);
  return BigInt(Math.round(n * 10_000_000));
}

/** 1 ledger ≈ 5 seconds on Stellar mainnet/testnet */
export const SECONDS_PER_LEDGER = 5;

export function ledgersToDays(ledgers: number): number {
  return Math.round(ledgers * SECONDS_PER_LEDGER / 86_400);
}

export function daysToLedgers(days: number): number {
  return Math.round(days * 86_400 / SECONDS_PER_LEDGER);
}

export function truncateAddress(addr: string, chars = 6): string {
  if (!addr || addr.length < chars * 2) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}
