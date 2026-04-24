import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Clock, Lock, ArrowRight, Github, Star } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

// ── Animated number ticker ────────────────────────────────────────────────
function Ticker({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = () => {
      start += Math.ceil((to - start) / 12);
      if (start >= to) { setVal(to); return; }
      setVal(start);
      requestAnimationFrame(step);
    };
    const t = setTimeout(step, 1200);
    return () => clearTimeout(t);
  }, [to]);
  return <>{val.toLocaleString()}{suffix}</>;
}

// ── Feature chip ──────────────────────────────────────────────────────────
function FeatureCard({
  icon, title, desc, color, delay,
}: {
  icon: React.ReactNode; title: string; desc: string;
  color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: 'easeOut' }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      style={{
        padding: '28px 24px',
        borderRadius: 16,
        background: 'rgba(14,14,24,0.65)',
        backdropFilter: 'blur(24px)',
        border: `1px solid rgba(255,255,255,0.06)`,
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gradient corner */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `rgba(${color === '#f0c040' ? '240,192,64' : color === '#2dd4bf' ? '45,212,191' : '167,139,250'},0.12)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, marginBottom: 16,
        border: `1px solid ${color}28`,
      }}>
        {icon}
      </div>
      <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', letterSpacing: '0.06em', color: '#f0ece0', marginBottom: 8 }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.78rem', color: '#8b8fa8', lineHeight: 1.65, margin: 0 }}>
        {desc}
      </p>
    </motion.div>
  );
}

// ── Stat block ────────────────────────────────────────────────────────────
function StatBlock({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '2rem', fontWeight: 900, color: '#f0c040', lineHeight: 1 }}>
        <Ticker to={value} suffix={suffix} />
      </div>
      <div style={{ fontSize: '0.65rem', letterSpacing: '0.18em', color: '#4a4d60', textTransform: 'uppercase', marginTop: 6 }}>
        {label}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Shield size={20} />,
    title: 'Trustless Execution',
    desc: 'No middlemen. Your legacy protocol runs autonomously on Stellar Soroban smart contracts.',
    color: '#2dd4bf',
  },
  {
    icon: <Clock size={20} />,
    title: 'Inactivity Triggers',
    desc: 'Customisable deadman thresholds measured in Stellar ledger sequences — precise to 5 seconds.',
    color: '#f0c040',
  },
  {
    icon: <Zap size={20} />,
    title: 'Vesting Schedules',
    desc: 'Linear or cliff vesting unlocks assets predictably. 10% platform fee sustains the protocol.',
    color: '#a78bfa',
  },
  {
    icon: <Lock size={20} />,
    title: 'Guardian Network',
    desc: 'Up to 10 guardians monitor activity and vote to trigger the inheritance protocol.',
    color: '#f97316',
  },
];

// ──────────────────────────────────────────────────────────────────────────

export default function EntryView() {
  const { openModal, isConnecting } = useWallet();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px 40px' }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{ textAlign: 'center', maxWidth: 720, width: '100%' }}
      >
        {/* Pill badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: 999,
            background: 'rgba(45,212,191,0.08)',
            border: '1px solid rgba(45,212,191,0.2)',
            marginBottom: 28,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2dd4bf', boxShadow: '0 0 6px #2dd4bf', display: 'inline-block' }} />
          <span style={{ fontSize: '0.68rem', letterSpacing: '0.18em', color: '#2dd4bf', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }}>
            Live on Stellar Testnet
          </span>
        </motion.div>

        {/* Wordmark */}
        <motion.h1
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.18em' }}
          transition={{ duration: 1.1, delay: 0.25 }}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
            fontWeight: 900,
            color: '#f0c040',
            textShadow: '0 0 50px rgba(240,192,64,0.45), 0 0 100px rgba(240,192,64,0.18)',
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          AFTERLIFE
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontFamily: 'Cinzel, serif', fontSize: '0.78rem',
            letterSpacing: '0.32em', color: '#2dd4bf',
            textTransform: 'uppercase',
            textShadow: '0 0 14px rgba(45,212,191,0.4)',
            marginBottom: 20,
          }}
        >
          Temporal Asset Protocol
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          style={{ color: '#8b8fa8', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: 40, maxWidth: 560, margin: '0 auto 44px' }}
        >
          A decentralized dead-man's switch for crypto inheritance on{' '}
          <span style={{ color: '#f0c040', fontWeight: 600 }}>Stellar</span>.
          Set guardians, vest assets, and guarantee your legacy survives — secured by code alone.
        </motion.p>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: 'spring', bounce: 0.3 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}
        >
          <motion.button
            id="connect-wallet-btn"
            onClick={openModal}
            disabled={isConnecting}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '16px 42px',
              background: 'linear-gradient(135deg, #f0c040 0%, #ffdf70 50%, #d4a520 100%)',
              backgroundSize: '200% auto',
              color: '#0a0808', fontFamily: 'Cinzel, serif',
              fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.15em',
              border: 'none', borderRadius: 14, cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(240,192,64,0.6), 0 0 0 1px rgba(240,192,64,0.3)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              animation: 'shimmer 3s linear infinite',
            }}
          >
            {isConnecting
              ? <><span style={{ width: 16, height: 16, border: '2px solid #0a0808', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> INITIALIZING…</>
              : <><Zap size={18} /> CONNECT WALLET</>
            }
          </motion.button>

          <motion.a
            href="https://github.com/Mrinmoy-programmer07/AfterLife_"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px',
              background: 'rgba(255,255,255,0.04)',
              color: '#8b8fa8', fontFamily: 'Cinzel, serif',
              fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
              textDecoration: 'none', whiteSpace: 'nowrap',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Github size={15} /> View Repo
          </motion.a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ delay: 1.1 }}
          style={{ fontSize: '0.68rem', color: '#4a4d60', letterSpacing: '0.08em' }}
        >
          Freighter · Lobstr · xBull · Albedo · WalletConnect
        </motion.p>
      </motion.div>

        {/* Stats bar removed */}

      {/* ── Feature grid ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14, maxWidth: 900, width: '100%', marginTop: 48,
        }}
      >
        {FEATURES.map((f, i) => (
          <FeatureCard key={i} {...f} delay={1.2 + i * 0.1} />
        ))}
      </motion.div>

      {/* ── Contract badge ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <a
          href="https://stellar.expert/explorer/testnet/contract/CBTAWNMZRYCAR4FFAANJ537CI2W4ZLKM4B4ETN3ZADBSBTTWBS7QW27T"
          target="_blank" rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 8,
            background: 'rgba(240,192,64,0.06)',
            border: '1px solid rgba(240,192,64,0.15)',
            fontSize: '0.65rem', color: '#8b8fa8', fontFamily: 'monospace',
            letterSpacing: '0.04em', textDecoration: 'none',
          }}
        >
          <Star size={11} color="#f0c040" />
          CBTAWN…VW27T
          <span style={{ color: '#f0c040' }}>↗</span>
        </a>
      </motion.div>

      {/* ── Network indicator ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', color: '#4a4d60', fontFamily: 'monospace' }}
      >
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ width: 5, height: 5, borderRadius: '50%', background: '#2dd4bf', boxShadow: '0 0 6px #2dd4bf', display: 'inline-block' }}
        />
        STELLAR TESTNET
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>
    </div>
  );
}
