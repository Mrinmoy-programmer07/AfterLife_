import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { StellarWalletsKit, KitEventType } from '@creit.tech/stellar-wallets-kit';
import { initWalletsKit, STELLAR_NETWORK_PASSPHRASE } from '../services/stellarService';
import type { StellarAddress } from '../types';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface WalletContextValue {
  isConnected:     boolean;
  publicKey:       StellarAddress | null;
  isConnecting:    boolean;
  /** Opens the Stellar Wallets Kit auth modal */
  openModal:       () => Promise<void>;
  disconnect:      () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
}

// --------------------------------------------------------------------------
// Context
// --------------------------------------------------------------------------

const WalletContext = createContext<WalletContextValue | null>(null);

// --------------------------------------------------------------------------
// Provider
// --------------------------------------------------------------------------

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey,    setPublicKey]    = useState<StellarAddress | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialise the kit once + subscribe to state events
  useEffect(() => {
    initWalletsKit();

    const unsubState = StellarWalletsKit.on(KitEventType.STATE_UPDATED, (ev) => {
      const addr = (ev as any).payload?.address;
      if (addr) setPublicKey(addr);
    });

    const unsubDisconnect = StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
      setPublicKey(null);
    });

    // Restore session if wallet was previously connected
    StellarWalletsKit.getAddress()
      .then(({ address }) => { if (address) setPublicKey(address); })
      .catch(() => { /* not connected — ignore */ });

    return () => {
      unsubState();
      unsubDisconnect();
    };
  }, []);

  const openModal = useCallback(async () => {
    setIsConnecting(true);
    try {
      const { address } = await StellarWalletsKit.authModal();
      setPublicKey(address);
    } catch (err) {
      console.error('Wallet auth failed:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await StellarWalletsKit.disconnect();
    setPublicKey(null);
  }, []);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
      address: publicKey ?? undefined,
    });
    return signedTxXdr;
  }, [publicKey]);

  const value: WalletContextValue = {
    isConnected:  !!publicKey,
    publicKey,
    isConnecting,
    openModal,
    disconnect,
    signTransaction,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// --------------------------------------------------------------------------
// Hook
// --------------------------------------------------------------------------

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within <WalletProvider>');
  return ctx;
}
