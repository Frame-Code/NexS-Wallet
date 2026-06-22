'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { hasVault, storeMnemonic, loadMnemonic } from '@/lib/crypto/vault';
import { generateMnemonic } from '@/lib/crypto/keygen';
import { registerBiometric, verifyBiometric } from '@/lib/auth/webauthn';
import { isBiometricAvailable } from '@/lib/auth/webauthn.utils';


interface GoogleAuthData {
  idToken: string;
  email: string;
  uid: string;
  needsNewPin: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const [loginMode, setLoginMode] = useState<'standard' | 'biometric' | 'google_pin'>('standard');
  const [googleAuthData, setGoogleAuthData] = useState<GoogleAuthData | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    const hasToken = localStorage.getItem('access_token');
    const hasBiometric = localStorage.getItem('biometric_cred_id');
    if (hasToken && hasBiometric) {
      setLoginMode('biometric');
    }
  }, []);

  const handleBiometricLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const verified = await verifyBiometric();
      if (!verified) {
        setError('Autenticación biométrica fallida o cancelada');
        return;
      }

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        setLoginMode('standard');
        setError('Sesión expirada. Inicia sesión con tu correo o Google.');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
      const res = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        setLoginMode('standard');
        setError('Sesión expirada. Inicia sesión con tu correo o Google.');
        return;
      }

      const { access_token } = await res.json();
      localStorage.setItem('access_token', access_token);
      sessionStorage.setItem('biometric_auth', 'true');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al verificar la biometría');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage('');

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('El PIN debe ser de exactamente 6 dígitos numéricos');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error en la autenticación del servidor');
      }

      const { access_token, refresh_token, uid } = await res.json();

      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }

      sessionStorage.setItem('user_pin', pin);

      const vaultExists = await hasVault();
      if (vaultExists) {
        await loadMnemonic(pin);
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('PIN incorrecto')) {
        setError('PIN de seguridad incorrecto. Inténtalo de nuevo.');
      } else {
        setError(err.message || 'Email, contraseña o PIN incorrectos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    setInfoMessage('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email) {
        throw new Error('No se pudo obtener el email del usuario de Google');
      }

      const idToken = await user.getIdToken();
      const vaultExists = await hasVault();

      const bioAvailable = await isBiometricAvailable();
      const hasCredId = !!localStorage.getItem('biometric_cred_id');

      if (bioAvailable && hasCredId) {
        const verified = await verifyBiometric();
        if (!verified) {
          throw new Error('Autenticación biométrica requerida para continuar');
        }
      }

      setGoogleAuthData({
        idToken,
        email: user.email,
        uid: user.uid,
        needsNewPin: !vaultExists
      });
      setLoginMode('google_pin');
      setPin('');
      setConfirmPin('');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleAuthData) return;

    setLoading(true);
    setError('');

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('El PIN debe ser de exactamente 6 dígitos numéricos');
      setLoading(false);
      return;
    }

    if (googleAuthData.needsNewPin && pin !== confirmPin) {
      setError('Los PINs ingresados no coinciden');
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: googleAuthData.idToken }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error en la autenticación del servidor');
      }

      const { access_token, refresh_token, uid } = await res.json();

      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }

      sessionStorage.setItem('user_pin', pin);

      if (googleAuthData.needsNewPin) {
        const mnemonic = generateMnemonic();
        await storeMnemonic(mnemonic, pin);

        const bioResponse = await registerBiometric(uid, googleAuthData.email);
        if (!bioResponse.success) {
          setError('no se pudo obtener biométrico');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
          return;
        }
        router.push('/dashboard');
      } else {
        const vaultExists = await hasVault();
        if (vaultExists) {
          await loadMnemonic(pin);
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('PIN incorrecto')) {
        setError('PIN incorrecto. Ingresa el PIN configurado en este dispositivo.');
      } else {
        setError(err.message || 'Error al completar el inicio de sesión con Google');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 max-w-md w-full mx-auto">
      <h2 className="text-xl font-semibold text-white mb-6">
        {loginMode === 'biometric' && 'Bienvenido de nuevo'}
        {loginMode === 'google_pin' && (googleAuthData?.needsNewPin ? 'Configurar PIN' : 'Desbloquear Wallet')}
        {loginMode === 'standard' && 'Iniciar sesión'}
      </h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm rounded-lg px-4 py-3 mb-4">
          {infoMessage}
        </div>
      )}

      {loginMode === 'biometric' && (
        <div className="space-y-6 text-center">
          <p className="text-sm text-gray-400">Verifica tu huella o reconocimiento facial para ingresar.</p>
          <div className="flex justify-center py-4">
            <button
              onClick={handleBiometricLogin}
              disabled={loading}
              className="p-6 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-full border border-blue-500/30 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 0-10 10c0 5.523 4.477 10 10 10s10-4.477 10-10A10 10 0 0 0 12 2z" />
                <path d="M12 6v6" />
                <path d="M8 12h8" />
                <path d="M12 12l3 3" />
                <path d="M12 12l-3 3" />
              </svg>
            </button>
          </div>
          <button
            onClick={handleBiometricLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors"
          >
            {loading ? 'Verificando...' : 'Autenticar con Biometría'}
          </button>
          <div className="text-center pt-2">
            <button
              onClick={() => setLoginMode('standard')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              O ingresa con correo o Google
            </button>
          </div>
        </div>
      )}

      {loginMode === 'google_pin' && googleAuthData && (
        <form onSubmit={handleGooglePinSubmit} className="space-y-4">
          <p className="text-sm text-gray-400 mb-2">
            {googleAuthData.needsNewPin 
              ? 'Por favor, crea un PIN de seguridad de 6 dígitos numéricos para proteger tu monedero.'
              : 'Ingresa tu PIN de seguridad de 6 dígitos para desbloquear tu monedero.'}
          </p>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {googleAuthData.needsNewPin ? 'Crea tu PIN (6 dígitos)' : 'PIN de seguridad'}
            </label>
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
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 tracking-widest text-center font-mono"
            />
          </div>

          {googleAuthData.needsNewPin && (
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
                className={`w-full bg-gray-800 border text-white rounded-lg px-4 py-3 text-sm focus:outline-none tracking-widest text-center font-mono ${
                  confirmPin.length === 6 && confirmPin !== pin
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-700 focus:border-blue-500'
                }`}
              />
              {confirmPin.length === 6 && confirmPin !== pin && (
                <p className="text-xs text-red-400 mt-1">Los PINs no coinciden</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setLoginMode('standard');
                setGoogleAuthData(null);
                setPin('');
                setConfirmPin('');
              }}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg py-3 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || pin.length !== 6 || (googleAuthData.needsNewPin && confirmPin !== pin)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors"
            >
              {loading ? 'Confirmando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      )}

      {loginMode === 'standard' && (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading || pin.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-gray-500 text-sm">O continúa con</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium rounded-lg py-3 text-sm transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.2 44 30 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Continuar con Google
          </button>

          <p className="text-center text-gray-400 text-sm mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300">
              Regístrate
            </Link>
          </p>
        </>
      )}
    </div>
  );
}