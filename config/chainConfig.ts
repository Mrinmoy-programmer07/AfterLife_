// ============================================
// AfterLife Protocol - Multi-Chain Configuration
// ============================================

import { arbitrumSepolia, mantleSepoliaTestnet } from 'wagmi/chains';

// --- Supported Chain IDs ---
export const SUPPORTED_CHAINS = {
    ARBITRUM_SEPOLIA: 421614,
    MANTLE_SEPOLIA: 5003,
} as const;

export type SupportedChainId = (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS];

// --- Chain Info Type ---
export interface ChainInfo {
    id: number;
    name: string;
    shortName: string;
    icon: string;
    color: string;
    explorer: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrl: string;
    wagmiChain: typeof arbitrumSepolia | typeof mantleSepoliaTestnet;
}

// --- Contract Addresses per Chain ---
// Updated: 2026-01-11 (Grace period check removed from getClaimableAmount)
export const CONTRACT_ADDRESSES: Record<SupportedChainId, string> = {
    [SUPPORTED_CHAINS.ARBITRUM_SEPOLIA]: "0x6D2Bd7091CE36F15C944AB99c4cfc8833c2B8957",
    [SUPPORTED_CHAINS.MANTLE_SEPOLIA]: "0xe04250cE4a9A2362eaC92B2BaA3E16E3691EBcE9",
};

// --- Chain Metadata for UI ---
export const CHAIN_METADATA: Record<SupportedChainId, ChainInfo> = {
    [SUPPORTED_CHAINS.ARBITRUM_SEPOLIA]: {
        id: SUPPORTED_CHAINS.ARBITRUM_SEPOLIA,
        name: "Arbitrum Sepolia",
        shortName: "Arbitrum",
        icon: "⬡", // Unicode icon as placeholder, can replace with SVG path
        color: "#12AAFF",
        explorer: "https://sepolia.arbiscan.io",
        nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18,
        },
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
        wagmiChain: arbitrumSepolia,
    },
    [SUPPORTED_CHAINS.MANTLE_SEPOLIA]: {
        id: SUPPORTED_CHAINS.MANTLE_SEPOLIA,
        name: "Mantle Sepolia",
        shortName: "Mantle",
        icon: "◈", // Unicode icon as placeholder
        color: "#65B3AE",
        explorer: "https://explorer.sepolia.mantle.xyz",
        nativeCurrency: {
            name: "Mantle",
            symbol: "MNT",
            decimals: 18,
        },
        rpcUrl: "https://rpc.sepolia.mantle.xyz",
        wagmiChain: mantleSepoliaTestnet,
    },
};

// --- Helper Functions ---

export const getChainInfo = (chainId: number): ChainInfo | undefined => {
    return CHAIN_METADATA[chainId as SupportedChainId];
};

export const getContractAddress = (chainId: number): string => {
    return CONTRACT_ADDRESSES[chainId as SupportedChainId] || "";
};

export const isSupportedChain = (chainId: number): chainId is SupportedChainId => {
    return Object.values(SUPPORTED_CHAINS).includes(chainId as SupportedChainId);
};

export const getSupportedChainIds = (): SupportedChainId[] => {
    return Object.values(SUPPORTED_CHAINS);
};

export const getDefaultChainId = (): SupportedChainId => {
    return SUPPORTED_CHAINS.ARBITRUM_SEPOLIA;
};
