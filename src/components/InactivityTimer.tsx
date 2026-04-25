import { useState, useEffect } from 'react';
import { Activity, Skull, Clock } from 'lucide-react';

// Stellar produces ~1 ledger every 5 seconds
const SECONDS_PER_LEDGER = 5;

interface InactivityTimerProps {
  lastHeartbeatLedger: number;
  thresholdLedgers: number;
  currentLedger: number;
  isDead: boolean;
  /** compact = small inline badge; full = big countdown card */
  variant?: 'compact' | 'full';
}

function ledgersToSeconds(ledgers: number) {
  return ledgers * SECONDS_PER_LEDGER;
}

function formatCountdown(seconds: number): { value: string; unit: string }[] {
  const abs = Math.max(0, seconds);
  const h   = Math.floor(abs / 3600);
  const m   = Math.floor((abs % 3600) / 60);
  const s   = abs % 60;
  if (h > 0) {
    return [
      { value: String(h).padStart(2, '0'), unit: 'hr' },
      { value: String(m).padStart(2, '0'), unit: 'min' },
      { value: String(s).padStart(2, '0'), unit: 'sec' },
    ];
  }
  return [
    { value: String(m).padStart(2, '0'), unit: 'min' },
    { value: String(s).padStart(2, '0'), unit: 'sec' },
  ];
}

export default function InactivityTimer({
  lastHeartbeatLedger,
  thresholdLedgers,
  currentLedger,
  isDead,
  variant = 'full',
}: InactivityTimerProps) {
  const ledgersSinceHeartbeat = Math.max(0, currentLedger - lastHeartbeatLedger);
  const ledgersRemaining = Math.max(0, thresholdLedgers - ledgersSinceHeartbeat);
  const secondsRemaining = ledgersToSeconds(ledgersRemaining);
  const pctElapsed = Math.min(100, (ledgersSinceHeartbeat / thresholdLedgers) * 100);

  // Live countdown: tick every second
  const [liveSeconds, setLiveSeconds] = useState(secondsRemaining);
  useEffect(() => {
    setLiveSeconds(secondsRemaining);
    if (isDead || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setLiveSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining, isDead]);

  const isExpired = !isDead && ledgersRemaining === 0 && currentLedger > 0;
  const isCritical = !isDead && pctElapsed >= 75;

  const statusColor = isDead
    ? '#c9484c'
    : isExpired
    ? '#c9484c'
    : isCritical
    ? '#e8a020'
    : '#4caf88';

  const counts = formatCountdown(liveSeconds);

  if (variant === 'compact') {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 20,
        background: `${statusColor}18`,
        border: `1px solid ${statusColor}44`,
        fontSize: '0.75rem',
        fontFamily: 'var(--font-mono)',
        color: statusColor,
      }}>
        {isDead ? <Skull size={12} /> : <Activity size={12} />}
        {isDead
          ? 'DECLARED DEAD'
          : isExpired
          ? 'THRESHOLD EXCEEDED'
          : `${counts.map(c => c.value).join(':')} left`}
      </div>
    );
  }

  // Full variant
  return (
    <div style={{
      background: 'rgba(10,10,20,0.7)',
      border: `1px solid ${statusColor}44`,
      borderRadius: 16,
      padding: '20px 24px',
      boxShadow: `0 0 24px ${statusColor}22`,
      transition: 'box-shadow 0.5s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={15} style={{ color: statusColor }} />
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            Inactivity Countdown
          </span>
        </div>
        <div style={{
          fontSize: '0.65rem',
          padding: '2px 8px',
          borderRadius: 12,
          background: `${statusColor}22`,
          color: statusColor,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {isDead ? '💀 Dead' : isExpired ? '⚠ Expired' : isCritical ? '⚡ Critical' : '✓ Active'}
        </div>
      </div>

      {/* Countdown digits */}
      {!isDead && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
          {counts.map((c, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '2rem',
                fontFamily: 'Cinzel, serif',
                fontWeight: 700,
                color: statusColor,
                lineHeight: 1,
                minWidth: 56,
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 10,
                padding: '8px 12px',
                border: `1px solid ${statusColor}33`,
              }}>
                {c.value}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {c.unit}
              </div>
            </div>
          ))}
        </div>
      )}

      {isDead && (
        <div style={{ textAlign: 'center', padding: '12px 0 16px', color: '#c9484c' }}>
          <Skull size={32} style={{ marginBottom: 8 }} />
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem' }}>Protocol Declared Dead</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Grace period is now active</div>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${isDead ? 100 : pctElapsed}%`,
            background: `linear-gradient(90deg, ${statusColor}99, ${statusColor})`,
            borderRadius: 2,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
        <span>Last beat: ledger #{lastHeartbeatLedger || '—'}</span>
        <span>Threshold: {thresholdLedgers} ledgers</span>
        <span>Elapsed: {Math.round(pctElapsed)}%</span>
      </div>
    </div>
  );
}
