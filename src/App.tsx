import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useWallet } from './contexts/WalletContext';
import { useAppStore } from './store/useAppStore';
import { UserRole, ProtocolState } from './types';
import TemporalScene from './components/TemporalScene';
import IntroScreen from './components/IntroScreen';
import { EventLog } from './components/ui/EventLog';
import EntryView from './views/EntryView';
import RoleSelectionView from './views/RoleSelectionView';
import OwnerView from './views/OwnerView';
import GuardianView from './views/GuardianView';
import BeneficiaryView from './views/BeneficiaryView';

// ── Top navbar ────────────────────────────────────────────────────────────

function Navbar() {
  const { isConnected, publicKey, openModal, disconnect } = useWallet();
  const { role, setRole, protocolState } = useAppStore();

  const stateColors: Record<ProtocolState, string> = {
    [ProtocolState.ACTIVE]:    '#2dd4bf',
    [ProtocolState.WARNING]:   '#f0c040',
    [ProtocolState.PENDING]:   '#f97316',
    [ProtocolState.EXECUTING]: '#c9484c',
    [ProtocolState.COMPLETED]: '#2dd4bf',
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px',
        background: 'rgba(5,5,8,0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(240,192,64,0.08)',
      }}
    >
      {/* Logo */}
      <button
        onClick={() => setRole(UserRole.NONE)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" stroke="#f0c040" strokeWidth="1.5" opacity="0.5" />
          <path d="M22 14 L58 14 L40 40 L58 66 L22 66 L40 40 Z"
            fill="none" stroke="#f0c040" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', fontWeight: 700, color: '#f0c040', letterSpacing: '0.15em' }}>
          AFTERLIFE
        </span>
      </button>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Protocol state indicator */}
        {isConnected && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 8,
            background: `rgba(${protocolState === ProtocolState.ACTIVE ? '45,212,191' : '240,192,64'},0.08)`,
            border: `1px solid ${stateColors[protocolState]}28`,
            fontSize: '0.62rem', letterSpacing: '0.14em',
            color: stateColors[protocolState],
            fontFamily: 'Cinzel, serif', textTransform: 'uppercase',
          }}>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: stateColors[protocolState], display: 'inline-block' }}
            />
            {protocolState}
          </div>
        )}

        {/* Wallet button */}
        {isConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.72rem', color: '#8b8fa8', fontFamily: 'monospace', letterSpacing: '0.04em',
            }}>
              {publicKey ? `${publicKey.slice(0, 6)}…${publicKey.slice(-4)}` : ''}
            </div>
            <button
              onClick={disconnect}
              style={{
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(201,72,76,0.08)', border: '1px solid rgba(201,72,76,0.2)',
                color: '#c9484c', fontSize: '0.68rem', fontFamily: 'Cinzel, serif',
                letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={openModal}
            style={{
              padding: '7px 18px', borderRadius: 8,
              background: 'linear-gradient(135deg, #f0c040, #d4a520)',
              color: '#0a0808', fontFamily: 'Cinzel, serif',
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em',
              border: 'none', cursor: 'pointer',
            }}
          >
            Connect Wallet
          </button>
        )}
      </div>
    </motion.nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────

export default function App() {
  const { isConnected } = useWallet();
  const { role, protocolState, events, addEvent } = useAppStore();
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const hasLoggedConnect = useRef(false);

  useEffect(() => {
    if (isConnected && !hasLoggedConnect.current) {
      hasLoggedConnect.current = true;
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
      {/* ── Cinematic intro ── */}
      <AnimatePresence>
        {!introDone && <IntroScreen key="intro" onDone={() => setIntroDone(true)} />}
      </AnimatePresence>

      {/* ── 3D background ── */}
      <TemporalScene state={protocolState} />

      {/* ── Depth gradient overlay ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 120% 80% at 50% 40%, rgba(5,5,8,0.15) 0%, rgba(5,5,8,0.72) 100%)',
      }} />

      {/* ── Main UI ── */}
      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh' }}>
        <Navbar />

        {/* Page content with top padding for navbar */}
        <div style={{ paddingTop: 64 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${isConnected}-${role}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Event log ── */}
      <EventLog
        events={events}
        isOpen={isLogOpen}
        onToggle={() => setIsLogOpen((v) => !v)}
        currentState={protocolState}
      />

      {/* ── Toast ── */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#141420',
            color: '#f0ece0',
            border: '1px solid rgba(240,192,64,0.12)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.85rem',
            borderRadius: 12,
          },
          success: { iconTheme: { primary: '#2dd4bf', secondary: '#141420' } },
          error:   { iconTheme: { primary: '#c9484c', secondary: '#141420' } },
        }}
      />
    </>
  );
}
