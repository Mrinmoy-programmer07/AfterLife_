import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmi.config';
import { Toaster } from 'react-hot-toast';
import { ChainProvider } from './contexts/ChainContext';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ChainProvider>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1c1917',
                color: '#fafaf9',
                border: '1px solid #292524',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fafaf9',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fafaf9',
                },
              },
            }}
          />
        </ChainProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

