'use client';

import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
    const router = useRouter();

    return (
        <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 w-full">
            <div className="text-center space-y-6">
                <div>
                    <h2 className="text-xl font-semibold text-white">Bienvenido a NexS Wallet</h2>
                    <p className="text-gray-400 text-sm mt-2">¿Cómo quieres empezar?</p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/register')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-4 text-sm transition-colors"
                    >
                        Crear nueva wallet
                        <p className="text-blue-200 text-xs font-normal mt-1">Genera una nueva frase semilla</p>
                    </button>

                    <button
                        onClick={() => router.push('/register?mode=import')}
                        className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium rounded-lg py-4 text-sm transition-colors"
                    >
                        Importar wallet existente
                        <p className="text-gray-400 text-xs font-normal mt-1">Usa tu frase semilla de 12 palabras</p>
                    </button>
                </div>
            </div>
        </div>
    );
}
