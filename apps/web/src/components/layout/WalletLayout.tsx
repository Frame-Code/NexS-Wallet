'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

export default function WalletLayout({ children }: { children: React.ReactNode }) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navigate = (href: string) => {
        setShowMenu(false);
        if (typeof window !== 'undefined' && (window as any).__startProgress) {
            (window as any).__startProgress();
        }
        router.push(href);
    };

    return (
        <div className="flex min-h-screen bg-slate-950">
            <Sidebar />
            <main className="ml-60 flex-1 p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <header className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 px-5 py-4 shadow-lg shadow-slate-950/30 backdrop-blur">
                        <div>
                            <p className="text-sm text-slate-400">Bienvenido de nuevo</p>
                            <h2 className="text-xl font-semibold text-white">Panel principal</h2>
                        </div>
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu(prev => !prev)}
                                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-indigo-500"
                            >
                                + Nueva transacción
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-50 overflow-hidden">
                                    <button
                                        onClick={() => navigate('/send')}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                                        </svg>
                                        Enviar
                                    </button>
                                    <button
                                        onClick={() => navigate('/receive')}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors border-t border-slate-800"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                                        </svg>
                                        Recibir
                                    </button>
                                </div>
                            )}
                        </div>
                    </header>
                    {children}
                </div>
            </main>
        </div>
    );
}
