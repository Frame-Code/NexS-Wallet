'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as bip39 from 'bip39';

type Step = 'welcome' | 'create' | 'confirm' | 'import';

// Seed phrase de ejemplo — Russell la generará con BIP-39
const MOCK_SEED = [
    'apple', 'bridge', 'cloud', 'dance',
    'eagle', 'forest', 'green', 'house',
    'island', 'jungle', 'kite', 'lemon'
];

export default function OnboardingPage() {
    const [step, setStep] = useState<Step>('welcome');
    const [confirmed, setConfirmed] = useState(false);
    const [importPhrase, setImportPhrase] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleConfirm = () => {
        if (!confirmed) {
            setError('Debes confirmar que anotaste tu frase semilla');
            return;
        }
        router.push('/dashboard');
    };

    const [importWords, setImportWords] = useState<string[]>(Array(12).fill(''));

    const handleImport = () => {
        const allFilled = importWords.every(w => w.trim() !== '');
        if (!allFilled) {
            setError('Debes ingresar las 12 palabras');
            return;
        }

        //Valida que las 12 palabras sean palabras derivadas del estandar BIP-39
        const mnemonic = importWords.join(' ');
        if (!bip39.validateMnemonic(mnemonic)) {
          setError('Frase semilla inválida. Verifica que todas las palabras sean correctas.');
          return;
        }
        // TODO: importar wallet con Russell usando importWords.join(' ')
        router.push('/dashboard');
    };

    return (
        <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 w-full">

            {/* PASO 1 — Bienvenida */}
            {step === 'welcome' && (
                <div className="text-center space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Bienvenido a NexS Wallet</h2>
                        <p className="text-gray-400 text-sm mt-2">¿Cómo quieres empezar?</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => setStep('create')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-4 text-sm transition-colors"
                        >
                            Crear nueva wallet
                            <p className="text-blue-200 text-xs font-normal mt-1">Genera una nueva frase semilla</p>
                        </button>

                        <button
                            onClick={() => setStep('import')}
                            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium rounded-lg py-4 text-sm transition-colors"
                        >
                            Importar wallet existente
                            <p className="text-gray-400 text-xs font-normal mt-1">Usa tu frase semilla de 12 palabras</p>
                        </button>
                    </div>
                </div>
            )}

            {/* PASO 2 — Crear: mostrar seed phrase */}
            {step === 'create' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Tu frase semilla</h2>
                        <p className="text-gray-400 text-sm mt-1">Anota estas 12 palabras en orden. No la compartas con nadie.</p>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {MOCK_SEED.map((word, i) => (
                            <div key={i} className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-white flex gap-2">
                                <span className="text-gray-500 text-xs">{i + 1}.</span>
                                <span>{word}</span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3">
                        <p className="text-yellow-400 text-xs">⚠️ Guarda esta frase en un lugar seguro. Si la pierdes, no podrás recuperar tu wallet.</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => {
                                setConfirmed(e.target.checked);
                                setError('');
                            }}
                            className="mt-0.5 accent-blue-500"
                        />
                        <span className="text-gray-400 text-sm">He anotado mi frase semilla en un lugar seguro</span>
                    </label>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep('welcome')}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium rounded-lg py-3 text-sm transition-colors"
                        >
                            Volver
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-3 text-sm transition-colors"
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            )}

            {/* PASO 3 — Importar wallet */}
            {step === 'import' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Importar wallet</h2>
                        <p className="text-gray-400 text-sm mt-1">Ingresa tus 12 palabras en orden.</p>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Array.from({ length: 12 }, (_, i) => (
                            <div key={i} className="flex items-center gap-2 bg-gray-700 rounded-lg px-2 py-2">
                                <span className="text-gray-500 text-xs w-4 shrink-0">{i + 1}.</span>
                                <input
                                    type="text"
                                    value={importWords[i]}
                                    onChange={(e) => {
                                        const updated = [...importWords];
                                        updated[i] = e.target.value.toLowerCase().trim();
                                        setImportWords(updated);
                                        setError('');
                                    }}
                                    className="bg-transparent text-white text-sm focus:outline-none w-full"
                                    placeholder="palabra"
                                />
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => { setStep('welcome'); setError(''); setImportWords(Array(12).fill('')); }}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium rounded-lg py-3 text-sm transition-colors"
                        >
                            Volver
                        </button>
                        <button
                            onClick={handleImport}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-3 text-sm transition-colors"
                        >
                            Importar
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
