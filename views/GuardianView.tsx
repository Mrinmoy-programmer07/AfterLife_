import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, Progress } from '../components/ui/Primitives';
import { ProtocolContextType, ProtocolState } from '../types';
import { Eye, CheckCircle2, Lock, Activity } from 'lucide-react';
import { formatDuration } from '../services/mockService';

const GuardianView: React.FC<{ context: ProtocolContextType }> = ({ context }) => {
    const [isConfirming, setIsConfirming] = useState(false);

    const remainingTime = Math.max(0, context.inactivityThreshold - (Date.now() - context.lastHeartbeat));
    const remainingPct = Math.max(0, (remainingTime / context.inactivityThreshold) * 100);

    const canConfirm = context.state === ProtocolState.PENDING;

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            await context.confirmInactivity();
        } catch (error) {
            console.error("Confirmation failed:", error);
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <motion.div
            className="flex flex-col items-center justify-center min-h-screen p-6 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <header className="absolute top-20 left-8 flex items-center gap-3">
                <Badge variant="neutral">Guardian Node</Badge>
                <span className="text-sm text-secondary font-mono tracking-wider">MONITORING: {context.ownerAddress.slice(0, 6)}...{context.ownerAddress.slice(-4)}</span>
            </header>

            <main className="w-full max-w-xl space-y-6">
                <div className="text-center mb-8">
                    <Eye className="w-12 h-12 text-stone-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-light text-white mb-2">Protocol Observation</h1>
                    <p className="text-secondary">Verify owner inactivity. Your confirmation is irreversible.</p>
                </div>

                <Card className="p-8 border-stone-800 bg-stone-950/80 backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-xl font-light text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-500" />
                                Protocol Vitality
                            </h2>
                            <p className="text-secondary text-xs mt-1">
                                Real-time monitoring of owner's proof-of-life status.
                            </p>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-mono font-light tracking-tight ${remainingTime < 0 ? 'text-amber-500' : 'text-white'}`}>
                                {remainingTime < 0 ? '0m 0s' : formatDuration(remainingTime)}
                            </div>
                            <div className="text-[10px] text-stone-500 uppercase mt-1">EXPIRY COUNTDOWN</div>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-[10px] text-stone-400 uppercase tracking-widest">
                            <span>Vitality Strength</span>
                            <span>{Math.floor(remainingPct)}%</span>
                        </div>
                        <Progress
                            value={remainingPct}
                            indicatorColor={context.state === ProtocolState.EXECUTING ? 'bg-emerald-500/30' : (remainingPct < 20 ? 'bg-amber-500' : 'bg-emerald-500')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div className="space-y-1">
                            <span className="text-[10px] text-stone-500 uppercase">Current State</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${canConfirm ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                <span className="text-sm text-white font-mono">{context.state}</span>
                            </div>
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="text-[10px] text-stone-500 uppercase">Handshake Sync</span>
                            <div className="text-sm text-white font-mono">
                                {context.state === ProtocolState.EXECUTING ? 'CONFIRMED' : (remainingTime < -20000 ? 'READY' : (remainingTime < 0 ? 'BUFFER' : 'IDLE'))}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-8 flex flex-col items-center text-center space-y-4">
                    <Lock className={`w-8 h-8 ${context.state === ProtocolState.EXECUTING ? 'text-emerald-500' : 'text-stone-600'}`} />
                    <p className="text-sm text-stone-400 max-w-xs">
                        {context.state === ProtocolState.EXECUTING
                            ? "Inactivity confirmed. Vesting protocol has been initiated."
                            : (canConfirm
                                ? "Inactivity threshold reached. Confirm to initiate vesting protocol."
                                : "Owner is active. No action required.")}
                    </p>
                    <Button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        isLoading={isConfirming}
                        variant={canConfirm ? "primary" : "outline"}
                        className={`w-full h-12 ${canConfirm ? 'hover:bg-amber-500/20 border-amber-500/40' : ''}`}
                    >
                        {canConfirm ? "Confirm Inactivity" : (context.state === ProtocolState.EXECUTING ? "Protocol Executing" : "System Normal")}
                    </Button>
                </Card>
            </main>
        </motion.div>
    );
};

export default GuardianView;
