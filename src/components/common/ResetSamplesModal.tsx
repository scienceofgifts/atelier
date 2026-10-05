import React from 'react';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';

interface ResetSamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemCount: number;
}

export const ResetSamplesModal: React.FC<ResetSamplesModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-theme-subtle rounded-xl shadow-theme-modal w-full max-w-md p-6 space-y-5 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-surface-subtle text-accent rounded-lg border border-theme-subtle">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-medium text-main">Reset Sample Dataset?</h3>
              <p className="text-xs font-mono text-muted">Safe local restore with automatic backup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-main rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-main font-serif leading-relaxed">
          <p>
            This will replace the active workspace entries with the original Atelier sample datasets.
          </p>
          <div className="p-3 bg-surface-subtle border border-theme-subtle rounded-lg text-xs font-sans text-muted space-y-1">
            <div className="font-semibold text-main flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Automatic Local Backup Protection</span>
            </div>
            <p className="leading-normal">
              An automatic local snapshot of your current {itemCount} knowledge objects will be saved to your browser storage before resetting. You can undo or restore your data at any time.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-main bg-surface-subtle hover:bg-surface-hover border border-theme-subtle rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium bg-accent text-accent-contrast border border-theme-strong hover:opacity-90 rounded-lg shadow-theme-card transition-colors cursor-pointer"
          >
            Reset Sample Dataset
          </button>
        </div>
      </div>
    </div>
  );
};
