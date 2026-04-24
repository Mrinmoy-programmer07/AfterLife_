import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wallet, Shield, Users } from 'lucide-react';
import { Button } from '../components/ui/Primitives';
import { useConnect } from 'wagmi';

import AnimatedLogo from '../components/AnimatedLogo';
import NetworkSwitcher from '../components/ui/NetworkSwitcher';

const EntryView: React.FC = () => {
  const { connectors, connect } = useConnect();

  const handleConnect = () => {
    const injectedConnector = connectors.find(c => c.id === 'injected');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen relative z-10 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="absolute top-6 right-6">
        <NetworkSwitcher />
      </div>
      <div className="text-center space-y-6 max-w-2xl flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-2"
        >
          <AnimatedLogo size={140} />
        </motion.div>

        <motion.h1
          className="text-6xl md:text-8xl font-thin tracking-tighter text-white mb-2 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          AfterLife
        </motion.h1>

        <motion.p
          className="text-xl text-stone-400 font-light max-w-lg mx-auto leading-relaxed"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Decentralized inheritance protocol. <br />
          Secure your digital legacy with time-locked execution.
        </motion.p>

        <motion.div
          className="pt-12 flex justify-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={handleConnect}
            className="group px-8 py-4 text-lg bg-white text-black hover:bg-stone-200 border-none flex items-center gap-3 transition-transform hover:scale-105"
          >
            <Wallet className="w-5 h-5" />
            Connect Wallet
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        <motion.div
          className="pt-8 flex gap-8 justify-center text-xs text-stone-600 uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span className="flex items-center gap-2"><Shield className="w-3 h-3" /> Self-Custodial</span>
          <span className="flex items-center gap-2"><Users className="w-3 h-3" /> DAO Governed</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EntryView;
