import React from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { arbitrumSepolia, mantleSepoliaTestnet } from 'wagmi/chains';
import { useChain } from '../../contexts/ChainContext';
import { CHAIN_METADATA, SUPPORTED_CHAINS, SupportedChainId } from '../../config/chainConfig';

const NetworkSwitcher: React.FC = () => {
    const walletChainId = useChainId();
    const { switchChainAsync } = useSwitchChain();
    const { selectedChainId, setSelectedChainId, chainInfo } = useChain();
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSwitching, setIsSwitching] = React.useState(false);

    // Chain options with metadata
    const chains = [
        {
            id: SUPPORTED_CHAINS.ARBITRUM_SEPOLIA,
            name: CHAIN_METADATA[SUPPORTED_CHAINS.ARBITRUM_SEPOLIA].name,
            shortName: CHAIN_METADATA[SUPPORTED_CHAINS.ARBITRUM_SEPOLIA].shortName,
            color: 'bg-blue-500',
            icon: '⬡'
        },
        {
            id: SUPPORTED_CHAINS.MANTLE_SEPOLIA,
            name: CHAIN_METADATA[SUPPORTED_CHAINS.MANTLE_SEPOLIA].name,
            shortName: CHAIN_METADATA[SUPPORTED_CHAINS.MANTLE_SEPOLIA].shortName,
            color: 'bg-teal-500',
            icon: '◈'
        },
    ];

    const activeChain = chains.find(c => c.id === selectedChainId) || chains[0];

    // Auto-switch: When user selects a chain, automatically switch wallet network
    const handleChainSelect = async (chainId: SupportedChainId) => {
        setIsOpen(false);

        if (chainId === selectedChainId) return;

        setIsSwitching(true);
        try {
            // First update the app's selected chain
            setSelectedChainId(chainId);

            // Then automatically switch the wallet network
            await switchChainAsync({ chainId });
        } catch (err) {
            console.error('Failed to switch network:', err);
            // The context will handle the mismatch
        } finally {
            setIsSwitching(false);
        }
    };

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isSwitching}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors text-xs text-stone-300 disabled:opacity-50"
            >
                {isSwitching ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <div className={`w-2 h-2 rounded-full ${activeChain.color}`} />
                )}
                <span>{activeChain.shortName}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-stone-900 border border-white/10 rounded-lg overflow-hidden shadow-xl"
                    >
                        {chains.map((chain) => (
                            <button
                                key={chain.id}
                                onClick={() => handleChainSelect(chain.id)}
                                className="w-full flex items-center justify-between px-4 py-3 text-sm text-stone-300 hover:bg-white/5 hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-base">{chain.icon}</span>
                                    <div className={`w-2 h-2 rounded-full ${chain.color}`} />
                                    {chain.name}
                                </div>
                                {selectedChainId === chain.id && <Check className="w-3 h-3 text-emerald-500" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NetworkSwitcher;

