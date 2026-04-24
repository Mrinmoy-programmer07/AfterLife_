import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// --- Card ---
interface CardProps extends HTMLMotionProps<"div"> {
  hoverEffect?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hoverEffect = false, ...props }) => {
  return (
    <motion.div
      className={`bg-surface/40 backdrop-blur-md border border-white/5 rounded-xl p-6 shadow-2xl ${className}`}
      whileHover={hoverEffect ? { scale: 1.02, backgroundColor: 'rgba(28, 25, 23, 0.6)', borderColor: 'rgba(255,255,255,0.1)' } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading, 
  disabled,
  ...props 
}) => {
  const variants = {
    primary: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
    outline: 'bg-transparent border border-white/20 text-secondary hover:text-white hover:border-white/40',
    ghost: 'bg-transparent text-secondary hover:text-white',
    danger: 'bg-red-500/10 border border-red-500/30 text-red-200 hover:bg-red-500/20'
  };

  return (
    <button
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
};

// --- Progress ---
interface ProgressProps {
  value: number; // 0-100
  className?: string;
  indicatorColor?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, className = '', indicatorColor = 'bg-white' }) => {
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-white/5 ${className}`}>
      <motion.div
        className={`h-full w-full flex-1 ${indicatorColor} transition-all`}
        initial={{ translateX: '-100%' }}
        animate={{ translateX: `-${100 - value}%` }}
        transition={{ duration: 0.8, ease: "circOut" }}
      />
    </div>
  );
};

// --- Badge ---
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'neutral' | 'critical' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const styles = {
    default: 'bg-white/5 text-secondary border-white/10',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    neutral: 'bg-stone-500/10 text-stone-400 border-stone-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

// --- Dialog (Simple Overlay) ---
export const Dialog: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-stone-900 border border-white/10 rounded-xl shadow-2xl p-6"
      >
        <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
        <div className="text-secondary text-sm mb-6">{children}</div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </motion.div>
    </div>
  );
};