import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Gift, ChevronRight, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAfterLifeContract } from '../hooks/useAfterLifeContract';
import { useWallet } from '../contexts/WalletContext';
import { UserRole } from '../types';

const ROLES = [
  {
    role:  UserRole.OWNER,
    icon:  <User size={28} />,
    label: 'Owner',
    sub:   'Protocol Creator',
    desc:  'Register your protocol, deposit XLM, manage guardians & beneficiaries, and send heartbeats.',
    color: '#f0c040',
    glow:  'rgba(240,192,64,0.15)',
    border:'rgba(240,192,64,0.25)',
    actions: ['Register Protocol', 'Deposit & Withdraw', 'Manage Guardians', 'Prove Life (Heartbeat)'],
  },
  {
    role:  UserRole.GUARDIAN,
    icon:  <Shield size={28} />,
    label: 'Guardian',
    sub:   'Inactivity Oracle',
    desc:  'Monitor an owner\'s activity. Confirm inactivity once the threshold passes to trigger inheritance.',
    color: '#2dd4bf',
    glow:  'rgba(45,212,191,0.15)',
    border:'rgba(45,212,191,0.25)',
    actions: ['Monitor Owner Activity', 'Confirm Inactivity', 'View Protocol State'],
  },
  {
    role:  UserRole.BENEFICIARY,
    icon:  <Gift size={28} />,
    label: 'Beneficiary',
    sub:   'Asset Receiver',
    desc:  'Claim your allocated XLM once the inheritance protocol executes and your vesting schedule allows.',
    color: '#c9484c',
    glow:  'rgba(201,72,76,0.15)',
    border:'rgba(201,72,76,0.25)',
    actions: ['Check Vesting Progress', 'Claim Inheritance', 'View Allocation Details'],
  },
];

export default function RoleSelectionView() {
  const { setRole } = useAppStore();
  const { publicKey } = useWallet();
  const { isRegistered } = useAfterLifeContract();
  const [ownerAddress, setOwnerAddress] = useState('');
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = async (role: UserRole) => {
    if (role === UserRole.OWNER) { setRole(role); return; }
    if (!ownerAddress || ownerAddress.length !== 56) {
      setError('Enter a valid 56-character Stellar owner address (G…)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const ok = await isRegistered(ownerAddress);
      if (!ok) { setError('No AfterLife protocol found for that address.'); }
      else { setRole(role); }
    } catch { setError('Could not query the contract. Check your address.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: 48 }}
      >
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', color: '#f0ece0', letterSpacing: '0.06em', marginBottom: 10 }}>
          Select Your Role
        </h1>
        <p style={{ color: '#8b8fa8', fontSize: '0.9rem' }}>
          How do you interact with the AfterLife protocol?
        </p>
      </motion.div>

      {/* Owner address input (for Guardian / Beneficiary) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{ width: '100%', maxWidth: 520, marginBottom: 32 }}
      >
        <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.16em', color: '#4a4d60', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', marginBottom: 8 }}>
          ⓘ Owner Address (required for Guardian / Beneficiary)
        </label>
        <input
          className="input"
          value={ownerAddress}
          onChange={(e) => { setOwnerAddress(e.target.value); setError(''); }}
          placeholder="G… (56 character Stellar public key)"
          spellCheck={false}
        />
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#c9484c', fontSize: '0.75rem' }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}
      </motion.div>

      {/* Role cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, maxWidth: 920, width: '100%' }}>
        {ROLES.map((r, i) => (
          <motion.div
            key={r.role}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            onHoverStart={() => setHoveredRole(r.role)}
            onHoverEnd={() => setHoveredRole(null)}
            onClick={() => handleSelect(r.role)}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '28px 24px',
              borderRadius: 18,
              background: hoveredRole === r.role ? `rgba(14,14,24,0.9)` : 'rgba(14,14,24,0.7)',
              backdropFilter: 'blur(24px)',
              border: `1px solid ${hoveredRole === r.role ? r.border : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s',
              boxShadow: hoveredRole === r.role 
                ? `0 0 40px ${r.glow}, inset 0 2px 20px ${r.glow}` 
                : `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}
          >
            {/* Top accent line */}
            <motion.div
              animate={{ scaleX: hoveredRole === r.role ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${r.color}, transparent)`, transformOrigin: 'center' }}
            />

            {/* Icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: `linear-gradient(135deg, ${r.glow}, transparent)`,
              border: `1px solid ${r.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: r.color, marginBottom: 18,
            }}>
              {r.icon}
            </div>

            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', fontWeight: 700, color: '#f0ece0', marginBottom: 4 }}>
              {r.label}
            </div>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.16em', color: r.color, textTransform: 'uppercase', fontFamily: 'Cinzel, serif', marginBottom: 14 }}>
              {r.sub}
            </div>

            <p style={{ fontSize: '0.8rem', color: '#8b8fa8', lineHeight: 1.65, marginBottom: 20 }}>
              {r.desc}
            </p>

            {/* Capabilities */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {r.actions.map((a) => (
                <li key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#6b6f88' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                  {a}
                </li>
              ))}
            </ul>

            {/* Select button */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10,
              background: hoveredRole === r.role ? `linear-gradient(135deg, ${r.glow}, transparent)` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${hoveredRole === r.role ? r.border : 'rgba(255,255,255,0.1)'}`,
              transition: 'all 0.3s',
            }}>
              <span style={{ fontSize: '0.73rem', fontFamily: 'Cinzel, serif', color: hoveredRole === r.role ? r.color : '#8b8fa8', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: hoveredRole === r.role ? 700 : 500 }}>
                {loading ? 'Verifying…' : `Enter as ${r.label}`}
              </span>
              <ChevronRight size={16} color={hoveredRole === r.role ? r.color : '#8b8fa8'} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
