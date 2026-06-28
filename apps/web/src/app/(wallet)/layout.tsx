'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WalletLayout from '@/components/layout/WalletLayout';

import { useWallet } from '@/contexts/WalletContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const { isUnlocked } = useWallet();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const biometricAuth = sessionStorage.getItem('biometric_auth');

    if (!token) {
      router.push('/login');
    } else if (!isUnlocked && !biometricAuth) {
      router.push('/unlock');
    } else {
      setAuthorized(true);
    }
  }, [router, isUnlocked]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return <WalletLayout>{children}</WalletLayout>;
}