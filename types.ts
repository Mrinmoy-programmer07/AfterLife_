export enum UserRole {
  NONE = 'NONE',
  OWNER = 'OWNER',
  GUARDIAN = 'GUARDIAN',
  BENEFICIARY = 'BENEFICIARY',
}

export enum ProtocolState {
  ACTIVE = 'ACTIVE',         // Owner is alive, routine monitoring
  WARNING = 'WARNING',       // Near inactivity threshold
  PENDING = 'PENDING',       // Inactivity met, awaiting guardian
  EXECUTING = 'EXECUTING',   // Progressive vesting active
  COMPLETED = 'COMPLETED',   // All assets transferred
}

export interface AssetState {
  id: string;
  name: string;
  value: string; // Display string like "45.2 ETH"
  status: 'LOCKED' | 'VESTING' | 'UNLOCKED';
  unlockDate: number; // Timestamp
}

export interface Guardian {
  address: string;
  name: string;
  isConfirmed: boolean;
  lastActive?: number; // Timestamp of last check
}

export enum VestingType {
  LINEAR = 'LINEAR',
  CLIFF = 'CLIFF',
}

export interface Beneficiary {
  address: string;
  name: string;
  allocation: number; // Percentage (0-100)
  amountClaimed: string; // Display string
  vestingType?: VestingType;
  vestingDuration?: number; // Seconds
}

export interface ProtocolEvent {
  id: string;
  timestamp: number;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface ProtocolContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  state: ProtocolState;
  setState: (state: ProtocolState) => void;
  ownerAddress: string;
  vaultBalance: bigint; // Snapshot at time of death
  currentVaultBalance: bigint; // Live balance for Owner
  walletBalance: string; // Balance in MetaMask
  lastHeartbeat: number;
  inactivityThreshold: number; // In milliseconds
  proveLife: () => void;
  confirmInactivity: () => void;
  assets: AssetState[];
  guardians: Guardian[];
  beneficiaries: Beneficiary[];
  addGuardian: (guardian: Guardian) => void;
  removeGuardian: (address: string) => void;
  addBeneficiary: (beneficiary: Beneficiary) => void;
  removeBeneficiary: (address: string) => void;
  updateBeneficiaryAllocation: (address: string, newAllocation: number) => void;
  vestingProgress: number; // 0 to 100
  elapsedTime: number; // Global clock for animations
  claimBeneficiaryShare: (address: string) => Promise<void>;
  events: ProtocolEvent[];
  addEvent: (message: string, type?: 'INFO' | 'WARNING' | 'CRITICAL') => void;
}
