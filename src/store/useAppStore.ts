import { create } from 'zustand';
import {
  UserRole, ProtocolState, Protocol, Guardian, Beneficiary,
  ClaimInfo, ProtocolEvent, StellarAddress,
} from '../types';

// --------------------------------------------------------------------------
// Store shape
// --------------------------------------------------------------------------

interface AppStore {
  // Role & routing
  role:       UserRole;
  setRole:    (role: UserRole) => void;

  // Owner / target
  ownerAddress:    StellarAddress;
  setOwnerAddress: (a: StellarAddress) => void;
  targetOwner:     StellarAddress;
  setTargetOwner:  (a: StellarAddress) => void;

  // Protocol data (fetched from chain)
  protocol:     Protocol | null;
  setProtocol:  (p: Protocol | null) => void;
  guardians:    Guardian[];
  setGuardians: (g: Guardian[]) => void;
  beneficiaries:    Beneficiary[];
  setBeneficiaries: (b: Beneficiary[]) => void;
  vaultBalance:    bigint;
  setVaultBalance: (v: bigint) => void;
  claimInfo:    ClaimInfo | null;
  setClaimInfo: (c: ClaimInfo | null) => void;

  // Ledger
  currentLedger:    number;
  setCurrentLedger: (l: number) => void;

  // Derived protocol state (computed from chain data)
  protocolState: ProtocolState;
  setProtocolState: (s: ProtocolState) => void;

  // Event log
  events:   ProtocolEvent[];
  addEvent: (msg: string, type?: ProtocolEvent['type']) => void;
  clearEvents: () => void;

  // Loading
  isLoading:      boolean;
  setIsLoading:   (v: boolean) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

// --------------------------------------------------------------------------
// Store
// --------------------------------------------------------------------------

export const useAppStore = create<AppStore>((set) => ({
  role:       UserRole.NONE,
  setRole:    (role) => set({ role }),

  ownerAddress:    '',
  setOwnerAddress: (a) => set({ ownerAddress: a }),
  targetOwner:     '',
  setTargetOwner:  (a) => set({ targetOwner: a }),

  protocol:     null,
  setProtocol:  (p) => set({ protocol: p }),
  guardians:    [],
  setGuardians: (g) => set({ guardians: g }),
  beneficiaries:    [],
  setBeneficiaries: (b) => set({ beneficiaries: b }),
  vaultBalance:    0n,
  setVaultBalance: (v) => set({ vaultBalance: v }),
  claimInfo:    null,
  setClaimInfo: (c) => set({ claimInfo: c }),

  currentLedger:    0,
  setCurrentLedger: (l) => set({ currentLedger: l }),

  protocolState: ProtocolState.ACTIVE,
  setProtocolState: (s) => set({ protocolState: s }),

  events: [
    {
      id: 'init',
      timestamp: Date.now(),
      message: 'AfterLife V2 interface initialized on Stellar Testnet.',
      type: 'INFO',
    },
  ],
  addEvent: (msg, type = 'INFO') =>
    set((state) => ({
      events: [
        ...state.events,
        { id: Math.random().toString(36).slice(2), timestamp: Date.now(), message: msg, type },
      ],
    })),
  clearEvents: () => set({ events: [] }),

  isLoading:    false,
  setIsLoading: (v) => set({ isLoading: v }),
  refreshTrigger: 0,
  triggerRefresh: () => set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
}));
