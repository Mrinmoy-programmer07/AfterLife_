import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import {
  Server,
  Api,
  assembleTransaction,
} from '@stellar/stellar-sdk/rpc';
import {
  SOROBAN_RPC_URL,
  CONTRACT_ID,
  STELLAR_NETWORK_PASSPHRASE,
} from '../services/stellarService';
import type {
  Protocol,
  Guardian,
  Beneficiary,
  ClaimInfo,
} from '../types';
import { VestingType } from '../types';
import { useWallet } from '../contexts/WalletContext';
import { useCallback } from 'react';

// --------------------------------------------------------------------------
// Soroban RPC Server
// --------------------------------------------------------------------------

const server = new Server(SOROBAN_RPC_URL, { allowHttp: false });
const contract = new Contract(CONTRACT_ID);

// --------------------------------------------------------------------------
// Low-level helpers
// --------------------------------------------------------------------------

async function simulateAndAssemble(
  publicKey: string,
  operations: xdr.Operation[],
  signTransaction: (xdr: string) => Promise<string>
): Promise<Api.SendTransactionResponse> {
  const account = await server.getAccount(publicKey);

  let builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  });
  operations.forEach((op) => builder.addOperation(op));
  const tx = builder.setTimeout(60).build();

  // Simulate
  const simResult = await server.simulateTransaction(tx);
  if (Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${(simResult as any).error}`);
  }

  // Assemble & sign
  const prepared = assembleTransaction(tx, simResult).build();
  const signedXdr = await signTransaction(prepared.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, STELLAR_NETWORK_PASSPHRASE);

  // Submit
  return server.sendTransaction(signedTx);
}

async function waitForResult(
  response: Api.SendTransactionResponse
): Promise<xdr.ScVal | null> {
  if ((response as any).status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(response)}`);
  }

  const hash = (response as any).hash;
  let getResp: any = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    getResp = await server.getTransaction(hash);
    const st = getResp?.status ?? '';
    if (st !== 'NOT_FOUND' && st !== 'PENDING') break;
  }

  if (getResp?.status === 'SUCCESS') {
    return getResp.returnValue ?? null;
  }
  if (getResp?.status === 'FAILED') {
    throw new Error(`Transaction failed: ${JSON.stringify(getResp)}`);
  }
  return null;
}

// --------------------------------------------------------------------------
// ScVal → TypeScript converters
// --------------------------------------------------------------------------

function scValToProtocol(val: xdr.ScVal): Protocol | null {
  try {
    const map = scValToNative(val) as Record<string, any>;
    return {
      isRegistered:               map['is_registered'],
      lastHeartbeatLedger:        Number(map['last_heartbeat_ledger']),
      inactivityThresholdLedgers: Number(map['inactivity_threshold_ledgers']),
      isDead:                     map['is_dead'],
      initialVaultBalance:        BigInt(map['initial_vault_balance'] ?? 0),
      vestingStartLedger:         Number(map['vesting_start_ledger']),
      totalAllocationBps:         Number(map['total_allocation_bps']),
      deathDeclarationLedger:     Number(map['death_declaration_ledger']),
    };
  } catch {
    return null;
  }
}

function scValToGuardian(val: any): Guardian {
  return {
    name:    val['name'],
    wallet:  val['wallet'],
    isFixed: val['is_fixed'],
  };
}

function scValToBeneficiary(val: any): Beneficiary {
  const vtRaw = val['vesting_type'];
  return {
    name:                  val['name'],
    wallet:                val['wallet'],
    allocationBps:         Number(val['allocation_bps']),
    amountClaimed:         BigInt(val['amount_claimed'] ?? 0),
    vestingType:           vtRaw === 'Linear' ? VestingType.LINEAR : VestingType.CLIFF,
    vestingDurationLedgers: Number(val['vesting_duration_ledgers']),
  };
}

// --------------------------------------------------------------------------
// Read-only queries (no signature needed)
// --------------------------------------------------------------------------

