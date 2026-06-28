'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadMnemonic } from '@/lib/crypto/vault';
import { useWallet } from '@/contexts/WalletContext';

export default function UnlockPage() {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { unlockWallet } = useWallet();

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const mnemonic = await loadMnemonic(pin);
            unlockWallet(mnemonic);
            router.push('/dashboard');
        } catch {
            setError('PIN incorrecto');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 w-full">
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white">Desbloquear Wallet</h2>
                <p className="text-gray-400 text-sm mt-1">Ingresa tu PIN de seguridad para continuar</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4 text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1 text-center">PIN de seguridad</label>
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 6) setPin(val);
                        }}
                        placeholder="••••••"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        autoFocus
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 tracking-widest text-center text-xl"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-center">6 dígitos</p>
                </div>

                <button
                    type="submit"
                    disabled={loading || pin.length !== 6}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors"
                >
                    {loading ? 'Verificando...' : 'Desbloquear'}
                </button>
            </form>

            <p className="text-center text-gray-400 text-sm mt-6">
                ¿No eres tú?{' '}
                <button
                    onClick={() => router.push('/login')}
                    className="text-blue-400 hover:text-blue-300"
                >
                    Cerrar sesión
                </button>
            </p>
        </div>
    );
}