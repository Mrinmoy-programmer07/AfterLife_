import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Gift, LogOut, AlertCircle } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAfterLifeContract } from '../hooks/useAfterLifeContract';
import { useAppStore } from '../store/useAppStore';
import { UserRole } from '../types';
import AnimatedLogo from '../components/AnimatedLogo';
import { truncate, isValidStellarAddress } from '../services/stellarService';
import toast from 'react-hot-toast';

const ROLES = [
  {
    id: UserRole.OWNER,
    icon: <User size={28} />,
    title: 'Owner',
    subtitle: 'Protocol Creator',
    desc: 'Register your protocol, deposit XLM, manage guardians & beneficiaries, and send heartbeats to prove you are alive.',
    color: 'var(--gold-bright)',
    glow: 'rgba(240,192,64,0.2)',
  },
  {
    id: UserRole.GUARDIAN,
    icon: <Shield size={28} />,
    title: 'Guardian',
    subtitle: 'Inactivity Oracle',
    desc: 'Monitor an owner and confirm inactivity when the threshold passes. You have zero access to funds.',
    color: 'var(--teal)',
    glow: 'rgba(45,212,191,0.2)',
  },
  {
    id: UserRole.BENEFICIARY,
    icon: <Gift size={28} />,
    title: 'Beneficiary',
    subtitle: 'Asset Receiver',
    desc: "Claim your allocated XLM once an owner's protocol has entered execution and your vesting schedule allows.",
    color: 'var(--crimson)',
    glow: 'rgba(201,72,76,0.2)',
  },
];

export default function RoleSelectionView() {
  const { publicKey, disconnect } = useWallet();
  const { isRegistered, getGuardians, getBeneficiaries } = useAfterLifeContract();
  const { setRole, setTargetOwner, addEvent } = useAppStore();
  const [ownerInput, setOwnerInput] = useState('');
  const [pending, setPending] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectRole = async (role: UserRole) => {
    if (!publicKey) return;
    setPending(role);

    if (role === UserRole.OWNER) {
      setLoading(true);
      try {
        const reg = await isRegistered(publicKey);
        setTargetOwner(publicKey);
        setRole(UserRole.OWNER);
        addEvent(reg ? `Owner dashboard accessed by ${truncate(publicKey)}.` : `New owner: ${truncate(publicKey)} — please register to begin.`, 'INFO');
      } catch (err: any) {
        toast.error('Could not verify registration. Check RPC connection.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Guardian / Beneficiary need an owner address
    if (!ownerInput) {
      toast.error('Please enter the owner\'s Stellar address.');
      setPending(null);
      return;
    }
    if (!isValidStellarAddress(ownerInput)) {
      toast.error('Invalid Stellar address (must start with G and be 56 chars).');
      setPending(null);
      return;
    }

    setLoading(true);
    try {
      if (role === UserRole.GUARDIAN) {
        const guardians = await getGuardians(ownerInput);
        const isGuardian = guardians.some(g => g.wallet.toLowerCase() === publicKey.toLowerCase());
        if (!isGuardian) {
          toast.error('Access denied: you are not a guardian for this owner.');
          addEvent(`Auth failed: ${truncate(publicKey)} is not a guardian.`, 'WARNING');
          setPending(null);
          setLoading(false);
          return;
        }
        setTargetOwner(ownerInput);
        setRole(UserRole.GUARDIAN);
        addEvent(`Guardian ${truncate(publicKey)} authenticated for ${truncate(ownerInput)}.`, 'INFO');
      }

      if (role === UserRole.BENEFICIARY) {
        const beneficiaries = await getBeneficiaries(ownerInput);
        const isBeneficiary = beneficiaries.some(b => b.wallet.toLowerCase() === publicKey.toLowerCase());
        if (!isBeneficiary) {
          toast.error('Access denied: you are not a beneficiary for this owner.');
          addEvent(`Auth failed: ${truncate(publicKey)} is not a beneficiary.`, 'WARNING');
          setPending(null);
          setLoading(false);
          return;
        }
        setTargetOwner(ownerInput);
        setRole(UserRole.BENEFICIARY);
        addEvent(`Beneficiary ${truncate(publicKey)} authenticated for ${truncate(ownerInput)}.`, 'INFO');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
      setPending(null);
    }
  };

  return (
    <div className="full-page ui-layer flex flex-col" style={{ minHeight: '100vh', padding: '32px 24px' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AnimatedLogo size={36} />
          <span style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.2em', color: 'var(--gold-bright)', fontSize: '0.85rem' }}>
            AFTERLIFE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 999 }}>
            {truncate(publicKey ?? '', 8)}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={disconnect} id="disconnect-btn">
            <LogOut size={13} /> Disconnect
          </button>
        </div>
      </div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: 48 }}
      >
        <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--text-primary)', marginBottom: 8 }}>
          Select Your Role
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Choose how you interact with the AfterLife protocol.
        </p>
      </motion.div>

      {/* Owner address input (for Guardian / Beneficiary) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ maxWidth: 560, margin: '0 auto 40px', width: '100%' }}
      >
        <label className="input-label" htmlFor="owner-address-input" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={11} /> Owner Address (required for Guardian / Beneficiary)
        </label>
        <input
          id="owner-address-input"
          className="input"
          placeholder="G... (56 character Stellar public key)"
          value={ownerInput}
          onChange={e => setOwnerInput(e.target.value.trim())}
          spellCheck={false}
        />
      </motion.div>

      {/* Role cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 20,
        maxWidth: 800,
        margin: '0 auto',
        width: '100%',
      }}>
        {ROLES.map((r, i) => (
          <motion.button
            key={r.id}
            id={`role-btn-${r.id.toLowerCase()}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (i + 1) }}
            whileHover={{ y: -6, boxShadow: `0 16px 48px ${r.glow}` }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelectRole(r.id)}
            disabled={loading}
            style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${pending === r.id ? r.color : 'var(--border-default)'}`,
              borderRadius: 20,
              padding: '32px 24px',
              cursor: loading ? 'wait' : 'pointer',
              textAlign: 'left',
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Gradient overlay */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.06,
              background: `radial-gradient(circle at top left, ${r.color}, transparent 70%)`,
            }} />

            {/* Icon */}
            <div style={{ color: r.color, marginBottom: 16, filter: `drop-shadow(0 0 8px ${r.glow})` }}>
              {r.icon}
            </div>

            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', fontWeight: 700, color: r.color, marginBottom: 4 }}>
              {r.title}
            </div>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'var(--font-display)' }}>
              {r.subtitle}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {r.desc}
            </p>

            {pending === r.id && loading && (
              <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
                <div style={{ width: 16, height: 16, border: `2px solid ${r.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
