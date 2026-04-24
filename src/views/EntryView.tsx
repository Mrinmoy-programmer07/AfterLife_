import { motion } from 'framer-motion';
import { Shield, Zap, Clock } from 'lucide-react';
import AnimatedLogo from '../components/AnimatedLogo';
import { useWallet } from '../contexts/WalletContext';

const FEATURES = [
  { icon: <Shield size={18} />, title: 'Trustless Execution', desc: 'No central authority. Your protocol runs on Stellar smart contracts.' },
  { icon: <Clock size={18} />,  title: 'Time-Based Triggers', desc: 'Customizable inactivity thresholds measured in Stellar ledger sequences.' },
  { icon: <Zap size={18} />,   title: 'Vesting Schedules', desc: 'Linear or cliff vesting ensures assets unlock predictably for beneficiaries.' },
];

export default function EntryView() {
  const { openModal, isConnecting } = useWallet();

  return (
    <div className="full-page ui-layer flex flex-col flex-center" style={{ minHeight: '100vh', padding: '40px 24px' }}>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}
      >
        {/* Logo */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}
        >
          <AnimatedLogo size={100} animate showWordmark={false} />
        </motion.div>

        {/* Wordmark */}
        <motion.h1
          initial={{ opacity: 0, letterSpacing: '0.5em' }}
          animate={{ opacity: 1, letterSpacing: '0.22em' }}
          transition={{ duration: 1.2, delay: 0.3 }}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 'clamp(2.4rem, 7vw, 4.5rem)',
            fontWeight: 900,
            color: '#f0c040',
            textShadow: '0 0 40px rgba(240,192,64,0.4), 0 0 80px rgba(240,192,64,0.15)',
            marginBottom: 12,
          }}
        >
          AFTERLIFE
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '0.85rem',
            letterSpacing: '0.3em',
            color: 'var(--teal)',
            textTransform: 'uppercase',
            textShadow: '0 0 16px rgba(45,212,191,0.4)',
            marginBottom: 12,
          }}
        >
          Temporal Asset Protocol
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: 48, lineHeight: 1.7 }}
        >
          A decentralized dead man's switch for secure crypto inheritance on
          the <span style={{ color: 'var(--gold-bright)' }}>Stellar</span> blockchain.
          Your legacy, secured by code.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, type: 'spring' }}
        >
          <button
            id="connect-wallet-btn"
            className="btn btn-primary btn-lg"
            onClick={openModal}
            disabled={isConnecting}
            style={{ minWidth: 240 }}
          >
            {isConnecting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
                Connecting…
              </span>
            ) : '⟁ INITIATE PROTOCOL'}
          </button>
        </motion.div>

        {/* Wallet hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.4 }}
          style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 16, letterSpacing: '0.06em' }}
        >
          Freighter · Lobstr · xBull · Albedo supported
        </motion.p>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          maxWidth: 700,
          width: '100%',
          marginTop: 64,
        }}
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={i}
            className="glass"
            whileHover={{ y: -4, borderColor: 'var(--border-hover)' }}
            style={{ padding: '24px 20px', textAlign: 'center' }}
          >
            <div style={{ color: 'var(--gold-bright)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
              {f.icon}
            </div>
            <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', letterSpacing: '0.08em', marginBottom: 8, color: 'var(--text-primary)' }}>
              {f.title}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {f.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Network indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 6px var(--teal)', display: 'inline-block' }} />
        STELLAR TESTNET
      </motion.div>
    </div>
  );
}
