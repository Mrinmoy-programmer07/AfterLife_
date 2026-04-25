import {
  Account,
  Contract,
  Operation,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import {
  SOROBAN_RPC_URL,
  HORIZON_URL,
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
// Contract instance (not network-bound — just encodes operations)
// --------------------------------------------------------------------------

const contract = new Contract(CONTRACT_ID);

// --------------------------------------------------------------------------
// Raw JSON-RPC helpers — completely bypass the stellar-sdk dual-package bug
// --------------------------------------------------------------------------

async function rpc<T = any>(method: string, params: object): Promise<T> {
  const res = await fetch(SOROBAN_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method} error: ${JSON.stringify(json.error)}`);
  return json.result as T;
}

// --------------------------------------------------------------------------
// Core transaction pipeline
// --------------------------------------------------------------------------

async function simulateAndAssemble(
  publicKey: string,
  operations: xdr.Operation[],
  signTransaction: (xdr: string) => Promise<string>
): Promise<string> {
  // 1. Fetch real account from Horizon for accurate sequence number
  const horizonRes = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
  if (!horizonRes.ok) throw new Error(`Failed to fetch account: ${horizonRes.status} — is your wallet funded?`);
  const acctRaw = await horizonRes.json();
  if (acctRaw.status === 404) throw new Error('Account not found on testnet — fund it with Friendbot first');
  const account = new Account(publicKey, acctRaw.sequence);

  // 2. Build initial simulation tx
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  });
  operations.forEach((op) => builder.addOperation(op));
  const tx = builder.setTimeout(60).build();

  // 3. Simulate via raw fetch (avoids Server instanceof bug)
  const simResult = await rpc<any>('simulateTransaction', { transaction: tx.toXDR() });

  if (simResult.error) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }
  if (!simResult.transactionData) {
    throw new Error('Simulation failed: missing transactionData in response');
  }

  // 4. Parse sim outputs manually from base64
  const rawAuths: string[] = simResult.results?.[0]?.auth ?? [];
  const parsedAuths = rawAuths.map((a: string) =>
    xdr.SorobanAuthorizationEntry.fromXDR(a, 'base64')
  );
  const sorobanData = xdr.SorobanTransactionData.fromXDR(simResult.transactionData, 'base64');
  const minResourceFee = parseInt(simResult.minResourceFee || '0');

  // 5. Assemble: rebuild tx with auth + soroban data + updated fee
  //    Use a fresh account with same sequence so builder increments to the correct value
  const freshAccount = new Account(publicKey, acctRaw.sequence);
  const assembledBuilder = new TransactionBuilder(freshAccount, {
    fee: (parseInt(BASE_FEE) + minResourceFee).toString(),
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  });

  for (const op of operations) {
    if (op.body().switch().value === xdr.OperationType.invokeHostFunction().value) {
      // Re-encode the operation with the auth entries from simulation
      const invokeOp = op.body().invokeHostFunctionOp();
      const authToUse = parsedAuths.length > 0 ? parsedAuths : invokeOp.auth();
      assembledBuilder.addOperation(
        Operation.invokeHostFunction({
          func: invokeOp.hostFunction(),
          auth: authToUse,
        })
      );
    } else {
      assembledBuilder.addOperation(op);
    }
  }

  assembledBuilder.setTimeout(60);
  assembledBuilder.setSorobanData(sorobanData);

  const prepared = assembledBuilder.build();

  // 6. Sign via wallet
  const signedXdr = await signTransaction(prepared.toXDR());
  return signedXdr;
}

async function submitAndWait(signedXdr: string): Promise<xdr.ScVal | null> {
  // Send
  const sendResult = await rpc<any>('sendTransaction', { transaction: signedXdr });

  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(sendResult)}`);
  }

  const hash: string = sendResult.hash;
  if (!hash) throw new Error('No tx hash returned from sendTransaction');

  // Poll for confirmation
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const getResult = await rpc<any>('getTransaction', { hash });
    const status: string = getResult?.status ?? '';

    if (status === 'SUCCESS') {
      if (getResult.resultMetaXdr) {
        try {
          const meta = xdr.TransactionMeta.fromXDR(getResult.resultMetaXdr, 'base64');
          const sorobanMeta = meta.v3()?.sorobanMeta();
          return sorobanMeta?.returnValue() ?? null;
        } catch {
          return null;
        }
      }
      return null;
    }
    if (status === 'FAILED') {
      throw new Error(`Transaction failed: ${JSON.stringify(getResult)}`);
    }
    // NOT_FOUND or still processing — keep polling
  }
  throw new Error('Transaction confirmation timed out');
}