async function queryContract(method: string, args: xdr.ScVal[]): Promise<xdr.ScVal | null> {
  try {
    const op = contract.call(method, ...args);
    const account = await server.getAccount(
      'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN' // throwaway for simulation
    );
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(10)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (Api.isSimulationError(sim)) return null;
    return (sim as any).result?.retval ?? null;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// Hook
// --------------------------------------------------------------------------

export function useAfterLifeContract() {
  const { publicKey, signTransaction } = useWallet();

  // ---- View functions ----

  const getProtocol = useCallback(async (owner: string): Promise<Protocol | null> => {
    const val = await queryContract('get_protocol', [
      nativeToScVal(Address.fromString(owner), { type: 'address' }),
    ]);
    if (!val) return null;
    // Option<Protocol>: if Some, unwrap
    try {
      const native = scValToNative(val);
      if (!native) return null;
      return scValToProtocol(val);
    } catch {
      return null;
    }
  }, []);

  const getGuardians = useCallback(async (owner: string): Promise<Guardian[]> => {
    const val = await queryContract('get_guardians', [
      nativeToScVal(Address.fromString(owner), { type: 'address' }),
    ]);
    if (!val) return [];
    try {
      const arr = scValToNative(val) as any[];
      return arr.map(scValToGuardian);
    } catch {
      return [];
    }
  }, []);

  const getBeneficiaries = useCallback(async (owner: string): Promise<Beneficiary[]> => {
    const val = await queryContract('get_beneficiaries', [
      nativeToScVal(Address.fromString(owner), { type: 'address' }),
    ]);
    if (!val) return [];
    try {
      const arr = scValToNative(val) as any[];
      return arr.map(scValToBeneficiary);
    } catch {
      return [];
    }
  }, []);

  const getBalance = useCallback(async (owner: string): Promise<bigint> => {
    const val = await queryContract('get_balance', [
      nativeToScVal(Address.fromString(owner), { type: 'address' }),
    ]);
    if (!val) return 0n;
    try { return BigInt(scValToNative(val) as number); } catch { return 0n; }
  }, []);

  const isRegistered = useCallback(async (owner: string): Promise<boolean> => {
    const val = await queryContract('is_registered', [
      nativeToScVal(Address.fromString(owner), { type: 'address' }),
    ]);
    if (!val) return false;
    try { return Boolean(scValToNative(val)); } catch { return false; }
  }, []);

  const getClaimable = useCallback(async (owner: string, beneficiary: string): Promise<ClaimInfo | null> => {
    const val = await queryContract('get_claimable', [
      nativeToScVal(Address.fromString(owner), { type: 'address' }),
      nativeToScVal(Address.fromString(beneficiary), { type: 'address' }),
    ]);
    if (!val) return null;
    try {
      const m = scValToNative(val) as Record<string, any>;
      return {
        claimable:        BigInt(m['claimable'] ?? 0),
        totalEntitlement: BigInt(m['total_entitlement'] ?? 0),
        alreadyClaimed:   BigInt(m['already_claimed'] ?? 0),
        vestedAmount:     BigInt(m['vested_amount'] ?? 0),
      };
    } catch { return null; }
  }, []);

  const getReviveStatus = useCallback(async (owner: string): Promise<{ canRevive: boolean; ledgersRemaining: number }> => {
    const val = await queryContract('get_revive_status', [
      nativeToScVal(Address.fromString(owner), { type: 'address' }),
    ]);
    if (!val) return { canRevive: false, ledgersRemaining: 0 };
    try {
      const arr = scValToNative(val) as [boolean, number];
      return { canRevive: arr[0], ledgersRemaining: Number(arr[1]) };
    } catch { return { canRevive: false, ledgersRemaining: 0 }; }
  }, []);

  // ---- Mutating functions ----

  const execTx = useCallback(
    async (method: string, args: xdr.ScVal[]) => {
      if (!publicKey) throw new Error('Wallet not connected');
      const op = contract.call(method, ...args);
      const resp = await simulateAndAssemble(publicKey, [op], signTransaction);
      return waitForResult(resp);
    },
    [publicKey, signTransaction]
  );

  const register = useCallback(async (thresholdLedgers: number) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('register', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(thresholdLedgers, { type: 'u32' }),
    ]);
  }, [publicKey, execTx]);

  const proveLife = useCallback(async () => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('prove_life', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
    ]);
  }, [publicKey, execTx]);

  const addGuardian = useCallback(async (name: string, wallet: string) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('add_guardian', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(name, { type: 'string' }),
      nativeToScVal(Address.fromString(wallet), { type: 'address' }),
    ]);
  }, [publicKey, execTx]);

  const removeGuardian = useCallback(async (wallet: string) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('remove_guardian', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(Address.fromString(wallet), { type: 'address' }),
    ]);
  }, [publicKey, execTx]);

  const setGuardianFixed = useCallback(async (wallet: string, fixed: boolean) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('set_guardian_fixed', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(Address.fromString(wallet), { type: 'address' }),
      nativeToScVal(fixed, { type: 'bool' }),
    ]);
  }, [publicKey, execTx]);

  const addBeneficiary = useCallback(async (
    name: string, wallet: string,
    allocationBps: number, vestingType: VestingType, durationLedgers: number
  ) => {
    if (!publicKey) throw new Error('Wallet not connected');
    const vtVal = vestingType === VestingType.LINEAR
      ? xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Linear')])
      : xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Cliff')]);
    return execTx('add_beneficiary', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(name, { type: 'string' }),
      nativeToScVal(Address.fromString(wallet), { type: 'address' }),
      nativeToScVal(allocationBps, { type: 'u32' }),
      vtVal,
      nativeToScVal(durationLedgers, { type: 'u32' }),
    ]);
  }, [publicKey, execTx]);

  const removeBeneficiary = useCallback(async (wallet: string) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('remove_beneficiary', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(Address.fromString(wallet), { type: 'address' }),
    ]);
  }, [publicKey, execTx]);

  const deposit = useCallback(async (stroops: bigint) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('deposit', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(stroops, { type: 'i128' }),
    ]);
  }, [publicKey, execTx]);

  const withdraw = useCallback(async (stroops: bigint) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('withdraw', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(stroops, { type: 'i128' }),
    ]);
  }, [publicKey, execTx]);

  const confirmInactivity = useCallback(async (ownerAddress: string) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('confirm_inactivity', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(Address.fromString(ownerAddress), { type: 'address' }),
    ]);
  }, [publicKey, execTx]);

  const claim = useCallback(async (ownerAddress: string) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('claim', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(Address.fromString(ownerAddress), { type: 'address' }),
    ]);
  }, [publicKey, execTx]);

  const updateThreshold = useCallback(async (thresholdLedgers: number) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('update_threshold', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(thresholdLedgers, { type: 'u32' }),
    ]);
  }, [publicKey, execTx]);

  return {
    // Views
    getProtocol, getGuardians, getBeneficiaries,
    getBalance, isRegistered, getClaimable, getReviveStatus,
    // Mutations
    register, proveLife,
    addGuardian, removeGuardian, setGuardianFixed,
    addBeneficiary, removeBeneficiary,
    deposit, withdraw, updateThreshold,
    confirmInactivity, claim,
  };
}

