import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '../types';
import { Card, Button } from '../components/ui/Primitives';
import { Shield, Key, Clock, ArrowRight, LogOut } from 'lucide-react';

import NetworkSwitcher from '../components/ui/NetworkSwitcher';

interface RoleSelectionViewProps {
    onSelectRole: (role: UserRole, targetOwner?: string) => void;
    connectedAddress?: string | null;
    onDisconnect?: () => void;
}

const RoleCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    role: UserRole;
    onClick: () => void;
}> = ({ title, description, icon, role, onClick }) => (
    <Card
        className="group cursor-pointer relative overflow-hidden border-white/5 hover:border-white/20"
        hoverEffect={true}
        onClick={onClick}
    >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            {icon}
        </div>
        <div className="flex flex-col h-full justify-between relative z-10">
            <div className="mb-4">
                <div className="p-3 bg-white/5 w-fit rounded-lg mb-4 text-primary group-hover:text-white group-hover:bg-white/10 transition-colors">
                    {icon}
                </div>
                <h3 className="text-xl font-light text-white mb-2">{title}</h3>
                <p className="text-secondary text-sm leading-relaxed">{description}</p>
            </div>
            <div className="flex items-center text-xs text-secondary/50 group-hover:text-primary transition-colors">
                <span>Enter Dashboard</span> <ArrowRight className="w-3 h-3 ml-2" />
            </div>
        </div>
    </Card>
);

const RoleSelectionView: React.FC<RoleSelectionViewProps> = ({ onSelectRole, connectedAddress, onDisconnect }) => {
    const [selectedRole, setSelectedRole] = React.useState<UserRole | null>(null);
    const [targetOwner, setTargetOwner] = React.useState('');

    const handleConfirm = () => {
        if (selectedRole) {
            onSelectRole(selectedRole, targetOwner || undefined);
        }
    };

    return (
        <motion.div
            className="flex flex-col items-center justify-center min-h-screen p-6 pt-24 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="absolute top-6 right-6 flex items-center gap-3">
                <NetworkSwitcher />
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${connectedAddress ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-xs font-mono text-stone-400">
                        {connectedAddress ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}` : 'Connecting...'}
                    </span>
                </div>
                {onDisconnect && (
                    <Button variant="outline" onClick={onDisconnect} className="gap-2 text-xs py-1 px-3">
                        <LogOut className="w-3 h-3" /> Disconnect
                    </Button>
                )}
            </div>

            <div className="text-center mb-12 space-y-4">
                <h2 className="text-3xl font-light text-white">Select Identity</h2>
                <p className="text-stone-400">Choose a dashboard to access with your connected wallet.</p>
            </div>

            <AnimatePresence mode="wait">
                {!selectedRole ? (
                    <motion.div
                        key="roles"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full"
                    >
                        <RoleCard
                            role={UserRole.OWNER}
                            title="Owner"
                            description="Configure protocol parameters, monitor liveliness, and prove life."
                            icon={<Key className="w-6 h-6" />}
                            onClick={() => onSelectRole(UserRole.OWNER)}
                        />

                        <RoleCard
                            role={UserRole.GUARDIAN}
                            title="Guardian"
                            description="Monitor inactivity thresholds and verify protocol triggers."
                            icon={<Shield className="w-6 h-6" />}
                            onClick={() => setSelectedRole(UserRole.GUARDIAN)}
                        />

                        <RoleCard
                            role={UserRole.BENEFICIARY}
                            title="Beneficiary"
                            description="Monitor vesting schedules and claim assets."
                            icon={<Clock className="w-6 h-6" />}
                            onClick={() => setSelectedRole(UserRole.BENEFICIARY)}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="address-input"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-md"
                    >
                        <Card className="p-8 border-white/10 bg-stone-950/80 backdrop-blur-xl">
                            <Button
                                variant="ghost"
                                className="mb-6 p-0 h-auto hover:bg-transparent text-secondary hover:text-white flex items-center gap-2"
                                onClick={() => setSelectedRole(null)}
                            >
                                <ArrowRight className="w-4 h-4 rotate-180" /> Back to roles
                            </Button>

                            <h3 className="text-2xl font-light text-white mb-2">Connect to Protocol</h3>
                            <p className="text-secondary text-sm mb-6">Enter the wallet address of the Owner you are monitoring.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-stone-500 mb-1 block">Owner Address</label>
                                    <input
                                        type="text"
                                        placeholder="0x..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-emerald-500/50 outline-none transition-colors"
                                        value={targetOwner}
                                        onChange={(e) => setTargetOwner(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <Button
                                    className="w-full bg-white text-black hover:bg-stone-200"
                                    onClick={handleConfirm}
                                    disabled={!targetOwner.startsWith('0x') || targetOwner.length !== 42}
                                >
                                    Access Dashboard
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default RoleSelectionView;
