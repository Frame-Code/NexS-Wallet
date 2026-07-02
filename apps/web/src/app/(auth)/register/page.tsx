'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNavigate } from '@/hooks/useNavigate';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { storeMnemonic } from '@/lib/crypto/vault';
import { generateMnemonic, validateMnemonic, deriveAddresses } from '@/lib/crypto/keygen';
import { registerBiometric } from '@/lib/auth/webauthn';
import { useWallet } from '@/contexts/WalletContext';

type RegisterStep = 'form' | 'seed' | 'seed-import' | 'google-pin' | 'pin';

function RegisterForm() {
  const router = useRouter();
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const { unlockWallet } = useWallet();
  const isImport = searchParams.get('mode') === 'import';

  const [step, setStep] = useState<RegisterStep>('form');
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

  const handleGoogleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo?.isNewUser;

      if (!isNewUser) {
        throw new Error('Esta cuenta de Google ya está registrada. Por favor, inicia sesión.');
      }

      const idToken = await user.getIdToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
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
      if (userId) localStorage.setItem('uid', userId);

      setUid(userId);
      setEmail(user.email || '');
      setStep(isImport ? 'seed-import' : 'google-pin');
    } catch (err: any) {
      setError(err.message || 'Error con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePinSubmit = async () => {
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
      const newMnemonic = generateMnemonic();
      await storeMnemonic(newMnemonic, pin);
      unlockWallet(newMnemonic);
      setMnemonic(newMnemonic);
      setStep('seed');
    } catch (err: any) {
      setError(err.message || 'Error al guardar el PIN');
    } finally {
      setLoading(false);
    }
  };

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
        const isConflict = registerRes.status === 409 || (errData.message && errData.message.includes('registrado'));
        if (isConflict) {
          throw new Error('Este email ya está registrado. Por favor, inicia sesión.');
        }
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
      if (userId) localStorage.setItem('uid', userId);

      setUid(userId);
      if (isImport) {
        setStep('seed-import');
      } else {
        const newMnemonic = generateMnemonic();
        await storeMnemonic(newMnemonic, pin);
        unlockWallet(newMnemonic);
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
    const allFilled = importWords.every((word) => word.trim() !== '');
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
      unlockWallet(mnemonic);
      await registerBiometric(uid, email);

      const addresses = await deriveAddresses(mnemonic);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch(`${apiUrl}/wallet/${uid}/addresses`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(addresses),
        }).catch((err) => console.error('Error al guardar direcciones:', err));
      }

      navigate('/dashboard');
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
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(addresses),
        }).catch((err) => console.error('Error al guardar direcciones:', err));
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al registrar biométrico');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const seedWords = mnemonic ? mnemonic.split(' ') : [];

  return (
    <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 w-full">
          {step === 'form' && (
            <>
              <h2 className="text-xl font-semibold text-white">Crear cuenta</h2>
              {isImport && <p className="mt-1 text-sm text-slate-400">Importando wallet existente</p>}

              {error && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="tu nombre"
                    required
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500"
                  />
                </div>

                {!isImport && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">PIN de seguridad (6 dígitos)</label>
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
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm tracking-widest text-white outline-none transition focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm text-slate-300">Confirmar PIN</label>
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
                        className={`w-full rounded-2xl border px-4 py-3 text-sm tracking-widest text-white outline-none transition ${
                          confirmPin.length === 6 && confirmPin !== pin
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-slate-700 bg-slate-950/70 focus:border-violet-500'
                        }`}
                      />
                      {confirmPin.length === 6 && confirmPin !== pin && (
                        <p className="mt-1 text-xs text-red-400">Los PINs no coinciden</p>
                      )}
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading || (!isImport && (pin.length !== 6 || confirmPin !== pin))}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (isImport ? 'Iniciando...' : 'Creando cuenta...') : 'Continuar con Email'}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-slate-900 px-2 text-slate-400">O continuar con</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>

              <p className="mt-6 text-center text-sm text-slate-400">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-violet-400 hover:text-violet-300">
                  Inicia sesión
                </Link>
              </p>
            </>
          )}

          {step === 'seed' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Tu frase semilla</h2>
                <p className="mt-1 text-sm text-slate-400">Anota estas 12 palabras en orden. No la compartas con nadie.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-800 p-4 sm:grid-cols-3">
                {seedWords.map((word, index) => (
                  <div key={`${word}-${index}`} className="flex gap-2 rounded-xl bg-slate-700 px-3 py-2 text-sm text-white">
                    <span className="text-xs text-slate-500">{index + 1}.</span>
                    <span>{word}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                Guarda esta frase en un lugar seguro. Si la pierdes, no podrás recuperar tu wallet.
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => {
                    setConfirmed(e.target.checked);
                    setError('');
                  }}
                  className="mt-0.5 accent-violet-500"
                />
                <span className="text-sm text-slate-400">He anotado mi frase semilla en un lugar seguro</span>
              </label>

              <button
                type="button"
                onClick={handleSeedConfirm}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 'seed-import' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Ingresa tu frase semilla</h2>
                <p className="mt-1 text-sm text-slate-400">Escribe tus 12 palabras en el orden correcto.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-800 p-4 sm:grid-cols-3">
                {Array.from({ length: 12 }, (_, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-xl bg-slate-700 px-2 py-2">
                    <span className="w-4 shrink-0 text-xs text-slate-500">{index + 1}.</span>
                    <input
                      type="text"
                      value={importWords[index]}
                      onChange={(e) => {
                        const updated = [...importWords];
                        updated[index] = e.target.value.toLowerCase().trim();
                        setImportWords(updated);
                        setError('');
                      }}
                      className="w-full bg-transparent text-sm text-white outline-none"
                      placeholder="palabra"
                    />
                  </div>
                ))}
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSeedImport}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 'google-pin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Crea tu PIN de seguridad</h2>
                <p className="mt-1 text-sm text-slate-400">Has iniciado sesión con Google. Ahora crea un PIN para proteger tu wallet en este dispositivo.</p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">PIN (6 dígitos)</label>
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
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm tracking-widest text-white outline-none transition focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Confirmar PIN</label>
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
                    className={`w-full rounded-2xl border px-4 py-3 text-sm tracking-widest text-white outline-none transition ${
                      confirmPin.length === 6 && confirmPin !== pin
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-700 bg-slate-950/70 focus:border-violet-500'
                    }`}
                  />
                  {confirmPin.length === 6 && confirmPin !== pin && (
                    <p className="mt-1 text-xs text-red-400">Los PINs no coinciden</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGooglePinSubmit}
                disabled={loading || pin.length !== 6 || confirmPin !== pin}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Guardando...' : 'Continuar'}
              </button>
            </div>
          )}

          {step === 'pin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Crea tu PIN de seguridad</h2>
                <p className="mt-1 text-sm text-slate-400">Este PIN protegerá tu wallet en este dispositivo.</p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">PIN (6 dígitos)</label>
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
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm tracking-widest text-white outline-none transition focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Confirmar PIN</label>
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
                    className={`w-full rounded-2xl border px-4 py-3 text-sm tracking-widest text-white outline-none transition ${
                      confirmPin.length === 6 && confirmPin !== pin
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-700 bg-slate-950/70 focus:border-violet-500'
                    }`}
                  />
                  {confirmPin.length === 6 && confirmPin !== pin && (
                    <p className="mt-1 text-xs text-red-400">Los PINs no coinciden</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handlePinSubmit}
                disabled={loading || pin.length !== 6 || confirmPin !== pin}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <RegisterForm />
    </Suspense>
  );
}