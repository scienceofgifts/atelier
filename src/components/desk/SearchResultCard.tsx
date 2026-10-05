import React from 'react';
import { SearchResultItem } from '../../utils/localSearch';
import { KnowledgeObject } from '../../types/knowledge';
import { ArrowRight, Film, BookOpen, HelpCircle, FlaskConical, FileText, Check, Video, Mic, MessageSquare } from 'lucide-react';

interface SearchResultCardProps {
  result: SearchResultItem;
  rawQuery: string;
  isSelected?: boolean;
  onToggleSelect?: (obj: KnowledgeObject) => void;
  onSelectObject: (obj: KnowledgeObject) => void;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  rawQuery,
  isSelected,
  onToggleSelect,
  onSelectObject,
}) => {
  const { object, snippets, matchReasons } = result;

  // Render text with highlighted matches
  const renderHighlightedExcerpt = () => {
    if (!snippets || snippets.length === 0) {
      return (
        <p className="text-xs text-muted font-serif italic">
          “{object.summary || object.content.slice(0, 160)}”
        </p>
      );
    }

    const snippet = snippets[0];
    const { before, matchedText, after } = snippet;

    return (
      <div className="p-3 bg-surface-subtle border border-theme-subtle rounded-md font-serif text-xs text-main leading-relaxed">
        <span>{before}</span>
        <mark className="bg-accent-subtle text-accent font-semibold px-1 py-0.5 rounded border border-theme-subtle">
          {matchedText}
        </mark>
        <span>{after}</span>
      </div>
    );
  };

  const medium = object.medium || object.sourceMedium;

  const renderIcon = () => {
    if (object.type === 'source') {
      if (medium === 'movie') return <Film className="w-3.5 h-3.5" />;
      if (medium === 'book') return <BookOpen className="w-3.5 h-3.5" />;
      if (medium === 'article') return <FileText className="w-3.5 h-3.5" />;
      if (medium === 'video') return <Video className="w-3.5 h-3.5" />;
      if (medium === 'podcast') return <Mic className="w-3.5 h-3.5" />;
      if (medium === 'conversation') return <MessageSquare className="w-3.5 h-3.5" />;
      return <BookOpen className="w-3.5 h-3.5" />;
    }
    if (object.type === 'question') return <HelpCircle className="w-3.5 h-3.5" />;
    if (object.type === 'experiment') return <FlaskConical className="w-3.5 h-3.5" />;
    if (object.type === 'idea') return <BookOpen className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
  };

  return (
    <div
      className={`p-5 rounded-xl border transition-all space-y-3 cursor-pointer group shadow-theme-card ${
        isSelected
          ? 'bg-surface-subtle border-theme-strong'
          : 'bg-surface hover:bg-surface-hover border-theme-subtle'
      }`}
    >
      {/* Top Header Line */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono text-muted">
          <span className="uppercase flex items-center gap-1 font-semibold text-main">
            {renderIcon()}
            <span>{object.type}</span>
          </span>
          {object.type === 'source' && medium && (
            <>
              <span>·</span>
              <span className="capitalize">{medium}</span>
            </>
          )}
          <span>·</span>
          {object.sourceTitle && (
            <>
              <span className="font-serif italic text-muted truncate max-w-[180px]">
                {object.sourceTitle}
              </span>
              <span>·</span>
            </>
          )}
          {object.provenance && (
            <span className="capitalize">{object.provenance}</span>
          )}
        </div>

        {/* Relevance Reason Badge & Select Checkbox */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-muted bg-surface-subtle border border-theme-subtle px-2 py-0.5 rounded">
            {matchReasons[0] || 'Matched'}
          </span>

          {onToggleSelect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(object);
              }}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-accent border-accent text-white'
                  : 'border-theme-subtle bg-surface hover:border-theme-strong'
              }`}
              title="Select for optional AI synthesis"
            >
              {isSelected && <Check className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div onClick={() => onSelectObject(object)}>
        <h3 className="font-serif text-xl text-main font-normal group-hover:text-muted transition-colors leading-snug">
          {object.title}
        </h3>
      </div>

      {/* Real Highlighted Snippet Excerpt */}
      <div onClick={() => onSelectObject(object)}>
        {renderHighlightedExcerpt()}
      </div>

      {/* Bottom Metadata & Footer */}
      <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-xs text-muted font-mono">
        <span className="truncate max-w-[280px]">{object.topics?.join(' · ')}</span>
        <button
          onClick={() => onSelectObject(object)}
          className="group-hover:translate-x-0.5 transition-transform text-main font-sans font-medium flex items-center gap-1 cursor-pointer"
        >
          <span>Inspect</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
