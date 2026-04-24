import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Progress, Badge, Dialog } from '../components/ui/Primitives';
import { ProtocolState, ProtocolContextType } from '../types';
import { Heart, Activity, UserPlus, Wallet, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { formatDuration } from '../services/mockService';
import gsap from 'gsap';
import GuardianList from '../components/GuardianList';
import BeneficiaryList from '../components/BeneficiaryList';
import { useAfterLifeContract } from '../hooks/useAfterLifeContract';
import toast from 'react-hot-toast';

const OwnerView: React.FC<{ context: ProtocolContextType }> = ({ context }) => {
    const [pulse, setPulse] = useState(false);
    const remainingTime = Math.max(0, context.inactivityThreshold - (Date.now() - context.lastHeartbeat));
    const remainingPct = Math.max(0, (remainingTime / context.inactivityThreshold) * 100);

    // Contract Integration
    const {
        addGuardian: contractAddGuardian,
        addBeneficiary: contractAddBeneficiary,
        removeGuardian: contractRemoveGuardian,
        removeBeneficiary: contractRemoveBeneficiary,
        proveLife: contractProveLife,
        deposit: contractDeposit,
        withdraw: contractWithdraw,
        isLoading,
        error: contractError,
        userAddress
    } = useAfterLifeContract();

    // Modal State
    const [isAddGuardianOpen, setIsAddGuardianOpen] = useState(false);
    const [isAddBeneficiaryOpen, setIsAddBeneficiaryOpen] = useState(false);
    const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [removeTask, setRemoveTask] = useState<{ type: 'guardian' | 'beneficiary', address: string } | null>(null);

    // Deposit/Withdraw State
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    // Form State
    const [newGuardian, setNewGuardian] = useState({ name: '', address: '' });
    const [newBeneficiary, setNewBeneficiary] = useState({
        name: '',
        address: '',
        allocation: 0,
        vestingType: 'LINEAR',
        vestingDuration: 2 // Default 2 minutes for testing
    });

    const handleProveLife = async () => {
        try {
            // Call actual contract
            await contractProveLife();

            // Success visual effects
            setPulse(true);
            const tl = gsap.timeline({ onComplete: () => setPulse(false) });
            tl.to(".temporal-ripple", { scale: 1.5, opacity: 0, duration: 0.8, ease: "power2.out" })
                .set(".temporal-ripple", { scale: 1, opacity: 1 });

            // Also update local state for UI responsiveness
            context.proveLife();
        } catch (error) {
            console.error("Failed to prove life:", error);
            toast.error("Transaction failed. See console for details.");
        }
    };

    const handleRemoveGuardian = (address: string) => {
        setRemoveTask({ type: 'guardian', address });
        setIsRemoveConfirmOpen(true);
    };

    const handleRemoveBeneficiary = (address: string) => {
        setRemoveTask({ type: 'beneficiary', address });
        setIsRemoveConfirmOpen(true);
    };

    const executeRemoval = async () => {
        if (!removeTask) return;
        const { type, address } = removeTask;

        try {
            if (type === 'guardian') {
                console.log(`[OwnerView] Executing guardian removal: ${address}`);
                await contractRemoveGuardian(address);
                context.removeGuardian(address);
            } else {
                console.log(`[OwnerView] Executing beneficiary removal: ${address}`);
                await contractRemoveBeneficiary(address);
                context.removeBeneficiary(address);
            }
            setIsRemoveConfirmOpen(false);
            setRemoveTask(null);
        } catch (error: any) {
            console.error(`[OwnerView] FAILED to remove ${type}: ${address}`, error);
            toast.error(`Removal failed: ${error.message || "Unknown error"}`);
        }
    };

    const submitGuardian = async () => {
        if (newGuardian.name && newGuardian.address) {
            try {
                // Call actual contract
                await contractAddGuardian(newGuardian.name, newGuardian.address);

                // Update local state for UI
                context.addGuardian({
                    name: newGuardian.name,
                    address: newGuardian.address,
                    isConfirmed: false,
                    lastActive: Date.now()
                });

                setNewGuardian({ name: '', address: '' });
                setIsAddGuardianOpen(false);
            } catch (error) {
                console.error("Failed to add guardian:", error);
                toast.error("Transaction failed. See console for details.");
            }
        }
    };

    const submitBeneficiary = async () => {
        if (newBeneficiary.name && newBeneficiary.address) {
            const currentTotal = context.beneficiaries.reduce((sum, b) => sum + b.allocation, 0);
            const available = 100 - currentTotal;

            // Clamp initial allocation to available budget
            const finalAllocation = Math.min(Number(newBeneficiary.allocation), available);

            try {
                // Convert allocation to basis points (100% = 10000)
                const allocationBps = Math.floor(finalAllocation * 100);

                // Convert vesting type to enum (0 = LINEAR, 1 = CLIFF)
                const vestingTypeEnum = newBeneficiary.vestingType === 'LINEAR' ? 0 : 1;

                // Convert duration from minutes to seconds (for demo/testing)
                const durationSeconds = newBeneficiary.vestingDuration * 60;

                // Call actual contract
                await contractAddBeneficiary(
                    newBeneficiary.name,
                    newBeneficiary.address,
                    allocationBps,
                    vestingTypeEnum,
                    durationSeconds
                );

                // Update local state for UI
                context.addBeneficiary({
                    name: newBeneficiary.name,
                    address: newBeneficiary.address,
                    allocation: finalAllocation,
                    amountClaimed: '0 ETH',
                    vestingType: newBeneficiary.vestingType as any,
                    vestingDuration: durationSeconds
                });

                setNewBeneficiary({ name: '', address: '', allocation: 0, vestingType: 'LINEAR', vestingDuration: 2 });
                setIsAddBeneficiaryOpen(false);
            } catch (error) {
                console.error("Failed to add beneficiary:", error);
                toast.error("Transaction failed. See console for details.");
            }
        }
    };

    const handleDeposit = async () => {
        if (!depositAmount || parseFloat(depositAmount) <= 0) return;
        try {
            await contractDeposit(depositAmount);
            setDepositAmount('');
            setIsDepositOpen(false);
            context.addEvent(`Deposited ${depositAmount} ETH to vault`, 'INFO');
        } catch (error: any) {
            console.error('Deposit failed:', error);
            toast.error(`Deposit failed: ${error.message || 'Unknown error'}`);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
        try {
            const amountWei = BigInt(Math.floor(parseFloat(withdrawAmount) * 1e18));
            await contractWithdraw(amountWei);
            setWithdrawAmount('');
            setIsWithdrawOpen(false);
            context.addEvent(`Withdrew ${withdrawAmount} ETH from vault`, 'INFO');
        } catch (error: any) {
            console.error('Withdraw failed:', error);
            toast.error(`Withdraw failed: ${error.message || 'Unknown error'}`);
        }
    };

    return (
        <motion.div
            className="flex flex-col items-center min-h-screen p-6 pt-24 pb-12 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Visual Ripple Element */}
                {pulse && (
                    <div className="temporal-ripple w-[300px] h-[300px] rounded-full border border-emerald-500/50 absolute" />
                )}
            </div>

            <main className="w-full max-w-5xl space-y-6">
                {/* Header with wallet info and action buttons */}
                <div className="flex justify-between items-start w-full">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <Badge variant="success">Active</Badge>
                            <span className="text-sm text-secondary font-mono tracking-wider text-white/70">PROTOCOL ID: {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Not Connected'}</span>
                        </div>
                        <div className="flex gap-4 items-center">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-stone-500 uppercase tracking-tighter">Wallet Balance</span>
                                <span className="text-sm text-white font-mono">{Number(context.walletBalance).toFixed(4)} ETH</span>
                            </div>
                            <div className="w-[1px] h-6 bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-emerald-500 uppercase tracking-tighter">Vault Balance</span>
                                <span className="text-sm text-emerald-400 font-mono">{(Number(context.currentVaultBalance) / 1e18).toFixed(4)} ETH</span>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <Button variant="outline" onClick={() => setIsDepositOpen(true)} className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-sm py-1 px-3">
                                    <ArrowDownToLine className="w-3 h-3" /> Deposit
                                </Button>
                                <Button variant="outline" onClick={() => setIsWithdrawOpen(true)} className="gap-2 text-sm py-1 px-3">
                                    <ArrowUpFromLine className="w-3 h-3" /> Withdraw
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setIsAddGuardianOpen(true)} className="gap-2">
                            <UserPlus className="w-4 h-4" /> Add Guardian
                        </Button>
                        <Button variant="outline" onClick={() => setIsAddBeneficiaryOpen(true)} className="gap-2">
                            <UserPlus className="w-4 h-4" /> Add Beneficiary
                        </Button>
                    </div>
                </div>

                {/* Central Monitor */}
                <Card className="p-8 border-stone-800 bg-stone-950/80 backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-light text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-500" />
                                Vitality Monitor
                            </h2>
                            <p className="text-secondary text-sm mt-1">
                                Continuous proof-of-life required to prevent state transition.
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-mono text-white font-light tracking-tight">
                                {formatDuration(remainingTime)}
                            </div>
                            <div className="text-xs text-stone-500 uppercase mt-1">Time to Inactivity</div>
                        </div>
                    </div>

                    <div className="space-y-2 mb-8">
                        <div className="flex justify-between text-xs text-stone-400">
                            <span>Vitality Strength</span>
                            <span>{Math.floor(remainingPct)}%</span>
                        </div>
                        <Progress
                            value={remainingPct}
                            indicatorColor={remainingPct < 20 ? 'bg-amber-500' : 'bg-emerald-500'}
                        />
                    </div>

                    <div className="flex justify-center">
                        <Button
                            onClick={handleProveLife}
                            className="w-full py-6 text-lg tracking-widest uppercase border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all duration-500"
                            variant="outline"
                        >
                            <Heart className={`w-5 h-5 mr-2 ${pulse ? 'animate-ping' : ''}`} />
                            Prove Life
                        </Button>
                    </div>
                </Card>

                {/* Lists Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GuardianList guardians={context.guardians} onRemove={handleRemoveGuardian} />
                    <BeneficiaryList
                        beneficiaries={context.beneficiaries}
                        onUpdateAllocation={context.updateBeneficiaryAllocation}
                        onRemove={handleRemoveBeneficiary}
                    />
                </div>
            </main>

            {/* Add Guardian Modal */}
            <Dialog isOpen={isAddGuardianOpen} onClose={() => setIsAddGuardianOpen(false)} title="Add Guardian">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-secondary uppercase">Guardian Name / Alias</label>
                        <input
                            type="text"
                            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white mt-1 focus:border-indigo-500 outline-none"
                            value={newGuardian.name}
                            onChange={e => setNewGuardian({ ...newGuardian, name: e.target.value })}
                            placeholder="e.g. Alice"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-secondary uppercase">Wallet Address</label>
                        <input
                            type="text"
                            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white mt-1 focus:border-indigo-500 outline-none font-mono text-sm"
                            value={newGuardian.address}
                            onChange={e => setNewGuardian({ ...newGuardian, address: e.target.value })}
                            placeholder="0x..."
                        />
                    </div>
                    <Button className="w-full mt-4" onClick={submitGuardian}>Confirm Entity</Button>
                </div>
            </Dialog>

            {/* Add Beneficiary Modal */}
            <Dialog isOpen={isAddBeneficiaryOpen} onClose={() => setIsAddBeneficiaryOpen(false)} title="Add Beneficiary">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-secondary uppercase">Beneficiary Name</label>
                        <input
                            type="text"
                            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white mt-1 focus:border-emerald-500 outline-none"
                            value={newBeneficiary.name}
                            onChange={e => setNewBeneficiary({ ...newBeneficiary, name: e.target.value })}
                            placeholder="e.g. Trust Fund"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-secondary uppercase">Wallet Address</label>
                        <input
                            type="text"
                            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white mt-1 focus:border-emerald-500 outline-none font-mono text-sm"
                            value={newBeneficiary.address}
                            onChange={e => setNewBeneficiary({ ...newBeneficiary, address: e.target.value })}
                            placeholder="0x..."
                        />
                    </div>
                    <div>
                        <label className="text-xs text-secondary uppercase flex justify-between">
                            <span>Initial Allocation (%)</span>
                            <span className="text-stone-500">
                                Available: {100 - context.beneficiaries.reduce((sum, b) => sum + b.allocation, 0)}%
                            </span>
                        </label>
                        <input
                            type="number"
                            className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white mt-1 focus:border-emerald-500 outline-none"
                            value={newBeneficiary.allocation}
                            onChange={e => setNewBeneficiary({ ...newBeneficiary, allocation: Number(e.target.value) })}
                            placeholder={`Max: ${100 - context.beneficiaries.reduce((sum, b) => sum + b.allocation, 0)}`}
                            max={100 - context.beneficiaries.reduce((sum, b) => sum + b.allocation, 0)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-secondary uppercase">Vesting Schedule</label>
                            <select
                                className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white mt-1 focus:border-emerald-500 outline-none text-sm"
                                value={newBeneficiary.vestingType}
                                onChange={e => setNewBeneficiary({ ...newBeneficiary, vestingType: e.target.value as any })}
                            >
                                <option value="LINEAR">Linear Stream</option>
                                <option value="CLIFF">Cliff Release</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-secondary uppercase">Duration (Minutes)</label>
                            <input
                                type="number"
                                className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-white mt-1 focus:border-emerald-500 outline-none"
                                value={newBeneficiary.vestingDuration}
                                onChange={e => setNewBeneficiary({ ...newBeneficiary, vestingDuration: Number(e.target.value) })}
                                placeholder="e.g. 12"
                            />
                        </div>
                    </div>

                    <Button className="w-full mt-4 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" onClick={submitBeneficiary}>Add Beneficiary</Button>
                </div>
            </Dialog>

            {/* Removal Confirmation Modal */}
            <Dialog isOpen={isRemoveConfirmOpen} onClose={() => setIsRemoveConfirmOpen(false)} title="Confirm Removal">
                <div className="space-y-6">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-sm text-amber-200 leading-relaxed">
                            Are you sure you want to remove this {removeTask?.type}? This action will update the protocol state on the blockchain.
                        </p>
                        <p className="text-[10px] text-amber-500/70 font-mono mt-2 break-all">
                            TARGET: {removeTask?.address}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsRemoveConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none"
                            onClick={executeRemoval}
                            isLoading={isLoading}
                        >
                            Confirm Removal
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Deposit Modal */}
            <Dialog isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} title="Deposit to Vault">
                <div className="space-y-4">
                    <p className="text-sm text-stone-400">
                        Deposit ETH to your protocol vault. This amount will be distributed to beneficiaries according to their allocations.
                    </p>
                    <div>
                        <label className="text-xs text-secondary uppercase">Amount (ETH)</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="number"
                                step="0.001"
                                className="flex-1 bg-stone-950 border border-stone-800 rounded p-2 text-white focus:border-emerald-500 outline-none"
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)}
                                placeholder="0.1"
                            />
                            <Button
                                variant="outline"
                                className="text-xs"
                                onClick={() => setDepositAmount(String(Number(context.walletBalance)))}
                            >
                                MAX
                            </Button>
                        </div>
                    </div>
                    <Button
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-none"
                        onClick={handleDeposit}
                        isLoading={isLoading}
                    >
                        Deposit {depositAmount || '0'} ETH
                    </Button>
                </div>
            </Dialog>

            {/* Withdraw Modal */}
            <Dialog isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} title="Withdraw from Vault">
                <div className="space-y-4">
                    <p className="text-sm text-stone-400">
                        Withdraw ETH from your vault. You can only withdraw while the protocol is active.
                    </p>
                    <div className="p-3 bg-stone-900/50 rounded-lg">
                        <span className="text-xs text-stone-500">Available Balance</span>
                        <p className="text-lg text-emerald-400 font-mono">
                            {(Number(context.currentVaultBalance) / 1e18).toFixed(4)} ETH
                        </p>
                    </div>
                    <div>
                        <label className="text-xs text-secondary uppercase">Amount (ETH)</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="number"
                                step="0.001"
                                className="flex-1 bg-stone-950 border border-stone-800 rounded p-2 text-white focus:border-emerald-500 outline-none"
                                value={withdrawAmount}
                                onChange={e => setWithdrawAmount(e.target.value)}
                                placeholder="0.1"
                            />
                            <Button
                                variant="outline"
                                className="text-xs"
                                onClick={() => setWithdrawAmount(String(Number(context.currentVaultBalance) / 1e18))}
                            >
                                MAX
                            </Button>
                        </div>
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleWithdraw}
                        isLoading={isLoading}
                    >
                        Withdraw {withdrawAmount || '0'} ETH
                    </Button>
                </div>
            </Dialog>

        </motion.div>
    );
};

export default OwnerView;
