'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { storeMnemonic } from '@/lib/crypto/vault';
import { generateMnemonic } from '@/lib/crypto/keygen';
import { registerBiometric } from '@/lib/auth/webauthn';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('El PIN debe ser de exactamente 6 dígitos numéricos');
      setLoading(false);
      return;
    }

    if (pin !== confirmPin) {
      setError('Los PINs no coinciden');
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
      const registerRes = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!registerRes.ok) {
        const errData = await registerRes.json();
        throw new Error(errData.message || 'Error al crear la cuenta en el servidor');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      const loginRes = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!loginRes.ok) {
        const errData = await loginRes.json();
        throw new Error(errData.message || 'Error al iniciar sesión en el servidor');
      }

      const { access_token, refresh_token, uid } = await loginRes.json();

      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }

      sessionStorage.setItem('user_pin', pin);

      const mnemonic = generateMnemonic();
      await storeMnemonic(mnemonic, pin);

      const bioResponse = await registerBiometric(uid, email);
      if (!bioResponse.success) {
        setError('no se pudo obtener biométrico');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
        return;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
      <h2 className="text-xl font-semibold text-white mb-6">Crear cuenta</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="tunombre"
            required
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">PIN de seguridad (6 dígitos)</label>
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
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 tracking-widest"
          />
          <p className="text-xs text-gray-500 mt-1">Solo números, exactamente 6 dígitos</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Confirmar PIN</label>
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val.length <= 6) setConfirmPin(val);
            }}
            placeholder="••••••"
            inputMode="numeric"
            maxLength={6}
            required
            className={`w-full bg-gray-800 border text-white rounded-lg px-4 py-3 text-sm focus:outline-none tracking-widest ${
              confirmPin.length === 6 && confirmPin !== pin
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-700 focus:border-blue-500'
            }`}
          />
          {confirmPin.length === 6 && confirmPin !== pin && (
            <p className="text-xs text-red-400 mt-1">Los PINs no coinciden</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || pin.length !== 6 || confirmPin !== pin}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-gray-400 text-sm mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-blue-400 hover:text-blue-300">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}