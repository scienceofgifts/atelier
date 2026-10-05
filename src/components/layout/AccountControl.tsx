import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useKnowledge } from '../../context/KnowledgeContext';
import { SyncStatus } from '../../services/syncService';
import { FirebaseConfig } from '../../services/firebase';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  LogOut, 
  Download, 
  User as UserIcon,
  ChevronDown,
  Settings,
  X,
  KeyRound,
  ExternalLink
} from 'lucide-react';

interface AccountControlProps {
  syncStatus?: SyncStatus;
  onSyncNow?: () => void;
}

export const AccountControl: React.FC<AccountControlProps> = ({ 
  syncStatus = 'idle',
  onSyncNow 
}) => {
  const { 
    user, 
    isConfigured, 
    signInWithGoogle, 
    signOut, 
    loading, 
    authError, 
    clearAuthError,
    configureFirebase,
    currentConfig,
    clearConfig
  } = useAuth();

  const { exportArchiveJson } = useKnowledge();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Custom configuration form state
  const [apiKeyInput, setApiKeyInput] = useState(currentConfig?.apiKey || '');
  const [projectIdInput, setProjectIdInput] = useState(currentConfig?.projectId || '');
  const [authDomainInput, setAuthDomainInput] = useState(currentConfig?.authDomain || '');
  const [appIdInput, setAppIdInput] = useState(currentConfig?.appId || '');
  const [configSaveError, setConfigSaveError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim() || !projectIdInput.trim()) {
      setConfigSaveError('API Key and Project ID are required.');
      return;
    }

    const config: FirebaseConfig = {
      apiKey: apiKeyInput.trim(),
      projectId: projectIdInput.trim(),
      authDomain: authDomainInput.trim() || `${projectIdInput.trim()}.firebaseapp.com`,
      appId: appIdInput.trim() || '',
    };

    const success = configureFirebase(config);
    if (success) {
      setConfigSaveError(null);
      setIsConfigModalOpen(false);
      // Automatically attempt sign in
      signInWithGoogle();
    } else {
      setConfigSaveError('Failed to initialize Firebase with the provided credentials.');
    }
  };

  const getSyncBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <span className="flex items-center gap-1 text-[11px] text-accent font-mono">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Syncing...</span>
          </span>
        );
      case 'synced':
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
            <Check className="w-3 h-3" />
            <span className="hidden sm:inline">Synced</span>
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-mono">
            <Cloud className="w-3 h-3" />
            <span className="hidden sm:inline">Pending</span>
          </span>
        );
      case 'offline':
        return (
          <span className="flex items-center gap-1 text-[11px] text-muted font-mono">
            <CloudOff className="w-3 h-3" />
            <span className="hidden sm:inline">Offline</span>
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[11px] text-rose-500 font-mono">
            <AlertCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Sync Error</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] text-muted font-mono">
            <Cloud className="w-3 h-3" />
            <span className="hidden sm:inline">Cloud Ready</span>
          </span>
        );
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* State 1: Signed In */}
        {user ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-2.5 py-1 text-xs text-main bg-surface hover:bg-surface-hover border border-theme-subtle rounded-lg shadow-theme-card transition-colors cursor-pointer"
            title={`Signed in as ${user.email}`}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-5 h-5 rounded-full object-cover border border-theme-subtle"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-semibold">
                {user.displayName ? user.displayName[0].toUpperCase() : <UserIcon className="w-3 h-3" />}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {getSyncBadge()}
              <ChevronDown className={`w-3 h-3 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
        ) : isConfigured ? (
          /* State 2: Configured, but Signed Out -> Show "Sign In" Button */
          <button
            onClick={() => signInWithGoogle()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-main bg-surface hover:bg-surface-hover border border-theme-subtle rounded-lg shadow-theme-card transition-colors cursor-pointer disabled:opacity-50"
            title="Sign in with Google to sync across devices"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Connecting...' : 'Sign In'}</span>
          </button>
        ) : (
          /* State 3: Unconfigured / Local Mode -> Clickable Button that opens Connect dialog */
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted hover:text-main font-mono border border-theme-subtle rounded-md bg-surface-subtle hover:bg-surface-hover transition-colors cursor-pointer"
            title="Atelier is currently in local IndexedDB mode. Click to connect your Firebase Web App."
          >
            <CloudOff className="w-3.5 h-3.5 opacity-70" />
            <span className="text-[11px]">Local Mode</span>
          </button>
        )}

        {/* Auth Error Banner */}
        {authError && (
          <div className="absolute right-0 mt-2 w-72 p-3 bg-surface border border-rose-300 dark:border-rose-900 rounded-lg shadow-theme-modal z-50 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in duration-150">
            <p className="font-sans leading-relaxed">{authError}</p>
            <div className="mt-2 flex items-center justify-between border-t border-rose-200 dark:border-rose-900/50 pt-1.5">
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="text-[11px] underline font-medium hover:text-main cursor-pointer"
              >
                Configure Firebase
              </button>
              <button 
                onClick={clearAuthError}
                className="text-[11px] underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Signed In Account Dropdown Menu */}
        {isOpen && user && (
          <div className="absolute right-0 mt-2 w-64 p-3 bg-surface border border-theme-subtle rounded-xl shadow-theme-modal z-50 space-y-3 animate-in fade-in duration-100">
            <div className="border-b border-theme-subtle pb-2.5">
              <p className="text-xs font-serif font-medium text-main truncate">
                {user.displayName || 'Personal Account'}
              </p>
              <p className="text-[11px] font-mono text-muted truncate">
                {user.email}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between py-1 text-xs">
                <span className="text-muted font-mono text-[11px]">Sync Status</span>
                {getSyncBadge()}
              </div>

              {onSyncNow && (
                <button
                  onClick={() => {
                    onSyncNow();
                  }}
                  disabled={syncStatus === 'syncing'}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-main hover:bg-surface-hover rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className={`w-3.5 h-3.5 text-muted ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  exportArchiveJson();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-main hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-muted" />
                  <span>Export JSON Backup</span>
                </span>
              </button>

              <button
                onClick={() => {
                  setIsConfigModalOpen(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-main hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-muted" />
                  <span>Firebase Settings</span>
                </span>
              </button>
            </div>

            <div className="border-t border-theme-subtle pt-2">
              <button
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Firebase Configuration & Sign In Dialog */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-surface border border-theme-subtle rounded-xl shadow-theme-modal w-full max-w-md overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-theme-subtle flex items-center justify-between bg-surface-subtle">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-accent" />
                <h3 className="font-serif text-lg font-medium text-main">
                  Cloud Synchronization & Account
                </h3>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 text-muted hover:text-main hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-5 space-y-4">
              <div className="p-3 bg-surface-subtle border border-theme-subtle rounded-lg text-xs text-muted leading-relaxed">
                <p className="font-medium text-main mb-1">Local-First Architecture</p>
                <p>
                  Atelier stores your knowledge locally in your browser's IndexedDB. Connect your Firebase Web App to synchronize your notes across multiple devices with Google Sign-In.
                </p>
              </div>

              {isConfigured ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                    <Check className="w-4 h-4" />
                    <span>Firebase configuration is active ({currentConfig?.projectId})</span>
                  </div>

                  {!user && (
                    <button
                      onClick={() => {
                        signInWithGoogle();
                        setIsConfigModalOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-lg shadow-theme-card transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign In with Google</span>
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSaveConfig} className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-muted">
                      Enter Firebase Web Credentials
                    </span>
                  </div>

                  {configSaveError && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-600 dark:text-rose-400">
                      {configSaveError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono text-muted mb-1">
                      API Key (VITE_FIREBASE_API_KEY)
                    </label>
                    <input
                      type="text"
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded-md focus:border-theme-strong focus:outline-hidden font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-muted mb-1">
                      Project ID (VITE_FIREBASE_PROJECT_ID)
                    </label>
                    <input
                      type="text"
                      value={projectIdInput}
                      onChange={e => setProjectIdInput(e.target.value)}
                      placeholder="my-atelier-app"
                      className="w-full px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded-md focus:border-theme-strong focus:outline-hidden font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-muted mb-1">
                      App ID (VITE_FIREBASE_APP_ID)
                    </label>
                    <input
                      type="text"
                      value={appIdInput}
                      onChange={e => setAppIdInput(e.target.value)}
                      placeholder="1:123456789:web:abcdef"
                      className="w-full px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded-md focus:border-theme-strong focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsConfigModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-muted hover:text-main cursor-pointer"
                    >
                      Stay in Local Mode
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-md shadow-theme-card transition-colors cursor-pointer"
                    >
                      Connect & Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer with Clear Option if Configured */}
            {isConfigured && (
              <div className="px-6 py-3 border-t border-theme-subtle bg-surface-subtle flex items-center justify-between text-[11px] text-muted">
                <span>Configured locally</span>
                <button
                  onClick={() => {
                    clearConfig();
                    setApiKeyInput('');
                    setProjectIdInput('');
                    setAuthDomainInput('');
                    setAppIdInput('');
                  }}
                  className="text-rose-500 hover:underline cursor-pointer"
                >
                  Reset Configuration
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
