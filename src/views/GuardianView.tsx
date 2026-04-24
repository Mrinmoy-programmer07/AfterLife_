import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle, LogOut, RefreshCw, Eye } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAfterLifeContract } from '../hooks/useAfterLifeContract';
import { useAppStore } from '../store/useAppStore';
import { UserRole, ProtocolState, Protocol } from '../types';
import { ledgersToTime, truncate, formatXlm } from '../services/stellarService';
import AnimatedLogo from '../components/AnimatedLogo';
import { StateBadge } from '../components/ui/EventLog';
import toast from 'react-hot-toast';

export default function GuardianView() {
  const { publicKey, disconnect } = useWallet();
  const { confirmInactivity, getProtocol, getBalance } = useAfterLifeContract();
  const { targetOwner, setRole, addEvent, triggerRefresh } = useAppStore();

  const [protocol,    setProtocol]    = useState<Protocol | null>(null);
  const [vaultBal,    setVaultBal]    = useState<bigint>(0n);
  const [currentLedger, setCurrentLedger] = useState(0);
  const [isSyncing,   setIsSyncing]   = useState(false);
  const [confirming,  setConfirming]  = useState(false);

  const sync = useCallback(async () => {
    if (!targetOwner) return;
    setIsSyncing(true);
    try {
      const [p, bal] = await Promise.all([getProtocol(targetOwner), getBalance(targetOwner)]);
      setProtocol(p);
      setVaultBal(bal);
    } catch { /* ignore */ }
    finally { setIsSyncing(false); }
  }, [targetOwner]);

  useEffect(() => { sync(); }, []);
  useEffect(() => {
    const t = setInterval(sync, 15_000);
    return () => clearInterval(t);
  }, [sync]);

  // Derived inactivity state
  const ledgersSinceHeartbeat = protocol
    ? Math.max(0, currentLedger - protocol.lastHeartbeatLedger)
    : 0;
  const threshold = protocol?.inactivityThresholdLedgers ?? 1;
  const inactivityPct = Math.min((ledgersSinceHeartbeat / threshold) * 100, 100);
  const canConfirm = !protocol?.isDead && ledgersSinceHeartbeat > threshold;

  // Update "current ledger" locally every 5s (approximate)
  useEffect(() => {
    if (protocol) setCurrentLedger(protocol.lastHeartbeatLedger + ledgersSinceHeartbeat);
    const interval = setInterval(() => setCurrentLedger(c => c + 1), 5000);
    return () => clearInterval(interval);
  }, [protocol]);

  const handleConfirmInactivity = async () => {
    if (!canConfirm) return;
    if (!confirm(`Confirm inactivity for ${truncate(targetOwner)}? This will trigger the inheritance protocol.`)) return;
    setConfirming(true);
    const tid = toast.loading('Confirming inactivity on-chain…');
    try {
      await confirmInactivity(targetOwner);
      toast.success('Inactivity confirmed. Protocol is now EXECUTING.', { id: tid });
      addEvent(`Guardian confirmed inactivity of ${truncate(targetOwner)}.`, 'CRITICAL');
      triggerRefresh();
      sync();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to confirm', { id: tid });
    } finally {
      setConfirming(false);
    }
  };

  const protocolState = protocol?.isDead ? ProtocolState.EXECUTING
    : inactivityPct >= 100 ? ProtocolState.PENDING
    : inactivityPct >= 70  ? ProtocolState.WARNING
    : ProtocolState.ACTIVE;

  return (
    <div className="full-page ui-layer" style={{ minHeight: '100vh' }}>
      {/* ---- Top Actions ---- */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0', maxWidth: 760, margin: '0 auto' }}>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => setRole(UserRole.NONE)}
          style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.1em' }}
        >
          &larr; Switch Role
        </button>
      </div>

      <div className="container" style={{ padding: '40px 24px', maxWidth: 760 }}>
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', marginBottom: 6 }}>Guardian Panel</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={13} /> Monitoring: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{truncate(targetOwner, 10)}</span>
          </p>
        </motion.div>

        {/* Inactivity Meter */}
        <motion.div className="glass" style={{ padding: '28px 28px', marginBottom: 24 }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="section-title" style={{ marginBottom: 6 }}>Inactivity Monitor</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Threshold: {protocol ? ledgersToTime(protocol.inactivityThresholdLedgers) : '—'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '2rem', color: inactivityPct >= 100 ? 'var(--crimson)' : inactivityPct >= 70 ? 'var(--gold-bright)' : 'var(--teal)' }}>
                {inactivityPct.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>of threshold</div>
            </div>
          </div>

          <div className="progress-bar" style={{ height: 10, marginBottom: 16 }}>
            <div className={`progress-fill ${inactivityPct >= 100 ? 'crimson' : inactivityPct >= 70 ? '' : 'teal'}`}
              style={{ width: `${inactivityPct}%` }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-label"><Clock size={10} style={{ display: 'inline', marginRight: 4 }} />Inactive For</div>
              <div className="stat-value" style={{ fontSize: '1.1rem' }}>{ledgersToTime(ledgersSinceHeartbeat)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Vault Balance</div>
              <div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatXlm(vaultBal)} XLM</div>
            </div>
          </div>

          {/* Confirm Inactivity Button */}
          {protocol?.isDead ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: 'var(--crimson-dim)', border: '1px solid rgba(201,72,76,0.3)', borderRadius: 12 }}>
              <CheckCircle size={16} color="var(--crimson)" />
              <span style={{ color: 'var(--crimson)', fontFamily: 'Cinzel, serif', fontSize: '0.82rem' }}>
                Inactivity confirmed — Protocol is EXECUTING
              </span>
            </div>
          ) : (
            <button
              id="confirm-inactivity-btn"
              className={`btn btn-full ${canConfirm ? 'btn-danger' : 'btn-ghost'}`}
              onClick={handleConfirmInactivity}
              disabled={!canConfirm || confirming}
              style={{ position: 'relative' }}
            >
              {confirming ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
                  Confirming…
                </span>
              ) : canConfirm ? (
                <><AlertTriangle size={15} /> CONFIRM INACTIVITY</>
              ) : (
                `Owner still within threshold — ${ledgersToTime(threshold - ledgersSinceHeartbeat)} remaining`
              )}
            </button>
          )}
        </motion.div>

        {/* Owner info */}
        {protocol && (
          <motion.div className="glass" style={{ padding: 24 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>Owner Protocol Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Registered', protocol.isRegistered ? 'Yes' : 'No'],
                ['Status', protocol.isDead ? 'DEAD' : 'ALIVE'],
                ['Last Heartbeat', `Ledger #${protocol.lastHeartbeatLedger}`],
                ['Threshold', ledgersToTime(protocol.inactivityThresholdLedgers)],
                ['Total Allocation', `${(protocol.totalAllocationBps / 100).toFixed(1)}%`],
                ['Vault (at death)', protocol.isDead ? `${formatXlm(protocol.initialVaultBalance)} XLM` : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