// --------------------------------------------------------------------------
// Read-only queries — use a zero-sequence offline account for simulation
// (no real account lookup needed — node ignores source for simulate)
// --------------------------------------------------------------------------

async function queryContract(method: string, args: xdr.ScVal[]): Promise<xdr.ScVal | null> {
  try {
    const op = contract.call(method, ...args);
    // Use a well-known valid throwaway public key for simulation
    const account = new Account('GDHQ64IEY54IROCR5PVATOWVOMRJJ4XU33EXLDFPE3KPDXLDIUFLVSGH', '0');
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(10)
      .build();

    const simResult = await rpc<any>('simulateTransaction', { transaction: tx.toXDR() });

    if (simResult.error || !simResult.results || !simResult.results[0]?.xdr) {
      return null;
    }

    return xdr.ScVal.fromXDR(simResult.results[0].xdr, 'base64');
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// ScVal → TypeScript converters
// --------------------------------------------------------------------------

function scValToProtocol(val: xdr.ScVal): Protocol | null {
  try {
    const map = scValToNative(val) as Record<string, any>;
    return {
      isRegistered:               Boolean(map['is_registered']),
      lastHeartbeatLedger:        Number(map['last_heartbeat_ledger']),
      inactivityThresholdLedgers: Number(map['inactivity_threshold_ledgers']),
      isDead:                     Boolean(map['is_dead']),
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
    isFixed: Boolean(val['is_fixed']),
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
// Hook
// --------------------------------------------------------------------------

export function useAfterLifeContract() {
  const { publicKey, signTransaction } = useWallet();

  // ---- Core executor ----

  const execTx = useCallback(
    async (method: string, args: xdr.ScVal[]) => {
      if (!publicKey) throw new Error('Wallet not connected');
      const op = contract.call(method, ...args);
      const signedXdr = await simulateAndAssemble(publicKey, [op], signTransaction);
      return submitAndWait(signedXdr);
    },
    [publicKey, signTransaction]
  );

  // ---- View functions ----

  const getProtocol = useCallback(async (owner: string): Promise<Protocol | null> => {
    const val = await queryContract('get_protocol', [
      nativeToScVal(Address.fromString(owner), { type: 'address' }),
    ]);
    if (!val) return null;
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

  // Get current ledger number
  const getCurrentLedger = useCallback(async (): Promise<number> => {
    try {
      const result = await rpc<any>('getLatestLedger', {});
      return result.sequence ?? 0;
    } catch { return 0; }
  }, []);

  // ---- Mutating functions ----

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

  const updateThreshold = useCallback(async (thresholdLedgers: number) => {
    if (!publicKey) throw new Error('Wallet not connected');
    return execTx('update_threshold', [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }),
      nativeToScVal(thresholdLedgers, { type: 'u32' }),
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

  return {
    // Views
    getProtocol, getGuardians, getBeneficiaries,
    getBalance, isRegistered, getClaimable, getReviveStatus,
    getCurrentLedger,
    // Mutations
    register, proveLife,
    addGuardian, removeGuardian, setGuardianFixed,
    addBeneficiary, removeBeneficiary,
    deposit, withdraw, updateThreshold,
    confirmInactivity, claim,
  };
}
