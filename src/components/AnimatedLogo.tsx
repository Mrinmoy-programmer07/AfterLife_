import { motion } from 'framer-motion';

interface Props {
  size?: number;
  animate?: boolean;
  /** If true, show the wordmark below icon */
  showWordmark?: boolean;
}

export default function AnimatedLogo({ size = 40, animate = true, showWordmark = false }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <motion.div
        animate={animate ? { filter: ['drop-shadow(0 0 8px #f0c040aa)', 'drop-shadow(0 0 20px #f0c040cc)', 'drop-shadow(0 0 8px #f0c040aa)'] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
          <defs>
            <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f0c040"/>
              <stop offset="100%" stopColor="#d4a520"/>
            </linearGradient>
            <filter id="gf">
              <feGaussianBlur stdDeviation="2.5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Orbit ring */}
          <circle cx="100" cy="100" r="88" stroke="url(#lg1)" strokeWidth="0.7" strokeDasharray="4 8" opacity="0.55" filter="url(#gf)"/>

          {/* Orbit dots */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const r = 88;
            const rad = (deg - 90) * Math.PI / 180;
            const cx = 100 + r * Math.cos(rad);
            const cy = 100 + r * Math.sin(rad);
            return <circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 2.2 : 1.5} fill="#f0c040" opacity={i % 2 === 0 ? 0.9 : 0.5} filter="url(#gf)"/>;
          })}

          {/* Hourglass top */}
          <path d="M66 42 L134 42 L106 98 L94 98 Z" stroke="url(#lg1)" strokeWidth="1.6" fill="rgba(240,192,64,0.07)" filter="url(#gf)"/>
          {/* Hourglass bottom */}
          <path d="M94 102 L106 102 L134 158 L66 158 Z" stroke="url(#lg1)" strokeWidth="1.6" fill="rgba(240,192,64,0.07)" filter="url(#gf)"/>

          {/* Caps */}
          <line x1="60" y1="40" x2="140" y2="40" stroke="url(#lg1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#gf)"/>
          <line x1="60" y1="160" x2="140" y2="160" stroke="url(#lg1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#gf)"/>

          {/* Pinch glow */}
          <circle cx="100" cy="100" r="4" fill="#f0c040" filter="url(#gf)" opacity="0.95"/>
          <circle cx="100" cy="100" r="9" fill="#f0c040" opacity="0.1"/>

          {/* Keyhole */}
          <circle cx="100" cy="124" r="9" stroke="rgba(240,192,64,0.45)" strokeWidth="1.2" fill="none"/>
          <path d="M96.5 124 L96.5 143 L103.5 143 L103.5 124" stroke="rgba(240,192,64,0.45)" strokeWidth="1.2" fill="none" strokeLinecap="round"/>

          {/* Sand pile */}
          <path d="M76 152 Q100 140 124 152 L134 158 L66 158 Z" fill="rgba(240,192,64,0.2)"/>
        </svg>
      </motion.div>

      {showWordmark && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: Math.max(10, size * 0.28),
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#f0c040',
            textShadow: '0 0 20px rgba(240,192,64,0.4)',
          }}
        >
          AfterLife
        </motion.span>
      )}
    </div>
  );
}
