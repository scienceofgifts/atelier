import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeId } from '../../context/ThemeContext';
import { Palette, Check } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeConfig = themes.find(t => t.id === theme) || themes[0];

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors border border-theme-subtle bg-surface hover:bg-surface-hover text-main shadow-theme-card cursor-pointer"
        title="Appearance / Theme selector"
      >
        <Palette className="w-3.5 h-3.5 text-muted" />
        <span className="hidden sm:inline font-sans">{activeConfig.name}</span>
        <div className="flex items-center gap-0.5 ml-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeConfig.previewBg, border: '1px solid var(--border-subtle)' }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeConfig.previewAccent }} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-theme-subtle bg-surface shadow-theme-modal p-2 z-50 animate-in fade-in duration-150">
          <div className="px-3 py-1.5 border-b border-theme-subtle mb-1 flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted font-semibold">
              Appearance
            </span>
            <span className="text-[10px] font-mono text-faint">Persistent</span>
          </div>

          <div className="space-y-1">
            {themes.map(t => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-surface-subtle font-semibold text-main'
                      : 'hover:bg-surface-hover text-muted hover:text-main'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span>{t.name}</span>
                      {isActive && <Check className="w-3 h-3 text-accent" />}
                    </div>
                    <p className="text-[10px] text-muted font-sans line-clamp-1">
                      {t.description}
                    </p>
                  </div>

                  {/* Visual Swatch */}
                  <div className="flex items-center gap-1 p-1 rounded border border-theme-subtle shrink-0" style={{ backgroundColor: t.previewBg }}>
                    <div className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: t.previewSurface, border: '1px solid rgba(0,0,0,0.1)' }} />
                    <div className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: t.previewAccent }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
