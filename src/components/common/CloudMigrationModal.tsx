import React, { useState } from 'react';
import { 
  Cloud, 
  UploadCloud, 
  DownloadCloud, 
  GitMerge, 
  ShieldCheck, 
  X,
  AlertTriangle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export type MigrationScenario = 'upload_local' | 'download_cloud' | 'merge_conflict' | null;

interface CloudMigrationModalProps {
  isOpen: boolean;
  scenario: MigrationScenario;
  localCount: number;
  cloudCount: number;
  error?: string | null;
  onConfirmUpload: () => Promise<void> | void;
  onConfirmDownload: () => Promise<void> | void;
  onConfirmMerge: () => Promise<void> | void;
  onCancel: () => void;
  onClearError?: () => void;
}

export const CloudMigrationModal: React.FC<CloudMigrationModalProps> = ({
  isOpen,
  scenario,
  localCount,
  cloudCount,
  error,
  onConfirmUpload,
  onConfirmDownload,
  onConfirmMerge,
  onCancel,
  onClearError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !scenario) return null;

  const handleAction = async (action: () => Promise<void> | void) => {
    setIsProcessing(true);
    if (onClearError) onClearError();
    try {
      await action();
    } catch (err) {
      console.error('[CloudMigrationModal] Action error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-theme-subtle rounded-xl shadow-theme-modal w-full max-w-lg overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-subtle flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-accent" />
            <h3 className="font-serif text-lg font-medium text-main">
              {scenario === 'upload_local' && 'Connect Atelier to Cloud'}
              {scenario === 'download_cloud' && 'Download Cloud Library'}
              {scenario === 'merge_conflict' && 'Reconcile Cloud & Local Data'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-muted hover:text-main hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
            title="Close and stay in local mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-surface-subtle border border-theme-subtle rounded-lg text-xs text-muted leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-main">Automatic Safety Snapshot</p>
              <p className="mt-0.5">
                Before applying cloud changes, an independent backup snapshot of your local data will be saved.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Cloud Synchronization Notice</p>
                <p className="mt-0.5 opacity-90">{error}</p>
                <p className="mt-1 text-[11px] text-muted">
                  Your local knowledge is completely safe in IndexedDB. You can retry or stay in local mode.
                </p>
              </div>
            </div>
          )}

          {scenario === 'upload_local' && (
            <div className="space-y-3 text-sm text-main leading-relaxed">
              <p>
                We found <strong className="font-semibold">{localCount} knowledge objects</strong> stored on this device.
              </p>
              <p className="text-xs text-muted">
                Uploading your local archive to your personal Firestore account will sync your notes, questions, and observations across all your devices.
              </p>
            </div>
          )}

          {scenario === 'download_cloud' && (
            <div className="space-y-3 text-sm text-main leading-relaxed">
              <p>
                We found <strong className="font-semibold">{cloudCount} knowledge objects</strong> in your personal cloud account.
              </p>
              <p className="text-xs text-muted">
                Would you like to sync your cloud library down to this device?
              </p>
            </div>
          )}

          {scenario === 'merge_conflict' && (
            <div className="space-y-3 text-sm text-main leading-relaxed">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Both this device ({localCount} items) and your cloud account ({cloudCount} items) contain knowledge objects.
                </p>
              </div>
              <p className="text-xs text-muted">
                Choose how you would like to synchronize your knowledge library:
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-theme-subtle bg-surface-subtle flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs text-muted hover:text-main rounded-md transition-colors cursor-pointer"
          >
            {isProcessing ? 'Cancel Upload' : 'Stay in Local Mode'}
          </button>

          {scenario === 'upload_local' && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction(onConfirmUpload)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-md shadow-theme-card transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Cloud...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Library to Cloud</span>
                </>
              )}
            </button>
          )}

          {scenario === 'download_cloud' && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction(onConfirmDownload)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-md shadow-theme-card transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Download Cloud Library</span>
                </>
              )}
            </button>
          )}

          {scenario === 'merge_conflict' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction(onConfirmDownload)}
                className="px-3 py-1.5 text-xs font-medium text-main bg-surface hover:bg-surface-hover border border-theme-subtle rounded-md transition-colors cursor-pointer"
              >
                Keep Cloud Only
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction(onConfirmUpload)}
                className="px-3 py-1.5 text-xs font-medium text-main bg-surface hover:bg-surface-hover border border-theme-subtle rounded-md transition-colors cursor-pointer"
              >
                Keep Local Only
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction(onConfirmMerge)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-md shadow-theme-card transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Merging...</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Merge Both</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
