import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Gift, LogOut, RefreshCw, TrendingUp, Coins } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAfterLifeContract } from '../hooks/useAfterLifeContract';
import { useAppStore } from '../store/useAppStore';
import { UserRole, Beneficiary, ClaimInfo, ProtocolState } from '../types';
import { formatXlm, ledgersToTime, truncate } from '../services/stellarService';
import AnimatedLogo from '../components/AnimatedLogo';
import { StateBadge } from '../components/ui/EventLog';
import toast from 'react-hot-toast';

export default function BeneficiaryView() {
  const { publicKey, disconnect } = useWallet();
  const { claim, getClaimable, getBeneficiaries, getProtocol, getBalance } = useAfterLifeContract();
  const { targetOwner, setRole, addEvent, triggerRefresh } = useAppStore();

  const [myBeneficiary, setMyBeneficiary] = useState<Beneficiary | null>(null);
  const [claimInfo,     setClaimInfo]     = useState<ClaimInfo | null>(null);
  const [vaultBal,      setVaultBal]      = useState<bigint>(0n);
  const [isDead,        setIsDead]        = useState(false);
  const [claiming,      setClaiming]      = useState(false);
  const [isSyncing,     setIsSyncing]     = useState(false);

  const sync = useCallback(async () => {
    if (!publicKey || !targetOwner) return;
    setIsSyncing(true);
    try {
      const [protocol, benes, bal, info] = await Promise.all([
        getProtocol(targetOwner),
        getBeneficiaries(targetOwner),
        getBalance(targetOwner),
        getClaimable(targetOwner, publicKey),
      ]);
      setIsDead(protocol?.isDead ?? false);
      setVaultBal(bal);
      setClaimInfo(info);

      const me = (benes ?? []).find(b => b.wallet.toLowerCase() === publicKey.toLowerCase());
      setMyBeneficiary(me ?? null);
    } catch { /* ignore */ }
    finally { setIsSyncing(false); }
  }, [publicKey, targetOwner]);

  useEffect(() => { sync(); }, []);
  useEffect(() => { const t = setInterval(sync, 15_000); return () => clearInterval(t); }, [sync]);

  const handleClaim = async () => {
    if (!claimInfo || claimInfo.claimable <= 0n) return toast.error('Nothing to claim yet.');
    setClaiming(true);
    const tid = toast.loading('Claiming your XLM allocation…');
    try {
      await claim(targetOwner);
      const received = Number(claimInfo.claimable - claimInfo.claimable / 10n) / 10_000_000;
      toast.success(`Claimed ${received.toFixed(4)} XLM (after 10% fee)!`, { id: tid });
      addEvent(`Claimed ${received.toFixed(4)} XLM from ${truncate(targetOwner)}.`, 'INFO');
      triggerRefresh();
      sync();
    } catch (err: any) {
      toast.error(err.message ?? 'Claim failed', { id: tid });
    } finally {
      setClaiming(false);
    }
  };

  const vestingPct = claimInfo && claimInfo.totalEntitlement > 0n
    ? Math.min(Number(claimInfo.vestedAmount * 100n / claimInfo.totalEntitlement), 100)
    : 0;

  const claimedPct = claimInfo && claimInfo.totalEntitlement > 0n
    ? Math.min(Number(claimInfo.alreadyClaimed * 100n / claimInfo.totalEntitlement), 100)
    : 0;

  const protocolState = isDead ? ProtocolState.EXECUTING : ProtocolState.ACTIVE;

  return (
    <div className="full-page ui-layer" style={{ minHeight: '100vh' }}>
      {/* ---- Top Actions ---- */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0', maxWidth: 700, margin: '0 auto' }}>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => setRole(UserRole.NONE)}
          style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.1em' }}
        >
          &larr; Switch Role
        </button>
      </div>

      <div className="container" style={{ padding: '40px 24px', maxWidth: 700 }}>
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', marginBottom: 6 }}>Beneficiary Panel</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Owner: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{truncate(targetOwner, 10)}</span>
          </p>
        </motion.div>

        {/* My allocation card */}
        {myBeneficiary && (
          <motion.div className="glass-gold" style={{ padding: '24px 28px', marginBottom: 20 }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Gift size={18} color="var(--gold-bright)" />
              <span style={{ fontFamily: 'Cinzel, serif', color: 'var(--text-primary)', fontSize: '1rem' }}>
                {myBeneficiary.name}'s Allocation
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Share', value: `${(myBeneficiary.allocationBps / 100).toFixed(1)}%`, color: 'var(--gold-bright)' },
                { label: 'Total Entitlement', value: claimInfo ? `${formatXlm(claimInfo.totalEntitlement)} XLM` : '—', color: 'var(--text-primary)' },
                { label: 'Vesting Type', value: myBeneficiary.vestingType, color: 'var(--teal)' },
                { label: 'Duration', value: ledgersToTime(myBeneficiary.vestingDurationLedgers), color: 'var(--text-secondary)' },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="stat-label">{s.label}</div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: s.color, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Vesting progress */}
        {isDead && claimInfo && (
          <motion.div className="glass" style={{ padding: '24px 28px', marginBottom: 20 }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TrendingUp size={15} color="var(--gold-bright)" />
              <div className="section-title">Vesting Progress</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Vested</span><span>{vestingPct.toFixed(1)}%</span>
              </div>
              <div className="progress-bar" style={{ height: 8, marginBottom: 4 }}>
                <div className="progress-fill" style={{ width: `${vestingPct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Claimed</span><span>{claimedPct.toFixed(1)}%</span>
              </div>
              <div className="progress-bar" style={{ height: 5 }}>
                <div className="progress-fill teal" style={{ width: `${claimedPct}%` }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="stat-card">
                <div className="stat-label">Claimable Now</div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: claimInfo.claimable > 0n ? 'var(--gold-bright)' : 'var(--text-muted)' }}>
                  {formatXlm(claimInfo.claimable)} XLM
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Already Claimed</div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: 'var(--teal)' }}>
                  {formatXlm(claimInfo.alreadyClaimed)} XLM
                </div>
              </div>
            </div>

            {/* Platform fee notice */}
            {claimInfo.claimable > 0n && (
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center' }}>
                Note: 10% platform fee applied on claim. You'll receive {formatXlm(claimInfo.claimable - claimInfo.claimable / 10n)} XLM.
              </p>
            )}

            <button
              id="claim-btn"
              className={`btn btn-full ${claimInfo.claimable > 0n ? 'btn-primary' : 'btn-ghost'}`}
              onClick={handleClaim}
              disabled={claimInfo.claimable <= 0n || claiming}
            >
              {claiming ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
                  Claiming…
                </span>
              ) : claimInfo.claimable > 0n ? (
                <><Coins size={15} /> CLAIM {formatXlm(claimInfo.claimable)} XLM</>
              ) : (
                'Nothing to claim yet'
              )}
            </button>
          </motion.div>
        )}

        {/* Protocol not dead yet */}
        {!isDead && (
          <motion.div className="glass" style={{ padding: 32, textAlign: 'center' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <h3 style={{ fontFamily: 'Cinzel, serif', color: 'var(--text-primary)', marginBottom: 8 }}>Awaiting Execution</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>
              The owner's protocol is still <strong style={{ color: 'var(--state-active)' }}>ACTIVE</strong>.
              Once a guardian confirms inactivity and the protocol enters <strong style={{ color: 'var(--state-executing)' }}>EXECUTING</strong> state,
              your vesting schedule will begin and you can start claiming.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
