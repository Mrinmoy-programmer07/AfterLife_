// ============================================
// AfterLife Protocol - Chain Context Provider
// ============================================
// Manages the selected blockchain network and provides
// chain-aware context to the entire application.

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import {
    SUPPORTED_CHAINS,
    CHAIN_METADATA,
    CONTRACT_ADDRESSES,
    ChainInfo,
    SupportedChainId,
    isSupportedChain,
    getDefaultChainId
} from '../config/chainConfig';

// --- Storage Key ---
const STORAGE_KEY = 'afterlife_selected_chain';

// --- Context Type ---
interface ChainContextType {
    // Current Selection
    selectedChainId: SupportedChainId;
    setSelectedChainId: (chainId: SupportedChainId) => void;

    // Derived Values
    contractAddress: string;
    chainInfo: ChainInfo;

    // Wallet State
    isCorrectChain: boolean;
    walletChainId: number | undefined;

    // Actions
    switchToSelectedChain: () => Promise<void>;

    // Loading States
    isSwitching: boolean;
    switchError: string | null;
}

// --- Context ---
const ChainContext = createContext<ChainContextType | null>(null);

// --- Provider Props ---
interface ChainProviderProps {
    children: ReactNode;
}

// --- Provider Component ---
export const ChainProvider: React.FC<ChainProviderProps> = ({ children }) => {
    // Read initial chain from localStorage or default
    const getInitialChain = (): SupportedChainId => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = parseInt(stored, 10);
                if (isSupportedChain(parsed)) {
                    return parsed;
                }
            }
        }
        return getDefaultChainId();
    };

    const [selectedChainId, setSelectedChainIdInternal] = useState<SupportedChainId>(getInitialChain);
    const [isSwitching, setIsSwitching] = useState(false);
    const [switchError, setSwitchError] = useState<string | null>(null);

    // Wagmi hooks
    const { chain: walletChain } = useAccount();
    const { switchChainAsync } = useSwitchChain();

    // Derived values
    const walletChainId = walletChain?.id;
    const isCorrectChain = walletChainId === selectedChainId;
    const contractAddress = CONTRACT_ADDRESSES[selectedChainId];
    const chainInfo = CHAIN_METADATA[selectedChainId];

    // Persist chain selection to localStorage
    const setSelectedChainId = useCallback((chainId: SupportedChainId) => {
        setSelectedChainIdInternal(chainId);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, chainId.toString());
        }
        setSwitchError(null);
    }, []);

    // Switch wallet to the selected chain
    const switchToSelectedChain = useCallback(async () => {
        if (isCorrectChain) return;

        setIsSwitching(true);
        setSwitchError(null);

        try {
            await switchChainAsync({ chainId: selectedChainId });
        } catch (err: any) {
            const message = err.shortMessage || err.message || 'Failed to switch network';
            setSwitchError(message);
            console.error('Chain switch failed:', err);
            throw err;
        } finally {
            setIsSwitching(false);
        }
    }, [isCorrectChain, selectedChainId, switchChainAsync]);

    // Auto-sync: when wallet chain changes, update UI if it's a supported chain
    useEffect(() => {
        if (walletChainId && isSupportedChain(walletChainId)) {
            // Wallet switched to a supported chain, sync the UI selection
            setSelectedChainId(walletChainId);
        }
    }, [walletChainId, setSelectedChainId]);

    const value: ChainContextType = {
        selectedChainId,
        setSelectedChainId,
        contractAddress,
        chainInfo,
        isCorrectChain,
        walletChainId,
        switchToSelectedChain,
        isSwitching,
        switchError,
    };

    return (
        <ChainContext.Provider value={value}>
            {children}
        </ChainContext.Provider>
    );
};

// --- Hook ---
export const useChain = (): ChainContextType => {
    const context = useContext(ChainContext);
    if (!context) {
        throw new Error('useChain must be used within a ChainProvider');
    }
    return context;
};

// --- Utility Hook: Get all supported chains for UI ---
export const useSupportedChains = (): ChainInfo[] => {
    return Object.values(CHAIN_METADATA);
};
