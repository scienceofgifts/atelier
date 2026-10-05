import React, { useState, useEffect } from 'react';
import { KnowledgeProvider, useKnowledge } from './context/KnowledgeContext';
import { ThemeProvider } from './context/ThemeContext';
import { ActiveView } from './types/knowledge';
import { Navbar } from './components/layout/Navbar';
import { KnowledgeDesk } from './components/desk/KnowledgeDesk';
import { KnowledgeLibrary } from './components/knowledge/KnowledgeLibrary';
import { QuestionsView } from './components/questions/QuestionsView';
import { SourcesView } from './components/sources/SourcesView';
import { TopicsView } from './components/topics/TopicsView';
import { ExperimentsView } from './components/experiments/ExperimentsView';
import { RevisitView } from './components/revisit/RevisitView';
import { CaptureModal } from './components/capture/CaptureModal';
import { SynthesisModal } from './components/synthesis/SynthesisModal';
import { ObjectDetailModal } from './components/detail/ObjectDetailModal';
import { ResetSamplesModal } from './components/common/ResetSamplesModal';
import { Download, Upload, RefreshCw, RotateCcw, Check, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ActiveView>('desk');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const { 
    items,
    activeItem, 
    setActiveItem, 
    lastSynthesis, 
    setLastSynthesis, 
    setIsCaptureOpen,
    exportArchiveJson,
    importArchiveJson,
    resetToSampleData,
    restorePreviousSnapshot,
    hasBackupSnapshot,
    backupTimestamp,
    lastResetOccurred,
    clearResetNotice
  } = useKnowledge();

  // Keyboard shortcut listener ('c' for capture, 'Escape' to close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsCaptureOpen(true);
      }
      if (e.key === 'Escape') {
        setActiveItem(null);
        setLastSynthesis(null);
        setIsCaptureOpen(false);
        setIsResetModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCaptureOpen, setActiveItem, setLastSynthesis]);

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          const content = ev.target?.result as string;
          if (content) {
            const success = importArchiveJson(content);
            if (success) {
              setRestoreMessage('Archive restored successfully from file.');
              setTimeout(() => setRestoreMessage(null), 4000);
            } else {
              alert('Failed to parse backup JSON file.');
            }
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleUndoRestore = () => {
    const success = restorePreviousSnapshot();
    if (success) {
      setRestoreMessage('Previous archive restored from local backup.');
      setTimeout(() => setRestoreMessage(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-app text-main flex flex-col font-sans transition-colors duration-200">
      {/* 3-Zone Navigation Header */}
      <Navbar currentView={currentView} onSelectView={setCurrentView} />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8">
        {/* Reset / Restore Notification Banners */}
        {lastResetOccurred && (
          <div className="mb-6 p-4 bg-surface border border-theme-strong rounded-xl shadow-theme-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs text-main font-sans">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <span className="font-semibold">Sample data restored.</span>{' '}
                <span className="text-muted font-serif">An automatic backup of your previous knowledge dataset was saved.</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleUndoRestore}
                className="px-3 py-1.5 text-xs font-medium text-main bg-surface-subtle hover:bg-surface-hover border border-theme-subtle rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-accent" />
                <span>Undo / Restore Previous Archive</span>
              </button>
              <button
                onClick={clearResetNotice}
                className="p-1 text-muted hover:text-main text-xs cursor-pointer"
                title="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {restoreMessage && (
          <div className="mb-6 p-3.5 bg-surface border border-theme-subtle rounded-xl shadow-theme-card flex items-center justify-between text-xs text-main font-sans animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{restoreMessage}</span>
            </div>
            <button onClick={() => setRestoreMessage(null)} className="text-muted hover:text-main text-xs">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {currentView === 'desk' && (
          <KnowledgeDesk
            onSelectObject={setActiveItem}
            onNavigateView={setCurrentView}
          />
        )}
        {currentView === 'knowledge' && (
          <KnowledgeLibrary onSelectObject={setActiveItem} />
        )}
        {currentView === 'questions' && (
          <QuestionsView onSelectObject={setActiveItem} />
        )}
        {currentView === 'sources' && (
          <SourcesView onSelectObject={setActiveItem} />
        )}
        {currentView === 'topics' && (
          <TopicsView onSelectObject={setActiveItem} />
        )}
        {currentView === 'experiments' && (
          <ExperimentsView onSelectObject={setActiveItem} />
        )}
        {currentView === 'revisit' && (
          <RevisitView onSelectObject={setActiveItem} />
        )}
      </main>

      {/* Global Modals */}
      <CaptureModal />
      <SynthesisModal
        synthesis={lastSynthesis}
        onClose={() => setLastSynthesis(null)}
        onSelectObject={setActiveItem}
      />
      <ObjectDetailModal
        object={activeItem}
        onClose={() => setActiveItem(null)}
        onNavigateObject={setActiveItem}
      />
      <ResetSamplesModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={resetToSampleData}
        itemCount={items.length}
      />

      {/* Quiet Archival Footer */}
      <footer className="border-t border-theme-subtle py-6 bg-surface-subtle mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted">
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-main">Atelier External Brain</span>
            <span>·</span>
            <span>Local & Grounded Intellectual Archive</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {hasBackupSnapshot && (
              <>
                <button
                  onClick={handleUndoRestore}
                  className="text-accent hover:underline flex items-center gap-1 transition-colors cursor-pointer font-medium"
                  title={backupTimestamp ? `Restore backup snapshot created ${new Date(backupTimestamp).toLocaleTimeString()}` : 'Restore previous backup snapshot'}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore Backup</span>
                </button>
                <span>·</span>
              </>
            )}
            <button
              onClick={exportArchiveJson}
              className="hover:text-main flex items-center gap-1 transition-colors cursor-pointer"
              title="Export backup as JSON"
            >
              <Download className="w-3 h-3" />
              <span>Export JSON</span>
            </button>
            <span>·</span>
            <button
              onClick={handleImportClick}
              className="hover:text-main flex items-center gap-1 transition-colors cursor-pointer"
              title="Import JSON archive"
            >
              <Upload className="w-3 h-3" />
              <span>Import</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="hover:text-main flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset sample data safely"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Samples</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <KnowledgeProvider>
        <AppContent />
      </KnowledgeProvider>
    </ThemeProvider>
  );
}
