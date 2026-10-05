import React from 'react';
import { Sparkles } from 'lucide-react';

interface AiIndicatorProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

/**
 * Reusable AI Indicator icon following Atelier visual language.
 * Displays a small four-point sparkle icon with a subtle 'AI-assisted' tooltip on hover/focus/touch.
 * Adapts automatically to active Atelier themes using theme design tokens.
 */
export const AiIndicator: React.FC<AiIndicatorProps> = ({ className = '', size = 'sm' }) => {
  const sizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  }[size];

  return (
    <span
      className="inline-flex items-center justify-center text-accent opacity-90 transition-opacity relative group/ai cursor-help select-none shrink-0 ml-1"
      title="AI-assisted"
      aria-label="AI-assisted"
    >
      <Sparkles className={`${sizeClasses} ${className}`} />
      {/* Subtle Tooltip */}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/ai:block group-focus/ai:block group-active/ai:block px-2 py-0.5 text-[10px] font-sans font-medium text-main bg-surface border border-theme-subtle rounded shadow-theme-card whitespace-nowrap z-50 animate-in fade-in duration-100">
        AI-assisted
      </span>
    </span>
  );
};
