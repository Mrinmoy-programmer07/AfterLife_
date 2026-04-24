import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Particle that converges toward a target position
interface Particle {
  id: number;
  x: number; y: number;
  tx: number; ty: number; // target
  delay: number;
}

const SCAN_LINES = 12;

export default function IntroScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'particles' | 'reveal' | 'scanline' | 'exit'>('particles');
  const [particles, setParticles] = useState<Particle[]>([]);
  const doneRef = useRef(false);

  useEffect(() => {
    // Generate random positions → converge to center
    setParticles(
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        tx: (Math.random() - 0.5) * 6,
        ty: (Math.random() - 0.5) * 6,
        delay: Math.random() * 0.6,
      }))
    );

    // Phase sequence
    const t1 = setTimeout(() => setPhase('reveal'),   800);
    const t2 = setTimeout(() => setPhase('scanline'), 1800);
    const t3 = setTimeout(() => setPhase('exit'),     3000);
    const t4 = setTimeout(() => { if (!doneRef.current) { doneRef.current = true; onDone(); } }, 3600);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'radial-gradient(ellipse at 50% 50%, #0c0c18 0%, #050508 60%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Scanline overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 4px)',
            zIndex: 2,
          }} />

          {/* Moving scan beam */}
          {phase === 'scanline' &&
            Array.from({ length: SCAN_LINES }).map((_, i) => (
              <motion.div
                key={i}
                style={{
                  position: 'absolute', left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, rgba(240,192,64,${0.05 + i * 0.01}), transparent)`,
                  top: `${(i / SCAN_LINES) * 100}%`,
                  zIndex: 3,
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 0.6, 0.6, 0] }}
                transition={{ duration: 1.0, delay: i * 0.06, ease: 'easeInOut' }}
              />
            ))
          }

          {/* Orbiting particles */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: `${p.x}px`, y: `${p.y}px`, opacity: 0, scale: 0 }}
                animate={{
                  x: `${p.tx}px`, y: `${p.ty}px`,
                  opacity: phase === 'particles' ? [0, 0.8, 0.4] : 0,
                  scale:   phase === 'particles' ? [0, 1.2, 0.8] : 0,
                }}
                transition={{ duration: 0.9, delay: p.delay, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  width: 4, height: 4,
                  borderRadius: '50%',
                  background: Math.random() > 0.6 ? '#f0c040' : Math.random() > 0.5 ? '#2dd4bf' : '#c9484c',
                  boxShadow: '0 0 6px currentColor',
                }}
              />
            ))}
          </div>

          {/* Logo + Text */}
          <div style={{ position: 'relative', zIndex: 4, textAlign: 'center' }}>
            {/* Hourglass SVG — assembles */}
            <motion.svg
              width="80" height="80" viewBox="0 0 80 80"
              initial={{ opacity: 0, scale: 0.4, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ display: 'block', margin: '0 auto 20px' }}
            >
              {/* Outer ring */}
              <motion.circle cx="40" cy="40" r="36" fill="none" stroke="#f0c040" strokeWidth="1.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 1, delay: 0.4 }}
              />
              {/* Hourglass shape */}
              <motion.path
                d="M22 14 L58 14 L40 40 L58 66 L22 66 L40 40 Z"
                fill="none" stroke="#f0c040" strokeWidth="2" strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.5, ease: 'easeInOut' }}
              />
              {/* Top sand */}
              <motion.ellipse cx="40" cy="24" rx="10" ry="4"
                fill="rgba(240,192,64,0.3)"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 1.2 }}
              />
              {/* Bottom sand */}
              <motion.ellipse cx="40" cy="56" rx="14" ry="5"
                fill="rgba(240,192,64,0.25)"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 1.3 }}
              />
              {/* Sand drop */}
              <motion.circle cx="40" cy="40" r="2" fill="#f0c040"
                animate={{ cy: [36, 44, 36], opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.svg>

            {/* AFTERLIFE wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 12, letterSpacing: '0.8em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.28em' }}
              transition={{ duration: 0.9, delay: 0.8, ease: 'easeOut' }}
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 'clamp(2rem, 6vw, 3.8rem)',
                fontWeight: 900,
                color: '#f0c040',
                textShadow: '0 0 40px rgba(240,192,64,0.5), 0 0 80px rgba(240,192,64,0.2)',
                lineHeight: 1,
              }}
            >
              AFTERLIFE
            </motion.div>

            {/* Sub tagline */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              style={{
                marginTop: 12,
                fontFamily: 'Cinzel, serif',
                fontSize: '0.72rem',
                letterSpacing: '0.35em',
                color: '#2dd4bf',
                textShadow: '0 0 16px rgba(45,212,191,0.5)',
                textTransform: 'uppercase',
              }}
            >
              Temporal Asset Protocol · Stellar
            </motion.div>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              style={{ marginTop: 32, width: 200, margin: '32px auto 0' }}
            >
              <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.4, delay: 1.4, ease: 'easeInOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #d4a520, #f0c040)',
                    boxShadow: '0 0 8px rgba(240,192,64,0.6)',
                    borderRadius: 2,
                  }}
                />
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0.5, 0] }}
                transition={{ duration: 1.4, delay: 1.4, times: [0, 0.1, 0.9, 1] }}
                style={{ fontSize: '0.6rem', color: 'rgba(139,143,168,0.7)', letterSpacing: '0.2em', marginTop: 8, textAlign: 'center', fontFamily: 'monospace' }}
              >
                INITIALIZING PROTOCOL…
              </motion.p>
            </motion.div>
          </div>

          {/* Corner decorations */}
          {['tl', 'tr', 'bl', 'br'].map((pos) => (
            <motion.div
              key={pos}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.3, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              style={{
                position: 'absolute',
                ...(pos.includes('t') ? { top: 20 } : { bottom: 20 }),
                ...(pos.includes('l') ? { left: 20 }  : { right: 20 }),
                width: 24, height: 24,
                borderTop:    pos.includes('t') ? '1px solid rgba(240,192,64,0.4)' : undefined,
                borderBottom: pos.includes('b') ? '1px solid rgba(240,192,64,0.4)' : undefined,
                borderLeft:   pos.includes('l') ? '1px solid rgba(240,192,64,0.4)' : undefined,
                borderRight:  pos.includes('r') ? '1px solid rgba(240,192,64,0.4)' : undefined,
              }}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
