'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { storeMnemonic } from '@/lib/crypto/vault';
import { generateMnemonic, validateMnemonic, deriveAddresses } from '@/lib/crypto/keygen';
import { registerBiometric } from '@/lib/auth/webauthn';

type CreateStep = 'form' | 'seed' | 'biometric';
type ImportStep = 'form' | 'seed-import' | 'pin' | 'biometric';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isImport = searchParams.get('mode') === 'import';

  const [step, setStep] = useState<string>('form');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [uid, setUid] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [importWords, setImportWords] = useState<string[]>(Array(12).fill(''));

  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isImport) {
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

      const { access_token, refresh_token, uid: userId } = await loginRes.json();

      localStorage.setItem('access_token', access_token);
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token);

      setUid(userId);

      if (isImport) {
        setStep('seed-import');
      } else {
        sessionStorage.setItem('user_pin', pin);
        const newMnemonic = generateMnemonic();
        await storeMnemonic(newMnemonic, pin);
        setMnemonic(newMnemonic);
        setStep('seed');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedImport = () => {
    const allFilled = importWords.every(w => w.trim() !== '');
    if (!allFilled) {
      setError('Debes ingresar las 12 palabras');
      return;
    }
    const phrase = importWords.join(' ');
    if (!validateMnemonic(phrase)) {
      setError('Frase semilla inválida. Verifica que todas las palabras sean correctas.');
      return;
    }
    setMnemonic(phrase);
    setError('');
    setStep('pin');
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('El PIN debe ser de exactamente 6 dígitos numéricos');
      return;
    }
    if (pin !== confirmPin) {
      setError('Los PINs no coinciden');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await storeMnemonic(mnemonic, pin);
      sessionStorage.setItem('user_pin', pin);
      await registerBiometric(uid, email);

      const addresses = await deriveAddresses(mnemonic);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch(`${apiUrl}/wallet/${uid}/addresses`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(addresses)
        }).catch(err => console.error('Error al guardar direcciones:', err));
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedConfirm = async () => {
    if (!confirmed) {
      setError('Debes confirmar que anotaste tu frase semilla');
      return;
    }
    setLoading(true);
    try {
      await registerBiometric(uid, email);

      const addresses = await deriveAddresses(mnemonic);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch(`${apiUrl}/wallet/${uid}/addresses`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(addresses)
        }).catch(err => console.error('Error al guardar direcciones:', err));
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al registrar biométrico');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const seedWords = mnemonic ? mnemonic.split(' ') : [];

  return (
    <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 w-full">

      {step === 'form' && (
        <>
          <h2 className="text-xl font-semibold text-white mb-1">Crear cuenta</h2>
          {isImport && (
            <p className="text-gray-400 text-sm mb-5">Importando wallet existente</p>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
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

            {!isImport && (
              <>
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
              </>
            )}

            <button
              type="submit"
              disabled={loading || (!isImport && (pin.length !== 6 || confirmPin !== pin))}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors"
            >
              {loading ? 'Creando cuenta...' : 'Continuar'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Inicia sesión
            </Link>
          </p>
        </>
      )}

      {step === 'seed' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Tu frase semilla</h2>
            <p className="text-gray-400 text-sm mt-1">Anota estas 12 palabras en orden. No la compartas con nadie.</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {seedWords.map((word, i) => (
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

          <button
            onClick={handleSeedConfirm}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-3 text-sm transition-colors"
          >
            Continuar
          </button>
        </div>
      )}

      {step === 'seed-import' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Ingresa tu frase semilla</h2>
            <p className="text-gray-400 text-sm mt-1">Escribe tus 12 palabras en el orden correcto.</p>
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

          <button
            onClick={handleSeedImport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-3 text-sm transition-colors"
          >
            Continuar
          </button>
        </div>
      )}

      {step === 'pin' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Crea tu PIN de seguridad</h2>
            <p className="text-gray-400 text-sm mt-1">Este PIN protegerá tu wallet en este dispositivo.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">PIN (6 dígitos)</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 6) setPin(val);
                  setError('');
                }}
                placeholder="••••••"
                inputMode="numeric"
                maxLength={6}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 tracking-widest"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirmar PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 6) setConfirmPin(val);
                  setError('');
                }}
                placeholder="••••••"
                inputMode="numeric"
                maxLength={6}
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
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={loading || pin.length !== 6 || confirmPin !== pin}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors"
          >
            {loading ? 'Guardando...' : 'Continuar'}
          </button>
        </div>
      )}

    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}