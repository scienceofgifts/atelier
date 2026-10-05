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
 * Retrieves Firebase configuration from Vite environment variables or local storage.
 */
export function getFirebaseConfig(): FirebaseConfig | null {
  // 1. Check Vite environment variables
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId && envApiKey.trim() !== '') {
    return {
      apiKey: envApiKey.trim(),
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || `${envProjectId.trim()}.firebaseapp.com`,
      projectId: envProjectId.trim(),
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || `${envProjectId.trim()}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || '',
    };
  }

  // 2. Check local client storage for runtime configured credentials
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
 * Saves and re-initializes Firebase with new credentials.
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
