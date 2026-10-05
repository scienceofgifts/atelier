import React, { useState } from 'react';
import { 
  Cloud, 
  UploadCloud, 
  DownloadCloud, 
  GitMerge, 
  ShieldCheck, 
  X,
  AlertTriangle 
} from 'lucide-react';

export type MigrationScenario = 'upload_local' | 'download_cloud' | 'merge_conflict' | null;

interface CloudMigrationModalProps {
  isOpen: boolean;
  scenario: MigrationScenario;
  localCount: number;
  cloudCount: number;
  onConfirmUpload: () => void;
  onConfirmDownload: () => void;
  onConfirmMerge: () => void;
  onCancel: () => void;
}

export const CloudMigrationModal: React.FC<CloudMigrationModalProps> = ({
  isOpen,
  scenario,
  localCount,
  cloudCount,
  onConfirmUpload,
  onConfirmDownload,
  onConfirmMerge,
  onCancel,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !scenario) return null;

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
            disabled={isProcessing}
            className="p-1.5 text-muted hover:text-main hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
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
            disabled={isProcessing}
            className="px-3.5 py-1.5 text-xs text-muted hover:text-main rounded-md transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {scenario === 'upload_local' && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setIsProcessing(true);
                onConfirmUpload();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-md shadow-theme-card transition-colors cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Uploading...' : 'Upload Library to Cloud'}</span>
            </button>
          )}

          {scenario === 'download_cloud' && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setIsProcessing(true);
                onConfirmDownload();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-md shadow-theme-card transition-colors cursor-pointer disabled:opacity-50"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Downloading...' : 'Download Cloud Library'}</span>
            </button>
          )}

          {scenario === 'merge_conflict' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setIsProcessing(true);
                  onConfirmDownload();
                }}
                className="px-3 py-1.5 text-xs font-medium text-main bg-surface hover:bg-surface-hover border border-theme-subtle rounded-md transition-colors cursor-pointer"
              >
                Keep Cloud Only
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setIsProcessing(true);
                  onConfirmUpload();
                }}
                className="px-3 py-1.5 text-xs font-medium text-main bg-surface hover:bg-surface-hover border border-theme-subtle rounded-md transition-colors cursor-pointer"
              >
                Keep Local Only
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setIsProcessing(true);
                  onConfirmMerge();
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-md shadow-theme-card transition-colors cursor-pointer disabled:opacity-50"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Merging...' : 'Merge Both'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
