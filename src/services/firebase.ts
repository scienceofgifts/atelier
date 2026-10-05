import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const STORAGE_KEY_CUSTOM_CONFIG = 'atelier_firebase_custom_config_v1';

/**
 * Retrieves Firebase configuration automatically from Vite public build environment variables,
 * or from local client storage as a developer/local fallback.
 */
export function getFirebaseConfig(): FirebaseConfig | null {
  // 1. Check Vite build-time environment variables
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const envAppId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (envApiKey && envProjectId && String(envApiKey).trim() !== '' && String(envApiKey).trim() !== '""') {
    const cleanApiKey = String(envApiKey).trim().replace(/^["']|["']$/g, '');
    const cleanProjectId = String(envProjectId).trim().replace(/^["']|["']$/g, '');
    const cleanAppId = envAppId ? String(envAppId).trim().replace(/^["']|["']$/g, '') : '';
    const cleanAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
      ? String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN).trim().replace(/^["']|["']$/g, '')
      : `${cleanProjectId}.firebaseapp.com`;

    return {
      apiKey: cleanApiKey,
      authDomain: cleanAuthDomain,
      projectId: cleanProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
        ? String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET).trim().replace(/^["']|["']$/g, '')
        : `${cleanProjectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
        ? String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID).trim().replace(/^["']|["']$/g, '')
        : '',
      appId: cleanAppId,
    };
  }

  // 2. Check local client storage for runtime configured credentials (developer/local fallback)
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_CONFIG);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read custom Firebase config:', e);
  }

  return null;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

function initFirebaseInstances(config: FirebaseConfig | null) {
  if (!config || !config.apiKey || !config.projectId) {
    appInstance = null;
    authInstance = null;
    dbInstance = null;
    googleProviderInstance = null;
    return;
  }

  try {
    appInstance = getApps().length === 0 ? initializeApp(config) : getApp();
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({ prompt: 'select_account' });
  } catch (error) {
    console.warn('[Atelier Firebase] Initialization error:', error);
    appInstance = null;
    authInstance = null;
    dbInstance = null;
    googleProviderInstance = null;
  }
}

// Initial setup
initFirebaseInstances(getFirebaseConfig());

export const getAppInstance = () => appInstance;
export const getAuthInstance = () => authInstance;
export const getDbInstance = () => dbInstance;
export const getGoogleProviderInstance = () => googleProviderInstance;
export const isConfigured = () => Boolean(appInstance && authInstance && dbInstance);

// Legacy exports for direct access
export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = googleProviderInstance;
export const isFirebaseConfigured: boolean = Boolean(authInstance && dbInstance);

/**
 * Saves and re-initializes Firebase with custom credentials.
 */
export function setCustomFirebaseConfig(config: FirebaseConfig): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_CONFIG, JSON.stringify(config));
    initFirebaseInstances(config);
    return isConfigured();
  } catch (e) {
    console.error('Failed to set custom Firebase config:', e);
    return false;
  }
}

/**
 * Clears custom Firebase credentials from local storage.
 */
export function clearCustomFirebaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_CONFIG);
    initFirebaseInstances(getFirebaseConfig());
  } catch (e) {
    console.warn('Failed to clear custom Firebase config:', e);
  }
}
