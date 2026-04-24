import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';

// --------------------------------------------------------------------------
// Stellar Testnet Configuration
// --------------------------------------------------------------------------

export const STELLAR_NETWORK_PASSPHRASE = Networks.TESTNET;
export const SOROBAN_RPC_URL    = 'https://soroban-testnet.stellar.org';
export const HORIZON_URL        = 'https://horizon-testnet.stellar.org';

// Replace with your deployed contract address after: stellar contract deploy
export const CONTRACT_ID     = (import.meta as any).env?.VITE_CONTRACT_ID     ?? 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';
// Native XLM Stellar Asset Contract on testnet
export const NATIVE_TOKEN_ID = (import.meta as any).env?.VITE_NATIVE_TOKEN_ID ?? 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN3';
// Platform treasury
export const PLATFORM_WALLET = (import.meta as any).env?.VITE_PLATFORM_WALLET ?? '';

// --------------------------------------------------------------------------
// Stellar Wallets Kit V2 — static init (call once at app start)
// --------------------------------------------------------------------------

let initialized = false;

export function initWalletsKit(): void {
  if (initialized) return;
  StellarWalletsKit.init({
    modules: defaultModules(),
    network: STELLAR_NETWORK_PASSPHRASE,
  });
  initialized = true;
}

// --------------------------------------------------------------------------
// Utility helpers
// --------------------------------------------------------------------------

export function isValidStellarAddress(addr: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(addr);
}

export function isValidContractAddress(addr: string): boolean {
  return /^C[A-Z2-7]{55}$/.test(addr);
}

/** Format stroops to XLM string with given decimal places */
export function formatXlm(stroops: bigint, decimals = 4): string {
  const xlm = Number(stroops) / 10_000_000;
  return xlm.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

/** Parse XLM amount string to stroops bigint */
export function parseXlm(xlm: string): bigint {
  const n = parseFloat(xlm.replace(/,/g, ''));
  if (isNaN(n) || n < 0) return 0n;
  return BigInt(Math.round(n * 10_000_000));
}

/** Ledgers to human-readable time */
export function ledgersToTime(ledgers: number): string {
  const seconds = ledgers * 5;
  if (seconds < 3600)   return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400)  return `${Math.round(seconds / 3600)} hr`;
  if (seconds < 604800) return `${Math.round(seconds / 86400)} day${Math.round(seconds / 86400) !== 1 ? 's' : ''}`;
  return `${Math.round(seconds / 604800)} week${Math.round(seconds / 604800) !== 1 ? 's' : ''}`;
}

/** Days to ledgers */
export function daysToLedgers(days: number): number {
  return Math.round(days * 86400 / 5);
}

/** Truncate Stellar G... address */
export function truncate(addr: string, chars = 6): string {
  if (!addr || addr.length < chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}
