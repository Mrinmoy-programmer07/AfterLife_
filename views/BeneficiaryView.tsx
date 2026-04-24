import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Progress, Badge } from '../components/ui/Primitives';
import { ProtocolContextType, AssetState, ProtocolState } from '../types';
import { Unlock, Briefcase, Clock, Loader2 } from 'lucide-react';
import { formatDuration } from '../services/mockService';
import { useAccount } from 'wagmi';

const AssetRow: React.FC<{ asset: AssetState, now: number }> = ({ asset, now }) => {
    const isUnlocked = now >= asset.unlockDate;
    const timeLeft = Math.max(0, asset.unlockDate - now);

    return (
        <div className={`p-4 rounded-lg border ${isUnlocked ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-white/10 bg-white/10'} flex justify-between items-center group transition-all`}>
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${isUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-500'}`}>
                    {isUnlocked ? <Unlock className="w-4 h-4" /> : <LockIcon />}
                </div>
                <div>
                    <h4 className={`font-medium ${isUnlocked ? 'text-white' : 'text-stone-400'}`}>{asset.name}</h4>
                    <p className="text-xs text-stone-500">{asset.value}</p>
                </div>
            </div>
            <div className="text-right">
                {isUnlocked ? (
                    <Button variant="ghost" className="text-emerald-400 hover:text-emerald-300 h-8 text-xs uppercase tracking-wide">
                        Claim
                    </Button>
                ) : (
                    <div className="text-xs font-mono text-stone-500">
                        {formatDuration(timeLeft)}
                    </div>
                )}
            </div>
        </div>
    )
}

const LockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)

const BeneficiaryView: React.FC<{ context: ProtocolContextType }> = ({ context }) => {
    const now = Date.now();

    // Find current user's beneficiary record (Mock: using first one or matching wallet)
    // Since we have Smart Routing, we assume context.role is BENEFICIARY implies a match found.
    // For demo visuals, let's grab the Beneficiary that matches simple heuristic or just the first one if mock.
    // BUT proper way: match address.
    // Find current user's beneficiary record
    const { address } = useAccount();
    const currentUser = context.beneficiaries.find(b => b.address.toLowerCase() === address?.toLowerCase());

    // REAL CALCULATIONS
    // 1. Target Balance (Snapshot if dead, Live if active)
    const effectiveVaultBalance = context.state === ProtocolState.EXECUTING ? context.vaultBalance : context.currentVaultBalance;
    const vaultEth = Number(effectiveVaultBalance) / 1e18;

    // 2. My Total Share (allocation % of vault)
    const userShare = (vaultEth * (currentUser?.allocation || 0)) / 100;

    // 3. Claimed so far from contract
    const claimedEth = Number(currentUser?.amountClaimed || 0) / 1e18;

    // 4. Vested amount based on protocol progress (0 if not executing)
    const vestedEth = context.state === ProtocolState.EXECUTING ? (userShare * context.vestingProgress) / 100 : 0;

    // 5. Claimable right now
    const claimableEth = Math.max(0, vestedEth - claimedEth);
    const lockedEth = userShare - vestedEth;

    // Loading state for claim button
    const [isClaimLoading, setIsClaimLoading] = useState(false);

    const handleClaim = async () => {
        if (!currentUser || claimableEth <= 0 || isClaimLoading) return;
        setIsClaimLoading(true);
        try {
            await context.claimBeneficiaryShare(currentUser.address);
        } finally {
            setIsClaimLoading(false);
        }
    };

    return (
        <motion.div
            className="flex flex-col items-center justify-center min-h-screen p-6 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <header className="absolute top-20 left-8 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Badge variant="neutral">Beneficiary</Badge>
                    <span className="text-sm text-secondary font-mono tracking-wider text-white/70">INSTANCE: {context.ownerAddress.slice(0, 6)}...{context.ownerAddress.slice(-4)}</span>
                </div>
                <div className="flex gap-4 pl-1">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-stone-500 uppercase tracking-tighter">My Wallet</span>
                        <span className="text-xs text-white font-mono">{Number(context.walletBalance).toFixed(4)} ETH</span>
                    </div>
                    <div className="w-[1px] h-6 bg-white/10 my-auto" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-indigo-500 uppercase tracking-tighter">Instance Vault</span>
                        <span className="text-xs text-indigo-400 font-mono">{(Number(context.currentVaultBalance) / 1e18).toFixed(4)} ETH</span>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-4xl grid grid-cols-1 lg:col-span-3 gap-8 pt-16">

                {/* Left Col: Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6 border-indigo-500/20">
                        <h2 className="text-sm text-secondary uppercase tracking-widest mb-2">My Inheritance</h2>
                        <div className="text-3xl font-light text-white mb-6">{userShare.toFixed(2)} ETH</div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-xs text-secondary mb-1">
                                <span>Vesting Progress</span>
                                <span className="text-white">{context.vestingProgress.toFixed(1)}%</span>
                            </div>
                            <Progress value={context.vestingProgress} indicatorColor="bg-indigo-500" />

                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                <div className="text-center w-1/2 border-r border-white/5">
                                    <div className="text-xs text-stone-500 uppercase">Claimable</div>
                                    <div className="text-lg text-emerald-400 font-medium">
                                        {currentUser ? claimableEth.toFixed(4) : '0.0000'} ETH
                                    </div>
                                    {currentUser && claimableEth > 0 && (
                                        <div className="text-[10px] text-stone-500 mt-1">
                                            You receive: {(claimableEth * 0.9).toFixed(4)} ETH
                                        </div>
                                    )}
                                </div>
                                <div className="text-center w-1/2">
                                    <div className="text-xs text-stone-500 uppercase">Locked</div>
                                    <div className="text-lg text-stone-300 font-medium">
                                        {currentUser ? lockedEth.toFixed(2) : '0.00'} ETH
                                    </div>
                                </div>
                            </div>

                            {/* Platform Fee Notice */}
                            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                <p className="text-[11px] text-amber-400/80 leading-relaxed">
                                    ⚠️ A <span className="font-semibold">10% platform fee</span> is deducted from each claim.
                                    You will receive 90% of the claimable amount.
                                </p>
                            </div>

                            <Button
                                onClick={handleClaim}
                                disabled={!currentUser || claimableEth <= 0 || isClaimLoading}
                                className={`w-full mt-4 ${currentUser && claimableEth > 0 && !isClaimLoading ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'opacity-50 cursor-not-allowed'}`}
                            >
                                {isClaimLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Claiming...</>
                                ) : !currentUser ? (
                                    'Access Denied'
                                ) : claimableEth > 0 ? (
                                    `Claim ${(claimableEth * 0.9).toFixed(4)} ETH`
                                ) : claimedEth >= userShare * 0.99 ? (
                                    '✓ Fully Claimed'
                                ) : context.vestingProgress >= 100 ? (
                                    '✓ Claimed'
                                ) : (
                                    'Pending Vesting'
                                )}
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6 bg-transparent border-none shadow-none">
                        <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-indigo-400 mt-1" />
                            <p className="text-sm text-stone-400 leading-relaxed">
                                Assets are released gradually to ensure stability. The protocol will continue executing until all vaults are depleted.
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Right Col: Timeline */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-light text-white mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-secondary" />
                        Inheritance Vaults
                    </h3>

                    <div className="space-y-3">
                        {context.assets.map(asset => (
                            <AssetRow key={asset.id} asset={asset} now={now} />
                        ))}
                    </div>
                </div>

            </main >
        </motion.div >
    );
};

export default BeneficiaryView;
