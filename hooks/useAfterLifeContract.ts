import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';

// @ts-ignore - JSON import
import AfterLifeArtifact from '../artifacts/contracts/AfterLife.sol/AfterLife.json';

// Multi-chain support
import { useChain } from '../contexts/ChainContext';
import { SUPPORTED_CHAINS } from '../config/chainConfig';

export const useAfterLifeContract = () => {
    const { isConnected, chain, address: userAddress } = useAccount();
    const { writeContractAsync } = useWriteContract();

    // Get dynamic contract address from chain context
    const { contractAddress, isCorrectChain, chainInfo, selectedChainId } = useChain();

    // CRITICAL: Use publicClient for the SELECTED chain, not wallet's current chain
    // This ensures reads go to the correct chain even during network switching
    const publicClient = usePublicClient({ chainId: selectedChainId });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Chain Validation ---
    const validateChain = () => {
        if (!contractAddress) {
            throw new Error(`AfterLife contract not deployed on ${chainInfo.name} yet`);
        }
        if (!isCorrectChain) {
            throw new Error(`Please switch your wallet to ${chainInfo.name}`);
        }
    };

    // --- Core Transaction Handler (Resilient & Informative) ---
    const handleTransaction = async (functionName: string, args: any[], value?: bigint) => {
        setIsLoading(true);
        setError(null);

        try {
            // Validate chain before any transaction
            validateChain();

            if (!publicClient) throw new Error("Public client not initialized");

            // 1. Pre-flight Simulation to catch reverts early
            // NOTE: Mantle RPC sometimes has issues with simulation, so we make it non-blocking
            const isMantle = selectedChainId === SUPPORTED_CHAINS.MANTLE_SEPOLIA;

            try {
                await publicClient.simulateContract({
                    address: contractAddress as `0x${string}`,
                    abi: AfterLifeArtifact.abi,
                    functionName,
                    args,
                    value,
                    account: userAddress,
                } as any);
                console.log(`✅ Simulation passed for ${functionName}`);
            } catch (simErr: any) {
                console.error(`Simulation failed for ${functionName}:`, simErr);

                // On Mantle, simulation can fail due to RPC issues but tx might still succeed
                // Log but don't block on Mantle
                if (isMantle) {
                    console.warn(`⚠️ Mantle: Proceeding despite simulation failure (RPC may have issues)`);
                } else {
                    // For other chains, check for common error patterns
                    const errString = JSON.stringify(simErr).toLowerCase();

                    if (errString.includes('insufficient') || errString.includes('balance')) {
                        throw new Error(`Insufficient ${chainInfo.nativeCurrency.symbol} for gas. Get testnet tokens from a faucet.`);
                    }

                    if (errString.includes('json-rpc') || errString.includes('internal error')) {
                        throw new Error(`RPC Error: You may need ${chainInfo.nativeCurrency.symbol} tokens for gas on ${chainInfo.name}. Try a faucet!`);
                    }

                    const reason = simErr.shortMessage || simErr.details || simErr.message;
                    throw new Error(`On-chain check failed: ${reason}`);
                }
            }

            // 2. Build transaction config - MINIMAL for debugging
            console.log(`📝 Preparing ${functionName} for ${chainInfo.name}...`);
            console.log(`   Contract: ${contractAddress}`);
            console.log(`   Args:`, args);
            console.log(`   Chain ID: ${selectedChainId}`);
            console.log(`   Is Mantle: ${isMantle}`);

            // Try absolute minimal config first
            const txConfig: any = {
                address: contractAddress as `0x${string}`,
                abi: AfterLifeArtifact.abi,
                functionName,
                args,
            };

            // Only add value if present
            if (value) {
                txConfig.value = value;
            }

            // For Mantle, don't specify gas - let wallet estimate
            // For other chains, use our gas limit
            if (!isMantle) {
                txConfig.gas = 1000000n;
            }

            console.log(`📤 Sending transaction...`);
            const hash = await writeContractAsync(txConfig);

            console.log(`✅ Transaction sent: ${hash}`);
            return await publicClient.waitForTransactionReceipt({ hash });
        } catch (err: any) {
            console.error(`Transaction error for ${functionName}:`, err);
            console.error('Full error object:', JSON.stringify(err, null, 2));

            // Provide helpful error messages
            let msg = err.shortMessage || err.message || "Transaction failed";

            // Check for common MetaMask/RPC errors
            if (msg.toLowerCase().includes('internal json-rpc') || msg.toLowerCase().includes('internal error')) {
                msg = `Transaction failed on ${chainInfo.name}. Common causes:\n• No ${chainInfo.nativeCurrency.symbol} for gas (get from faucet)\n• Network congestion\n• RPC issues\n\nCheck browser console for details.`;
            }

            setError(msg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };


    // --- Owner Functions ---


    const register = async (thresholdSeconds: number) => {
        return handleTransaction('register', [BigInt(thresholdSeconds)]);
    };

    const proveLife = async () => {
        return handleTransaction('proveLife', []);
    };

    const updateInactivityThreshold = async (newThresholdSeconds: number) => {
        return handleTransaction('updateInactivityThreshold', [BigInt(newThresholdSeconds)]);
    };

    const addGuardian = async (name: string, guardianAddress: string) => {
        return handleTransaction('addGuardian', [name, guardianAddress]);
    };

    const addBeneficiary = async (
        name: string,
        beneficiaryAddress: string,
        allocationBps: number,
        vestingType: number,
        duration: number
    ) => {
        return handleTransaction('addBeneficiary', [
            name,
            beneficiaryAddress,
            BigInt(allocationBps),
            vestingType,
            BigInt(duration)
        ]);
    };

    const removeGuardian = async (guardianAddress: string) => {
        return handleTransaction('removeGuardian', [guardianAddress]);
    };

    const removeBeneficiary = async (beneficiaryAddress: string) => {
        return handleTransaction('removeBeneficiary', [beneficiaryAddress]);
    };

    // --- Deposit & Withdraw ---

    const deposit = async (amountEth: string) => {
        const value = parseEther(amountEth);
        return handleTransaction('deposit', [], value);
    };

    const withdraw = async (amountWei: bigint) => {
        return handleTransaction('withdraw', [amountWei]);
    };

    const setGuardianFixed = async (guardianAddress: string, isFixed: boolean) => {
        return handleTransaction('setGuardianFixed', [guardianAddress, isFixed]);
    };

    // --- Guardian Functions ---

    const confirmInactivity = async (ownerAddress: string) => {
        return handleTransaction('confirmInactivity', [ownerAddress]);
    };

    // --- Beneficiary Functions ---

    const claim = async (ownerAddress: string) => {
        return handleTransaction('claim', [ownerAddress]);
    };

    // --- Data Fetching ---

    const getProtocolState = async (ownerAddress?: string) => {
        if (!publicClient) return null;
        const targetOwner = ownerAddress || userAddress;
        if (!targetOwner) return null;

        try {
            const protocol = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: AfterLifeArtifact.abi,
                functionName: 'protocols',
                args: [targetOwner],
                account: userAddress,
            } as any) as any;

            const currentBalance = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: AfterLifeArtifact.abi,
                functionName: 'getOwnerBalance',
                args: [targetOwner],
                account: userAddress,
            } as any) as bigint;

            return {
                isRegistered: protocol[0] as boolean,
                lastHeartbeat: Number(protocol[1]) * 1000,
                inactivityThreshold: Number(protocol[2]) * 1000,
                isDead: protocol[3] as boolean,
                initialVaultBalance: protocol[4],
                currentVaultBalance: currentBalance,
                vestingStartTime: Number(protocol[5]) * 1000,
                totalAllocation: Number(protocol[6]),
                deathDeclarationTime: Number(protocol[7]) * 1000,
            };
        } catch (e) {
            console.error("Error fetching protocol state:", e);
            return null;
        }
    };

    const getGuardians = async (ownerAddress?: string) => {
        if (!publicClient) return [];
        const targetOwner = ownerAddress || userAddress;
        if (!targetOwner) return [];

        try {
            const count = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: AfterLifeArtifact.abi,
                functionName: 'getGuardianCount',
                args: [targetOwner],
                account: userAddress,
            } as any) as bigint;

            const guardians: any[] = [];
            for (let i = 0; i < Number(count); i++) {
                const guardianAddr = await publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: AfterLifeArtifact.abi,
                    functionName: 'getGuardianAt',
                    args: [targetOwner, BigInt(i)],
                    account: userAddress,
                } as any) as string;

                const details = await publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: AfterLifeArtifact.abi,
                    functionName: 'guardians',
                    args: [targetOwner, guardianAddr],
                    account: userAddress,
                } as any) as any[];

                guardians.push({
                    id: guardianAddr,
                    name: details[0],
                    address: details[1],
                    isFixed: details[2]
                });
            }
            return guardians;
        } catch (e) {
            console.error("Error fetching guardians:", e);
            return [];
        }
    };

    const getBeneficiaries = async (ownerAddress?: string) => {
        if (!publicClient) return [];
        const targetOwner = ownerAddress || userAddress;
        if (!targetOwner) return [];

        try {
            const count = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: AfterLifeArtifact.abi,
                functionName: 'getBeneficiaryCount',
                args: [targetOwner],
                account: userAddress,
            } as any) as bigint;

            const beneficiaries: any[] = [];
            for (let i = 0; i < Number(count); i++) {
                const benAddr = await publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: AfterLifeArtifact.abi,
                    functionName: 'getBeneficiaryAt',
                    args: [targetOwner, BigInt(i)],
                    account: userAddress,
                } as any) as string;

                const details = await publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi: AfterLifeArtifact.abi,
                    functionName: 'beneficiaries',
                    args: [targetOwner, benAddr],
                    account: userAddress,
                } as any) as any[];

                beneficiaries.push({
                    id: benAddr,
                    name: details[0],
                    address: details[1],
                    allocation: Number(details[2]),
                    amountClaimed: details[3],
                    vestingType: details[4] === 0 ? 'linear' : 'cliff',
                    vestingDuration: Number(details[5]),
                });
            }
            return beneficiaries;
        } catch (e) {
            console.error("Error fetching beneficiaries:", e);
            return [];
        }
    };

    const isOwner = async (address?: string) => {
        if (!publicClient) return false;
        const targetAddress = address || userAddress;
        if (!targetAddress) return false;

        try {
            const result = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: AfterLifeArtifact.abi,
                functionName: 'isOwner',
                args: [targetAddress],
                account: userAddress,
            } as any);
            return result as boolean;
        } catch (e) {
            return false;
        }
    };

    const getClaimableAmount = async (ownerAddress: string, beneficiaryAddress: string) => {
        if (!publicClient) return null;
        try {
            const result = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: AfterLifeArtifact.abi,
                functionName: 'getClaimableAmount',
                args: [ownerAddress, beneficiaryAddress],
            } as any) as [bigint, bigint, bigint];
            return {
                claimable: result[0],
                totalEntitlement: result[1],
                alreadyClaimed: result[2],
            };
        } catch (e) {
            console.error('Error fetching claimable amount:', e);
            return null;
        }
    };

    const getReviveStatus = async (ownerAddress: string) => {
        if (!publicClient) return null;
        try {
            const result = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: AfterLifeArtifact.abi,
                functionName: 'getReviveStatus',
                args: [ownerAddress],
            } as any) as [boolean, bigint];
            return {
                canRevive: result[0],
                timeRemaining: Number(result[1]) * 1000,
            };
        } catch (e) {
            console.error('Error fetching revive status:', e);
            return null;
        }
    };

    return {
        isLoading,
        error,
        // Owner functions
        register,
        proveLife,
        addGuardian,
        addBeneficiary,
        removeGuardian,
        removeBeneficiary,
        deposit,
        withdraw,
        setGuardianFixed,
        // Guardian functions
        confirmInactivity,
        // Beneficiary functions
        claim,
        // Read functions
        getProtocolState,
        getGuardians,
        getBeneficiaries,
        isOwner,
        getClaimableAmount,
        getReviveStatus,
        // Misc
        contractAddress,
        chainInfo,
        selectedChainId,
        publicClient,
        userAddress
    };
};
