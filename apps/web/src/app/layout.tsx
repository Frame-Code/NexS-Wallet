import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NexS Wallet',
  description: 'Non-custodial multichain wallet',
};

import { WalletProvider } from '@/contexts/WalletContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}