import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, Zap, Clock, Radio } from 'lucide-react';
import { ProtocolEvent, ProtocolState } from '../../types';

// --------------------------------------------------------------------------
// Event Log Drawer
// --------------------------------------------------------------------------

interface EventLogProps {
  events:       ProtocolEvent[];
  isOpen:       boolean;
  onToggle:     () => void;
  currentState: ProtocolState;
}

const TYPE_STYLES: Record<ProtocolEvent['type'], { color: string; icon: React.ReactNode }> = {
  INFO:     { color: 'var(--text-secondary)', icon: <Info size={11} /> },
  WARNING:  { color: 'var(--state-warning)',  icon: <AlertTriangle size={11} /> },
  CRITICAL: { color: 'var(--crimson)',        icon: <Zap size={11} /> },
};

const STATE_DOT: Record<ProtocolState, string> = {
  [ProtocolState.ACTIVE]:    'var(--state-active)',
  [ProtocolState.WARNING]:   'var(--state-warning)',
  [ProtocolState.PENDING]:   'var(--state-critical)',
  [ProtocolState.EXECUTING]: 'var(--state-executing)',
  [ProtocolState.COMPLETED]: 'var(--state-active)',
};

export function EventLog({ events, isOpen, onToggle, currentState }: EventLogProps) {
  const latest = events[events.length - 1];

  return (
    <>
      {/* Toggle Button */}
      <button
        id="event-log-toggle"
        onClick={onToggle}
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: 'rgba(14,14,24,0.9)',
          border: '1px solid var(--border-default)',
          borderRadius: '999px',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.62rem',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          transition: 'all 0.2s ease',
        }}
      >
        <Radio size={11} color={STATE_DOT[currentState]} />
        <span>System Log</span>
        <span style={{
          background: 'var(--bg-elevated)',
          borderRadius: 999,
          padding: '1px 7px',
          fontSize: '0.58rem',
          color: 'var(--text-muted)',
        }}>{events.length}</span>
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="event-log-drawer"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 72,
              left: 24,
              width: 360,
              maxHeight: 320,
              zIndex: 150,
              background: 'rgba(9,9,15,0.95)',
              border: '1px solid var(--border-default)',
              borderRadius: 16,
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Clock size={12} color="var(--text-muted)" />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Temporal Event Log
              </span>
            </div>

            {/* Events */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {[...events].reverse().map((ev) => {
                const s = TYPE_STYLES[ev.type];
                return (
                  <div key={ev.id} style={{
                    padding: '6px 16px',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                  }}>
                    <span style={{ color: s.color, marginTop: 2, flexShrink: 0 }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.75rem', color: s.color === 'var(--text-secondary)' ? 'var(--text-secondary)' : s.color, lineHeight: 1.4, margin: 0 }}>
                        {ev.message}
                      </p>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --------------------------------------------------------------------------
// Protocol State Badge
// --------------------------------------------------------------------------

interface StateBadgeProps {
  state: ProtocolState;
  large?: boolean;
}

const STATE_CONFIG: Record<ProtocolState, { label: string; className: string }> = {
  [ProtocolState.ACTIVE]:    { label: 'ACTIVE',    className: 'badge badge-active' },
  [ProtocolState.WARNING]:   { label: 'WARNING',   className: 'badge badge-warning' },
  [ProtocolState.PENDING]:   { label: 'PENDING',   className: 'badge badge-critical' },
  [ProtocolState.EXECUTING]: { label: 'EXECUTING', className: 'badge badge-executing' },
  [ProtocolState.COMPLETED]: { label: 'COMPLETED', className: 'badge badge-active' },
};

export function StateBadge({ state, large }: StateBadgeProps) {
  const cfg = STATE_CONFIG[state];
  return (
    <span className={cfg.className} style={large ? { fontSize: '0.8rem', padding: '6px 16px' } : {}}>
      <span style={{
        width: 6, height: 6,
        background: 'currentColor',
        borderRadius: '50%',
        display: 'inline-block',
        animation: state !== ProtocolState.ACTIVE ? 'pulse-critical 1.5s ease infinite' : 'none',
      }} />
      {cfg.label}
    </span>
  );
}
