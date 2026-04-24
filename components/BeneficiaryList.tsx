import React from 'react';
import { motion } from 'framer-motion';
import { Users, Coins, ChevronRight, Trash2 } from 'lucide-react';
import { Beneficiary } from '../types';
import { Card, Progress, Button } from './ui/Primitives';

interface BeneficiaryListProps {
    beneficiaries: Beneficiary[];
    onUpdateAllocation?: (address: string, newAllocation: number) => void;
    onRemove?: (address: string) => void;
}

const BeneficiaryList: React.FC<BeneficiaryListProps> = ({ beneficiaries, onUpdateAllocation, onRemove }) => {
    return (
        <Card className="bg-stone-900/40 p-6 h-full backdrop-blur-md border border-stone-800/50">
            <div className="flex items-center gap-2 mb-6 border-b border-stone-800 pb-4">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-light text-white tracking-wide">Beneficiaries</h3>
                <span className={`text-xs ml-auto uppercase tracking-widest px-2 py-1 rounded border ${beneficiaries.reduce((sum, b) => sum + b.allocation, 0) === 100
                    ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                    : 'text-amber-400 border-amber-500/20 bg-amber-500/10'
                    }`}>
                    Total: {beneficiaries.reduce((sum, b) => sum + b.allocation, 0)}%
                </span>
            </div>

            <div className="space-y-4">
                {beneficiaries.map((beneficiary, idx) => (
                    <motion.div
                        key={beneficiary.address}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 rounded-xl bg-stone-950/50 hover:bg-stone-900/80 transition-all border border-transparent hover:border-emerald-500/20 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex justify-between items-start mb-2 gap-4">
                            <div className="min-w-0 flex-1">
                                <h4 className="text-stone-200 font-medium truncate">{beneficiary.name}</h4>
                                <p className="text-xs text-stone-500 font-mono mt-0.5 truncate">{beneficiary.address}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <div className="text-right">
                                    <span className="text-xl font-light text-white">{beneficiary.allocation}%</span>
                                    <p className="text-[10px] text-stone-500 uppercase">Share</p>
                                </div>
                                {onRemove && (
                                    <Button
                                        onClick={() => onRemove(beneficiary.address)}
                                        variant="ghost"
                                        className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all group-hover:scale-110 z-20"
                                        title="Remove Beneficiary"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Allocation Slider */}
                        {onUpdateAllocation && (
                            <div className="mt-2 mb-3 px-1">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={beneficiary.allocation}
                                    onChange={(e) => onUpdateAllocation(beneficiary.address, Number(e.target.value))}
                                    className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        )}

                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-stone-400 mb-1">
                                <span className="flex items-center gap-1">
                                    <Coins className="w-3 h-3" />
                                    Claimed: {(Number(beneficiary.amountClaimed) / 1e18).toFixed(4)} ETH
                                </span>
                            </div>
                            <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500/50"
                                    style={{ width: Number(beneficiary.amountClaimed) === 0 ? '0%' : '100%' }}
                                />
                            </div>
                        </div>

                        <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-700 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all pointer-events-none" />
                    </motion.div>
                ))}
            </div>
        </Card>
    );
};

export default BeneficiaryList;
