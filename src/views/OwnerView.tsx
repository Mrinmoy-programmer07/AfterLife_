import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, Trash2, Shield, Gift, Vault, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAfterLifeContract } from '../hooks/useAfterLifeContract';
import { useAppStore } from '../store/useAppStore';
import { UserRole, VestingType, ProtocolState } from '../types';
import { formatXlm, parseXlm, ledgersToTime, minsToLedgers, truncate } from '../services/stellarService';
import AnimatedLogo from '../components/AnimatedLogo';
import InactivityTimer from '../components/InactivityTimer';
import { StateBadge } from '../components/ui/EventLog';
import toast from 'react-hot-toast';

// --------------------------------------------------------------------------
// Owner Dashboard
// --------------------------------------------------------------------------

export default function OwnerView() {
  const { publicKey, disconnect } = useWallet();
  const {
    register, proveLife, addGuardian, removeGuardian, setGuardianFixed,
    addBeneficiary, removeBeneficiary, deposit, withdraw, updateThreshold,
    getProtocol, getGuardians, getBeneficiaries, getBalance, getCurrentLedger,
  } = useAfterLifeContract();
  const {
    setRole, protocol, setProtocol, guardians, setGuardians,
    beneficiaries, setBeneficiaries, vaultBalance, setVaultBalance,
    protocolState, setProtocolState, addEvent, triggerRefresh, refreshTrigger,
  } = useAppStore();

  const [tab, setTab]           = useState<'vault' | 'guardians' | 'beneficiaries'>('vault');
  const [loading, setLoading]   = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentLedger, setCurrentLedger] = useState(0);

  // Modal states
  const [showDepositModal,     setShowDepositModal]     = useState(false);
  const [showWithdrawModal,    setShowWithdrawModal]    = useState(false);
  const [showGuardianModal,    setShowGuardianModal]    = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showRegisterModal,    setShowRegisterModal]    = useState(false);

  // Form state
  const [depositAmt,  setDepositAmt]  = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [gName,       setGName]       = useState('');
  const [gWallet,     setGWallet]     = useState('');
  const [bName,       setBName]       = useState('');
  const [bWallet,     setBWallet]     = useState('');
  const [bAlloc,      setBAlloc]      = useState('');
  const [bVesting,    setBVesting]    = useState(VestingType.LINEAR);
  const [bDays,       setBDays]       = useState('2');
  const [regDays,     setRegDays]     = useState('2');

  // ---------- Sync from blockchain ----------
  const sync = useCallback(async () => {
    if (!publicKey) return;
    setIsSyncing(true);
    try {
      const [p, g, b, bal, ledger] = await Promise.all([
        getProtocol(publicKey),
        getGuardians(publicKey),
        getBeneficiaries(publicKey),
        getBalance(publicKey),
        getCurrentLedger(),
      ]);
      setProtocol(p);
      setGuardians(g);
      setBeneficiaries(b);
      setVaultBalance(bal);
      setCurrentLedger(ledger);

      if (!p) {
        setProtocolState(ProtocolState.ACTIVE);
        return;
      }
      if (p.isDead) {
        setProtocolState(ProtocolState.EXECUTING);
      } else {
        setProtocolState(ProtocolState.ACTIVE);
      }
    } catch (err) {
      console.error('Sync error', err);
    } finally {
      setIsSyncing(false);
    }
  }, [publicKey, getProtocol, getGuardians, getBeneficiaries, getBalance]);

  useEffect(() => { sync(); }, [refreshTrigger]);
  useEffect(() => { const t = setInterval(sync, 20_000); return () => clearInterval(t); }, [sync]);

  // ---------- Actions ----------
  const handleRegister = async () => {
    const tid = toast.loading('Registering protocol…');
    try {
      const ledgers = minsToLedgers(Number(regDays));
      await register(ledgers);
      toast.success('Protocol registered!', { id: tid });
      addEvent('Protocol registered on Stellar.', 'INFO');
      setShowRegisterModal(false);
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Registration failed', { id: tid });
    }
  };

  const handleProveLife = async () => {
    const tid = toast.loading('Sending heartbeat…');
    try {
      await proveLife();
      toast.success('Heartbeat confirmed ♥', { id: tid });
      addEvent('Proof of life sent — heartbeat reset.', 'INFO');
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Heartbeat failed', { id: tid });
    }
  };

  const handleDeposit = async () => {
    const stroops = parseXlm(depositAmt);
    if (stroops <= 0n) return toast.error('Enter a valid amount.');
    const tid = toast.loading(`Depositing ${depositAmt} XLM…`);
    try {
      await deposit(stroops);
      toast.success('Funds deposited!', { id: tid });
      addEvent(`Deposited ${depositAmt} XLM to vault.`, 'INFO');
      setShowDepositModal(false);
      setDepositAmt('');
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Deposit failed', { id: tid });
    }
  };

  const handleWithdraw = async () => {
    const stroops = parseXlm(withdrawAmt);
    if (stroops <= 0n) return toast.error('Enter a valid amount.');
    const tid = toast.loading(`Withdrawing ${withdrawAmt} XLM…`);
    try {
      await withdraw(stroops);
      toast.success('Withdrawal successful!', { id: tid });
      addEvent(`Withdrew ${withdrawAmt} XLM from vault.`, 'INFO');
      setShowWithdrawModal(false);
      setWithdrawAmt('');
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Withdrawal failed', { id: tid });
    }
  };

  const handleAddGuardian = async () => {
    if (!gName || !gWallet) return toast.error('Fill all fields.');
    const tid = toast.loading('Adding guardian…');
    try {
      await addGuardian(gName, gWallet);
      toast.success(`Guardian ${gName} added.`, { id: tid });
      addEvent(`Guardian added: ${gName} (${truncate(gWallet)}).`, 'INFO');
      setShowGuardianModal(false); setGName(''); setGWallet('');
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add guardian', { id: tid });
    }
  };

  const handleRemoveGuardian = async (wallet: string, name: string) => {
    if (!confirm(`Remove guardian ${name}?`)) return;
    const tid = toast.loading('Removing guardian…');
    try {
      await removeGuardian(wallet);
      toast.success('Guardian removed.', { id: tid });
      addEvent(`Guardian removed: ${name}.`, 'INFO');
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed', { id: tid });
    }
  };

  const handleAddBeneficiary = async () => {
    if (!bName || !bWallet || !bAlloc) return toast.error('Fill all fields.');
    const allocBps = Math.round(Number(bAlloc) * 100);
    if (allocBps <= 0 || allocBps > 10_000) return toast.error('Allocation must be 0.01%–100%.');
    const tid = toast.loading('Adding beneficiary…');
    try {
      await addBeneficiary(bName, bWallet, allocBps, bVesting, minsToLedgers(Number(bDays)));
      toast.success(`Beneficiary ${bName} added.`, { id: tid });
      addEvent(`Beneficiary added: ${bName} — ${bAlloc}% allocation.`, 'INFO');
      setShowBeneficiaryModal(false); setBName(''); setBWallet(''); setBAlloc(''); setBDays('2');
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add beneficiary', { id: tid });
    }
  };

  const handleRemoveBeneficiary = async (wallet: string, name: string) => {
    if (!confirm(`Remove beneficiary ${name}?`)) return;
    const tid = toast.loading('Removing…');
    try {
      await removeBeneficiary(wallet);
      toast.success('Beneficiary removed.', { id: tid });
      addEvent(`Beneficiary removed: ${name}.`, 'INFO');
      triggerRefresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed', { id: tid });
    }
  };

  const isRegistered = !!protocol;
  const totalAlloc   = beneficiaries.reduce((s, b) => s + b.allocationBps / 100, 0);

  return (
    <div className="full-page ui-layer" style={{ minHeight: '100vh' }}>
      {/* ---- Top Actions ---- */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0', maxWidth: 1100, margin: '0 auto' }}>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => setRole(UserRole.NONE)}
          style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.1em' }}
        >
          &larr; Switch Role
        </button>
      </div>

      <div className="container" style={{ padding: '32px 24px', maxWidth: 1100 }}>

        {/* ---- Not Registered Banner ---- */}
        {!isRegistered && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-gold"
            style={{ padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={18} color="var(--gold-bright)" />
              <div>
                <p style={{ color: 'var(--gold-bright)', fontFamily: 'Cinzel, serif', fontSize: '0.85rem', margin: 0 }}>Protocol not registered</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>Create your AfterLife protocol instance to get started.</p>
              </div>
            </div>
            <button id="register-protocol-btn" className="btn btn-primary btn-sm" onClick={() => setShowRegisterModal(true)}>Register Now</button>
          </motion.div>
        )}

        {/* ---- Stats Row ---- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Vault Balance', value: `${formatXlm(vaultBalance)} XLM`, hint: '~$' + (Number(vaultBalance) / 10_000_000 * 0.14).toFixed(2) },
            { label: 'Inactivity Threshold', value: protocol ? ledgersToTime(protocol.inactivityThresholdLedgers) : '—', hint: 'until guardians can act' },
            { label: 'Guardians', value: String(guardians.length), hint: `/ 10 max` },
            { label: 'Beneficiaries', value: String(beneficiaries.length), hint: `${totalAlloc.toFixed(1)}% allocated` },
          ].map((s, i) => (
            <motion.div key={i} className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.hint}</div>
            </motion.div>
          ))}
        </div>

        {/* ---- Inactivity Timer + Heartbeat ---- */}
        {isRegistered && (
          <div style={{ marginBottom: 28 }}>
            <InactivityTimer
              lastHeartbeatLedger={protocol?.lastHeartbeatLedger ?? 0}
              thresholdLedgers={protocol?.inactivityThresholdLedgers ?? 0}
              currentLedger={currentLedger}
              isDead={protocol?.isDead ?? false}
              variant="full"
            />
            {!protocol?.isDead && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  id="prove-life-btn"
                  className="btn btn-primary"
                  onClick={handleProveLife}
                  disabled={!isRegistered}
                  style={{ gap: 8 }}
                >
                  <Heart size={15} /> PROVE LIFE
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- Tabs ---- */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-surface)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
          {(['vault', 'guardians', 'beneficiaries'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 20px',
              borderRadius: 8,
              border: 'none',
              background: tab === t ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t ? 'var(--gold-bright)' : 'var(--text-muted)',
              fontFamily: 'Cinzel, serif',
              fontSize: '0.72rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: tab === t ? '0 0 12px var(--gold-glow)' : 'none',
            }}>
              {t === 'vault' ? <><Vault size={11} style={{ marginRight: 6 }} />Vault</> : t === 'guardians' ? <><Shield size={11} style={{ marginRight: 6 }} />Guardians</> : <><Gift size={11} style={{ marginRight: 6 }} />Beneficiaries</>}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ===== VAULT TAB ===== */}
          {tab === 'vault' && (
            <motion.div key="vault" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <button id="deposit-btn" className="btn btn-primary" onClick={() => setShowDepositModal(true)} disabled={!isRegistered}>
                  <Plus size={14} /> Deposit XLM
                </button>
                <button id="withdraw-btn" className="btn btn-outline" onClick={() => setShowWithdrawModal(true)} disabled={!isRegistered || protocol?.isDead}>
                  <Unlock size={14} /> Withdraw
                </button>
              </div>

              <div className="glass" style={{ padding: 24 }}>
                <div className="section-title" style={{ marginBottom: 16 }}>Vault Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>CURRENT BALANCE</div>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', color: 'var(--gold-bright)' }}>{formatXlm(vaultBalance)} XLM</div></div>
                  <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>STATUS</div>
                    <div>{isRegistered ? <StateBadge state={protocolState} /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Not registered</span>}</div></div>
                  <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>LAST HEARTBEAT</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Ledger #{protocol?.lastHeartbeatLedger ?? '—'}</div></div>
                  <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL ALLOCATED</div>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: totalAlloc > 95 ? 'var(--crimson)' : 'var(--text-primary)' }}>{totalAlloc.toFixed(1)}%</div></div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== GUARDIANS TAB ===== */}
          {tab === 'guardians' && (
            <motion.div key="guardians" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ marginBottom: 16 }}>
                <button id="add-guardian-btn" className="btn btn-primary btn-sm" onClick={() => setShowGuardianModal(true)} disabled={!isRegistered}>
                  <Plus size={13} /> Add Guardian
                </button>
              </div>

              <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
                {guardians.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Shield size={28} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                    No guardians yet. Add trusted addresses to monitor your activity.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Address</th><th>Fixed</th><th></th></tr>
                    </thead>
                    <tbody>
                      {guardians.map((g) => (
                        <tr key={g.wallet}>
                          <td style={{ fontFamily: 'Cinzel, serif', color: 'var(--text-primary)' }}>{g.name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{truncate(g.wallet)}</td>
                          <td>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.isFixed ? 'var(--gold-bright)' : 'var(--text-muted)' }}
                              onClick={() => setGuardianFixed(g.wallet, !g.isFixed).then(() => triggerRefresh())}>
                              {g.isFixed ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                          </td>
                          <td>
                            <button
                              style={{
                                background: 'none', border: 'none', cursor: g.isFixed ? 'not-allowed' : 'pointer',
                                color: g.isFixed ? 'var(--text-muted)' : '#c9484c',
                                opacity: g.isFixed ? 0.4 : 1,
                                transition: 'color 0.2s',
                              }}
                              disabled={g.isFixed}
                              onClick={() => handleRemoveGuardian(g.wallet, g.name)}
                              title={g.isFixed ? 'Guardian is fixed — cannot remove' : 'Remove guardian'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}

          {/* ===== BENEFICIARIES TAB ===== */}
          {tab === 'beneficiaries' && (
            <motion.div key="beneficiaries" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ marginBottom: 16 }}>
                <button id="add-beneficiary-btn" className="btn btn-primary btn-sm" onClick={() => setShowBeneficiaryModal(true)} disabled={!isRegistered || totalAlloc >= 100}>
                  <Plus size={13} /> Add Beneficiary
                </button>
                {totalAlloc >= 100 && <span style={{ marginLeft: 12, fontSize: '0.75rem', color: 'var(--crimson)' }}>100% allocated</span>}
              </div>

              <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
                {beneficiaries.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Gift size={28} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                    No beneficiaries yet. Add addresses to receive your vault funds.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Address</th><th>Allocation</th><th>Vesting</th><th>Duration</th><th></th></tr>
                    </thead>
                    <tbody>
                      {beneficiaries.map((b) => (
                        <tr key={b.wallet}>
                          <td style={{ fontFamily: 'Cinzel, serif', color: 'var(--text-primary)' }}>{b.name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{truncate(b.wallet)}</td>
                          <td><span style={{ color: 'var(--gold-bright)', fontFamily: 'Cinzel, serif' }}>{(b.allocationBps / 100).toFixed(1)}%</span></td>
                          <td><span style={{ fontSize: '0.72rem', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-secondary)' }}>{b.vestingType}</span></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ledgersToTime(b.vestingDurationLedgers)}</td>
                          <td>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              onClick={() => handleRemoveBeneficiary(b.wallet, b.name)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==== MODALS ==== */}
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowRegisterModal(false)}>
            <motion.div className="glass modal" initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
              <h3 className="modal-title">Register Protocol</h3>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="input-label">Inactivity Threshold (mins)</label>
                <input className="input" type="number" min={1} value={regDays} onChange={e => setRegDays(e.target.value)} />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>≈ {minsToLedgers(Number(regDays)).toLocaleString()} ledgers. Guardians can declare inactivity after this period.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost btn-full" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                <button id="confirm-register-btn" className="btn btn-primary btn-full" onClick={handleRegister}>Register</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDepositModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowDepositModal(false)}>
            <motion.div className="glass modal" initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
              <h3 className="modal-title">Deposit XLM</h3>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="input-label" htmlFor="deposit-amount">Amount (XLM)</label>
                <input id="deposit-amount" className="input" type="number" step="0.01" placeholder="0.00" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost btn-full" onClick={() => setShowDepositModal(false)}>Cancel</button>
                <button id="confirm-deposit-btn" className="btn btn-primary btn-full" onClick={handleDeposit}>Deposit</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showWithdrawModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowWithdrawModal(false)}>
            <motion.div className="glass modal" initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
              <h3 className="modal-title">Withdraw XLM</h3>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="input-label" htmlFor="withdraw-amount">Amount (XLM)</label>
                <input id="withdraw-amount" className="input" type="number" step="0.01" placeholder="0.00" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Available: {formatXlm(vaultBalance)} XLM</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost btn-full" onClick={() => setShowWithdrawModal(false)}>Cancel</button>
                <button id="confirm-withdraw-btn" className="btn btn-danger btn-full" onClick={handleWithdraw}>Withdraw</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showGuardianModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowGuardianModal(false)}>
            <motion.div className="glass modal" initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
              <h3 className="modal-title">Add Guardian</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                <div className="form-group">
                  <label className="input-label" htmlFor="guardian-name">Name</label>
                  <input id="guardian-name" className="input" placeholder="Alice" value={gName} onChange={e => setGName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="input-label" htmlFor="guardian-wallet">Stellar Address</label>
                  <input id="guardian-wallet" className="input" placeholder="G..." value={gWallet} onChange={e => setGWallet(e.target.value.trim())} spellCheck={false} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost btn-full" onClick={() => setShowGuardianModal(false)}>Cancel</button>
                <button id="confirm-add-guardian-btn" className="btn btn-primary btn-full" onClick={handleAddGuardian}>Add Guardian</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showBeneficiaryModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowBeneficiaryModal(false)}>
            <motion.div className="glass modal" style={{ maxWidth: 520 }} initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
              <h3 className="modal-title">Add Beneficiary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div className="form-group">
                  <label className="input-label">Name</label>
                  <input className="input" placeholder="Bob" value={bName} onChange={e => setBName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="input-label">Stellar Address</label>
                  <input className="input" placeholder="G..." value={bWallet} onChange={e => setBWallet(e.target.value.trim())} spellCheck={false} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="input-label">Allocation (%)</label>
                    <input className="input" type="number" step="0.1" min="0.1" max={100 - totalAlloc} placeholder="50" value={bAlloc} onChange={e => setBAlloc(e.target.value)} />
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Remaining: {(100 - totalAlloc).toFixed(1)}%</p>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Vesting Type</label>
                    <select className="input" value={bVesting} onChange={e => setBVesting(e.target.value as VestingType)}>
                      <option value={VestingType.LINEAR}>Linear</option>
                      <option value={VestingType.CLIFF}>Cliff</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="input-label">Vesting Duration (mins)</label>
                  <input className="input" type="number" min="1" value={bDays} onChange={e => setBDays(e.target.value)} />
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{bVesting === VestingType.LINEAR ? 'Funds unlock proportionally each day.' : 'All funds unlock at once after this period.'}</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost btn-full" onClick={() => setShowBeneficiaryModal(false)}>Cancel</button>
                <button id="confirm-add-beneficiary-btn" className="btn btn-primary btn-full" onClick={handleAddBeneficiary}>Add Beneficiary</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
