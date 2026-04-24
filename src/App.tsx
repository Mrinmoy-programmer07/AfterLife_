import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useWallet } from './contexts/WalletContext';
import { useAppStore } from './store/useAppStore';
import { UserRole, ProtocolState } from './types';
import TemporalScene from './components/TemporalScene';
import { EventLog } from './components/ui/EventLog';
import EntryView from './views/EntryView';
import RoleSelectionView from './views/RoleSelectionView';
import OwnerView from './views/OwnerView';
import GuardianView from './views/GuardianView';
import BeneficiaryView from './views/BeneficiaryView';

// --------------------------------------------------------------------------
// App Shell
// --------------------------------------------------------------------------

export default function App() {
  const { isConnected } = useWallet();
  const { role, protocolState, events, addEvent } = useAppStore();
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Log wallet connect / disconnect
  useEffect(() => {
    if (isConnected) {
      addEvent('Wallet connected. Select your role to continue.', 'INFO');
    }
  }, [isConnected]);

  const renderView = () => {
    if (!isConnected) return <EntryView />;
    if (role === UserRole.NONE) return <RoleSelectionView />;

    switch (role) {
      case UserRole.OWNER:       return <OwnerView />;
      case UserRole.GUARDIAN:    return <GuardianView />;
      case UserRole.BENEFICIARY: return <BeneficiaryView />;
      default: return <EntryView />;
    }
  };

  return (
    <>
      {/* Cosmic 3D Background — always visible */}
      <TemporalScene state={protocolState} />

      {/* Void gradient overlay for readability */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at center, rgba(5,5,8,0.3) 0%, rgba(5,5,8,0.75) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Main UI */}
      <div className="ui-layer" style={{ position: 'relative', zIndex: 10, minHeight: '100vh' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${isConnected}-${role}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Event Log */}
      <EventLog
        events={events}
        isOpen={isLogOpen}
        onToggle={() => setIsLogOpen(v => !v)}
        currentState={protocolState}
      />

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
          },
          success: { iconTheme: { primary: 'var(--teal)', secondary: 'var(--bg-elevated)' } },
          error:   { iconTheme: { primary: 'var(--crimson)', secondary: 'var(--bg-elevated)' } },
        }}
      />
    </>
  );
}
