import React, { useState, useMemo } from 'react';
import { useKnowledge } from '../../context/KnowledgeContext';
import { KnowledgeObject, ObjectType } from '../../types/knowledge';
import { Search, Plus, ArrowRight } from 'lucide-react';

interface KnowledgeLibraryProps {
  onSelectObject: (item: KnowledgeObject) => void;
}

export const KnowledgeLibrary: React.FC<KnowledgeLibraryProps> = ({ onSelectObject }) => {
  const { 
    items, 
    allTopics, 
    setIsCaptureOpen, 
    selectedType, 
    setSelectedType, 
    selectedTopic, 
    setSelectedTopic 
  } = useKnowledge();

  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'confidence'>('updated');
  const librarySearchRef = React.useRef<HTMLInputElement>(null);

  const types: { id: ObjectType | 'all'; label: string }[] = [
    { id: 'all', label: 'All Knowledge' },
    { id: 'question', label: 'Questions' },
    { id: 'observation', label: 'Observations' },
    { id: 'idea', label: 'Ideas' },
    { id: 'source', label: 'Sources' },
    { id: 'experiment', label: 'Experiments' },
    { id: 'claim', label: 'Claims' },
    { id: 'note', label: 'Notes' },
    { id: 'quote', label: 'Quotes' },
  ];

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Type filter
    if (selectedType !== 'all') {
      result = result.filter(i => i.type === selectedType);
    }

    // Topic filter
    if (selectedTopic) {
      result = result.filter(i => i.topics?.includes(selectedTopic));
    }

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      result = result.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          i.content?.toLowerCase().includes(q) ||
          i.summary?.toLowerCase().includes(q) ||
          i.topics?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'confidence') {
        const confWeight: Record<string, number> = { high: 3, moderate: 2, provisional: 1, low: 0 };
        return (confWeight[b.confidence || 'low'] || 0) - (confWeight[a.confidence || 'low'] || 0);
      }
      return 0;
    });

    return result;
  }, [items, selectedType, selectedTopic, searchFilter, sortBy]);

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Masthead */}
      <div className="border-b border-theme-subtle pb-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted font-mono">
            Personal Archive
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-main font-normal tracking-tight mt-1">
            Knowledge Catalog
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl font-serif">
            Every observation, question, idea, experiment, and source stored with its context and relational links.
          </p>
        </div>

        <button
          onClick={() => setIsCaptureOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-lg shadow-theme-card transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1">
            <input
              ref={librarySearchRef}
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Filter by title, keywords, or observations..."
              className="w-full pl-9 pr-4 py-2 bg-surface text-sm text-main placeholder:text-faint rounded-lg border border-theme-subtle focus:border-theme-strong focus:outline-hidden"
            />
            <button
              type="button"
              onClick={() => librarySearchRef.current?.focus()}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-faint hover:text-main transition-colors cursor-pointer p-0.5"
              title="Focus filter input"
              aria-label="Filter"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Topic Select */}
          <div className="flex items-center gap-2">
            <select
              value={selectedTopic || ''}
              onChange={e => setSelectedTopic(e.target.value || null)}
              className="px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-lg text-main focus:outline-hidden"
            >
              <option value="">All Topics</option>
              {allTopics.map(t => (
                <option key={t.name} value={t.name}>{t.name} ({t.count})</option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-lg text-main focus:outline-hidden"
            >
              <option value="updated">Recently Updated</option>
              <option value="created">Recently Added</option>
              <option value="confidence">Highest Confidence</option>
            </select>
          </div>
        </div>

        {/* Type Segmented Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-theme-subtle">
          {types.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                selectedType === t.id
                  ? 'bg-surface-subtle text-main font-semibold border border-theme-strong'
                  : 'text-muted hover:text-main hover:bg-surface-hover'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtered Count */}
      <div className="flex items-center justify-between text-xs font-mono text-muted">
        <span>Showing {filteredItems.length} objects</span>
        {selectedTopic && (
          <button
            onClick={() => setSelectedTopic(null)}
            className="hover:underline text-main cursor-pointer"
          >
            Clear topic filter: {selectedTopic} ×
          </button>
        )}
      </div>

      {/* Item List */}
      <div className="divide-y divide-theme-subtle border-t border-b border-theme-subtle">
        {filteredItems.map(item => (
          <div
            key={item.id}
            onClick={() => onSelectObject(item)}
            className="py-4 px-2 hover:bg-surface-hover rounded-md transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-baseline justify-between gap-3"
          >
            <div className="space-y-1.5 max-w-3xl">
              {/* Unboxed Metadata Line */}
              <div className="flex items-center gap-2 text-xs font-mono text-muted">
                <span className="uppercase font-semibold text-main">{item.type}</span>
                {(item.medium || item.sourceMedium) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize text-main font-sans">{item.medium || item.sourceMedium}</span>
                  </>
                )}
                {item.sourceTitle && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-serif italic text-muted truncate max-w-[200px]">{item.sourceTitle}</span>
                  </>
                )}
                {item.creator && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{item.creator}</span>
                  </>
                )}
                {item.provenance && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{item.provenance}</span>
                  </>
                )}
                {item.confidence && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Conf: <strong className="font-sans font-medium text-main capitalize">{item.confidence}</strong></span>
                  </>
                )}
              </div>

              <h3 className="font-serif text-xl text-main font-normal group-hover:text-muted transition-colors leading-snug">
                {item.title}
              </h3>

              {item.summary && (
                <p className="text-xs text-muted line-clamp-2 font-serif leading-relaxed">
                  {item.summary}
                </p>
              )}

              {item.currentUnderstanding && item.type === 'question' && (
                <p className="text-xs text-muted italic border-l border-theme-strong pl-2">
                  “{item.currentUnderstanding}”
                </p>
              )}

              {/* Topics */}
              {item.topics && item.topics.length > 0 && (
                <div className="text-[11px] font-mono text-faint pt-0.5">
                  {item.topics.join(' / ')}
                </div>
              )}
            </div>

            <div className="text-xs font-mono text-faint shrink-0 flex sm:flex-col sm:items-end justify-between gap-1">
              <span>{new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="group-hover:translate-x-0.5 transition-transform text-main font-medium flex items-center gap-1 font-sans">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="p-12 text-center text-sm text-muted font-serif italic">
            No knowledge objects found matching current filters.
          </div>
        )}
      </div>
    </div>
  );
};
