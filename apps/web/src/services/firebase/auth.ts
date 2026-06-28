import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { hasVault, storeMnemonic, loadMnemonic } from '@/lib/crypto/vault';
import { generateMnemonic } from '@/lib/crypto/keygen';
import { registerBiometric } from '@/lib/auth/webauthn';

export interface AuthSuccessResult {
  success: true;
  uid: string;
  email: string;
  displayName: string;
  needsVaultSetup?: boolean;
  biometricMessage?: string;
  mnemonic?: string;
}

export interface AuthErrorResult {
  success: false;
  message: string;
}

export type AuthResult = AuthSuccessResult | AuthErrorResult;

/**
 * Inicia sesión con correo, contraseña y PIN de seguridad.
 * Valida o genera el vault correspondiente en el dispositivo.
 */
export async function signInWithFirebaseEmail(
  email: string,
  password: string,
  pin: string
): Promise<AuthResult> {
  try {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      return { success: false, message: 'El PIN debe ser de exactamente 6 dígitos numéricos' };
    }

    // 1. Autenticar en Firebase client
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // 2. Obtener tokens del API de NestJS
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Error en la autenticación del servidor');
    }

    const { access_token, refresh_token, uid } = await res.json();

    // Guardar tokens del API en localStorage
    localStorage.setItem('access_token', access_token);
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token);
    }



    const vaultExists = await hasVault();

    if (vaultExists) {
      const mnemonic = await loadMnemonic(pin);
      return {
        success: true,
        uid,
        email: user.email || email,
        displayName: user.displayName || '',
        mnemonic,
      };
    }

    return {
      success: true,
      uid,
      email: user.email || email,
      displayName: user.displayName || '',
      needsVaultSetup: true,
    };
  } catch (err: any) {
    if (err.message && err.message.includes('PIN incorrecto')) {
      return { success: false, message: 'PIN de seguridad incorrecto. Inténtalo de nuevo.' };
    }
    return { success: false, message: err.message || 'Email, contraseña o PIN incorrectos' };
  }
}

/**
 * Inicia sesión o registra un usuario usando Google.
 * Requiere el PIN proporcionado por el usuario.
 */
export async function signInWithFirebaseGoogle(
  pin: string,
  confirmPin?: string
): Promise<AuthResult> {
  try {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      return { success: false, message: 'El PIN debe ser de exactamente 6 dígitos numéricos' };
    }

    const vaultExists = await hasVault();
    if (!vaultExists && confirmPin && pin !== confirmPin) {
      return { success: false, message: 'Los PINs ingresados no coinciden' };
    }

    // 1. Iniciar sesión con Google usando popup
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    if (!user.email) {
      return { success: false, message: 'No se pudo obtener el email del usuario de Google' };
    }

    const idToken = await user.getIdToken();

    // 2. Autenticar en el NestJS backend para recibir tokens
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Error en la autenticación del servidor');
    }

    const { access_token, refresh_token, uid } = await res.json();

    // Guardar tokens del API en localStorage
    localStorage.setItem('access_token', access_token);
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token);
    }



    if (vaultExists) {
      const mnemonic = await loadMnemonic(pin);
      return {
        success: true,
        uid,
        email: user.email,
        displayName: user.displayName || '',
        mnemonic,
      };
    }

    return {
      success: true,
      uid,
      email: user.email,
      displayName: user.displayName || '',
      needsVaultSetup: true,
    };
  } catch (err: any) {
    if (err.message && err.message.includes('PIN incorrecto')) {
      return { success: false, message: 'PIN incorrecto. Ingresa el PIN configurado en este dispositivo.' };
    }
    return { success: false, message: err.message || 'Error al completar el inicio de sesión con Google' };
  }
}

/**
 * Registra una cuenta nueva con Email, Contraseña y PIN.
 * Genera el mnemonic local, lo encripta e intenta registrar la biometria.
 */
export async function registerWithFirebaseEmail(
  username: string,
  email: string,
  password: string,
  pin: string
): Promise<AuthResult> {
  try {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      return { success: false, message: 'El PIN debe ser de exactamente 6 dígitos numéricos' };
    }

    // 1. Crear la cuenta en el backend de NestJS
    const registerRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (!registerRes.ok) {
      const errData = await registerRes.json();
      throw new Error(errData.message || 'Error al crear la cuenta en el servidor');
    }

    // 2. Iniciar sesión en Firebase client para obtener el idToken
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // 3. Intercambiar por tokens del backend de NestJS
    const loginRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!loginRes.ok) {
      const errData = await loginRes.json();
      throw new Error(errData.message || 'Error al iniciar sesión en el servidor');
    }

    const { access_token, refresh_token, uid } = await loginRes.json();

    // Guardar tokens del API en localStorage
    localStorage.setItem('access_token', access_token);
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token);
    }



    // 4. Generar y cifrar el mnemonic de 12 palabras usando el PIN
    const mnemonic = generateMnemonic();
    await storeMnemonic(mnemonic, pin);

    // 5. Registrar biometria
    let biometricMessage = undefined;
    const bioResponse = await registerBiometric(uid, email);
    if (!bioResponse.success) {
      biometricMessage = 'no se pudo obtener biométrico';
    }

    return {
      success: true,
      uid,
      email: user.email || email,
      displayName: user.displayName || username,
      biometricMessage,
      mnemonic
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al crear la cuenta' };
  }
}

/**
 * Cierra la sesión activa en el cliente: limpia localStorage, sessionStorage y Firebase.
 */
export async function logoutFirebase(): Promise<void> {
  try {
    // 1. Cerrar sesión en Firebase Client
    await signOut(auth);
  } catch (error) {
    console.error('Error al cerrar sesión de Firebase:', error);
  } finally {
    // 2. Limpiar almacenamiento local y de sesión
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

  }
}
