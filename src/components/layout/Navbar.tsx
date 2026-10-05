import React from 'react';
import { ActiveView } from '../../types/knowledge';
import { useKnowledge } from '../../context/KnowledgeContext';
import { ThemeSelector } from './ThemeSelector';
import { Plus, Search, BookOpen, HelpCircle, Film, Compass, FlaskConical, RotateCcw } from 'lucide-react';

interface NavbarProps {
  currentView: ActiveView;
  onSelectView: (view: ActiveView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onSelectView }) => {
  const { setIsCaptureOpen, setSearchQuery, items } = useKnowledge();

  const openQuestionsCount = items.filter(i => i.type === 'question').length;

  const navLinks: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'desk', label: 'Desk', icon: <Compass className="w-4 h-4" /> },
    { id: 'knowledge', label: 'Archive', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'questions', label: 'Questions', icon: <HelpCircle className="w-4 h-4" />, badge: openQuestionsCount },
    { id: 'sources', label: 'Sources', icon: <Film className="w-4 h-4" /> },
    { id: 'topics', label: 'Topics', icon: <Compass className="w-4 h-4" /> },
    { id: 'experiments', label: 'Experiments', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'revisit', label: 'Revisit', icon: <RotateCcw className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-theme-subtle transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => {
            onSelectView('desk');
            setSearchQuery('');
          }}
          className="text-left group cursor-pointer"
        >
          <span className="font-serif text-2xl tracking-tight font-medium text-main hover:text-muted transition-colors">
            Atelier
          </span>
        </button>

        {/* Zone 2: Clean 4-7 text navigation links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
          {navLinks.map(link => {
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onSelectView(link.id)}
                className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-main font-semibold bg-surface-subtle border border-theme-subtle'
                    : 'text-muted hover:text-main hover:bg-surface-hover'
                }`}
              >
                <span>{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="ml-1 text-[11px] font-mono opacity-60">
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary actions & Appearance Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectView('desk')}
            title="Focus search input"
            className="p-1.5 text-muted hover:text-main hover:bg-surface-hover rounded-md transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Unobtrusive Appearance control */}
          <ThemeSelector />

          <button
            onClick={() => setIsCaptureOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-accent-contrast border border-theme-strong hover:opacity-90 rounded-md shadow-theme-card transition-all whitespace-nowrap cursor-pointer ml-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Capture</span>
          </button>
        </div>
      </div>

      {/* Mobile nav rail */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-theme-subtle scrollbar-none bg-surface-subtle">
        {navLinks.map(link => (
          <button
            key={link.id}
            onClick={() => onSelectView(link.id)}
            className={`px-2.5 py-1 text-xs whitespace-nowrap rounded ${
              currentView === link.id
                ? 'bg-surface text-main font-semibold border border-theme-subtle'
                : 'text-muted hover:text-main'
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>
    </header>
  );
};
