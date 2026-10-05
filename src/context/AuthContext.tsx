import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  Unsubscribe
} from 'firebase/auth';
import { 
  getAuthInstance, 
  getGoogleProviderInstance, 
  isConfigured, 
  setCustomFirebaseConfig, 
  clearCustomFirebaseConfig,
  FirebaseConfig,
  getFirebaseConfig
} from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
  configureFirebase: (config: FirebaseConfig) => boolean;
  clearConfig: () => void;
  clearAuthError: () => void;
  currentConfig: FirebaseConfig | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [configured, setConfigured] = useState<boolean>(isConfigured());
  const [loading, setLoading] = useState<boolean>(isConfigured());
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthInstance();
    if (!auth) {
      setLoading(false);
      setConfigured(false);
      return;
    }

    setConfigured(true);

    // Set local session persistence
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.warn('[Atelier Auth] Persistence warning:', err);
    });

    let unsubscribe: Unsubscribe | null = null;
    try {
      unsubscribe = onAuthStateChanged(auth, currentUser => {
        setUser(currentUser);
        setLoading(false);
      }, err => {
        console.error('[Atelier Auth] Auth state listener error:', err);
        setAuthError(err.message);
        setLoading(false);
      });
    } catch (e: any) {
      console.warn('[Atelier Auth] Failed to attach listener:', e);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [configured]);

  const signInWithGoogle = async (): Promise<User | null> => {
    const auth = getAuthInstance();
    const googleProvider = getGoogleProviderInstance();

    if (!auth || !googleProvider) {
      setAuthError('Firebase Web App credentials are not configured yet.');
      return null;
    }

    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      return result.user;
    } catch (err: any) {
      console.error('[Atelier Auth] Sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setAuthError(err.message || 'Failed to sign in with Google.');
      }
      return null;
    }
  };

  const signOut = async (): Promise<void> => {
    const auth = getAuthInstance();
    if (!auth) {
      setUser(null);
      return;
    }
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setAuthError(null);
    } catch (err: any) {
      console.error('[Atelier Auth] Sign-out error:', err);
      setAuthError(err.message || 'Failed to sign out.');
    }
  };

  const configureFirebase = (config: FirebaseConfig): boolean => {
    const success = setCustomFirebaseConfig(config);
    setConfigured(success);
    if (success) {
      setAuthError(null);
    } else {
      setAuthError('Invalid Firebase configuration values.');
    }
    return success;
  };

  const clearConfig = () => {
    clearCustomFirebaseConfig();
    setConfigured(false);
    setUser(null);
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: configured,
        authError,
        signInWithGoogle,
        signOut,
        configureFirebase,
        clearConfig,
        clearAuthError,
        currentConfig: getFirebaseConfig(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
