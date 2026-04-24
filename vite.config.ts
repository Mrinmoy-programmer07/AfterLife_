import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
    include: ['@stellar/stellar-sdk', '@creit-tech/stellar-wallets-kit'],
  },
});
