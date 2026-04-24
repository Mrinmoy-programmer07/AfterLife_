import React from 'react';
import { motion } from 'framer-motion';

const AnimatedLogo: React.FC<{ size?: number; className?: string }> = ({ size = 120, className = "" }) => {
    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full overflow-visible"
                style={{ filter: 'drop-shadow(0 0 15px rgba(16, 185, 129, 0.6))' }}
            >
                <defs>
                    <radialGradient id="logo-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(16, 185, 129, 0.2)" />
                        <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
                    </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="45" fill="url(#logo-glow)" />
                {/* Infinity Path - Background */}
                <motion.path
                    d="M 30 50 C 30 35, 10 35, 10 50 C 10 65, 30 65, 50 50 C 70 35, 90 35, 90 50 C 90 65, 70 65, 70 50"
                    fill="transparent"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />

                {/* Hourglass Frame */}
                <motion.path
                    d="M 35 25 L 65 25 L 35 75 L 65 75 Z"
                    fill="rgba(16, 185, 129, 0.05)"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                />

                {/* Infinity Path - Animated Trace */}
                <motion.path
                    d="M 50 50 C 70 35, 90 35, 90 50 C 90 65, 70 65, 50 50 C 30 35, 10 35, 10 50 C 10 65, 30 65, 50 50"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                        pathLength: [0, 1, 1],
                        opacity: [0, 1, 0],
                        pathOffset: [0, 0, 1]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Sand Particles (Glows) */}
                <motion.circle
                    cx="50"
                    cy="35"
                    r="1.5"
                    fill="#10b981"
                    animate={{
                        y: [0, 30],
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: 0
                    }}
                />
                <motion.circle
                    cx="48"
                    cy="40"
                    r="1"
                    fill="#6366f1"
                    animate={{
                        y: [0, 20],
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        delay: 0.5
                    }}
                />
            </svg>

            {/* Decorative Glow Ring */}
            <motion.div
                className="absolute inset-0 border-2 border-emerald-500/20 rounded-full"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />
        </div>
    );
};

export default AnimatedLogo;
