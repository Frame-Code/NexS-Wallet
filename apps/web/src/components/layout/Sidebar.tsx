'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useWallet } from '@/contexts/WalletContext';

const NAV_ITEMS = [
    {
        href: '/dashboard',
        label: 'Dashboard',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
        ),
    },
    {
        href: '/send',
        label: 'Enviar',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
        ),
    },
    {
        href: '/receive',
        label: 'Recibir',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
            </svg>
        ),
    },
    {
        href: '/history',
        label: 'Historial',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    {
        href: '/dapps',
        label: 'DApps',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            </svg>
        ),
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { lockWallet } = useWallet();

    return (
        <aside className="fixed left-0 top-0 h-screen w-60 border-r border-surface-border flex flex-col z-40 bg-slate-900" >
            {/* Logo */}
            <div className="px-4 pt-8 pb-4 border-b border-surface-border flex flex-col items-center">
                <img src="/logo.svg" alt="NexS Wallet" className="w-24 h-24 object-contain" />
                <span className="text-sm font-semibold tracking-widest text-slate-300 mt-2 text-center w-full">NexS Wallet</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active
                                ? 'bg-accent text-white'
                                : 'text-slate-400 hover:bg-surface hover:text-white'
                                }`}
                        >
                            <span className="w-5 flex items-center justify-center">{item.icon}</span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-surface-border space-y-3">
                <button
                    onClick={async () => {
                        try {
                            await signOut(auth);
                        } catch (err) {
                            console.error('Error signing out of Firebase:', err);
                        } finally {
                            localStorage.removeItem('access_token');
                            localStorage.removeItem('refresh_token');
                            sessionStorage.removeItem('biometric_auth');
                            if (lockWallet) lockWallet();
                            router.push('/login');
                        }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Cerrar sesión
                </button>
                <p className="text-xs text-slate-500 font-mono px-3">NexS Wallet v0.1</p>
            </div>
        </aside >
    );
}
