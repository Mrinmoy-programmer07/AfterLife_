import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    // Polyfills Buffer, process, etc. for stellar-sdk & crypto libs
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Force a single instance of stellar-base to prevent dual-package instanceof bugs
    dedupe: [
      '@stellar/stellar-base',
      '@stellar/stellar-sdk',
    ],
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'stellar-sdk': ['@stellar/stellar-sdk'],
          'three-libs': ['three', '@react-three/fiber', '@react-three/drei'],
          'framer': ['framer-motion'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      '@stellar/stellar-sdk',
      '@creit.tech/stellar-wallets-kit',
      'buffer',
    ],
  },
});
