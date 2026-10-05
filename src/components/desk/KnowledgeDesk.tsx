import React, { useState } from 'react';
import { useKnowledge } from '../../context/KnowledgeContext';
import { KnowledgeObject, ActiveView } from '../../types/knowledge';
import { SearchResultCard } from './SearchResultCard';
import { 
  Search, 
  ArrowRight, 
  Check, 
  X, 
  Plus, 
  RotateCcw
} from 'lucide-react';
import { AiIndicator } from '../common/AiIndicator';

interface KnowledgeDeskProps {
  onSelectObject: (item: KnowledgeObject) => void;
  onNavigateView: (view: ActiveView) => void;
}

export const KnowledgeDesk: React.FC<KnowledgeDeskProps> = ({ onSelectObject, onNavigateView }) => {
  const { 
    items, 
    patterns, 
    acceptPattern, 
    dismissPattern, 
    setIsCaptureOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedType,
    setSelectedType,
    selectedTopic,
    setSelectedTopic,
    allTopics,
    synthesizeSelectedItems,
    isSynthesizing,
    detectConnections,
    isDetectingConnections
  } = useKnowledge();

  const [selectedForSynthesis, setSelectedForSynthesis] = useState<KnowledgeObject[]>([]);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const handleToggleSelectForSynthesis = (obj: KnowledgeObject) => {
    if (selectedForSynthesis.some(s => s.id === obj.id)) {
      setSelectedForSynthesis(selectedForSynthesis.filter(s => s.id !== obj.id));
    } else {
      setSelectedForSynthesis([...selectedForSynthesis, obj]);
    }
  };

  const handleTriggerSynthesis = () => {
    const targets = selectedForSynthesis.length > 0 ? selectedForSynthesis : searchResults.map(r => r.object);
    synthesizeSelectedItems(searchQuery, targets);
  };

  const openQuestions = items.filter(i => i.type === 'question');
  const recentItems = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const activePatterns = patterns.filter(p => !p.dismissed);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      {/* Desk Masthead / Date */}
      <div className="pt-2 border-b border-theme-subtle pb-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted font-mono">
            {todayFormatted}
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-main font-normal tracking-tight mt-1">
            Knowledge Desk
          </h1>
        </div>
        <div className="text-xs text-muted font-mono flex items-center gap-3">
          <span>{items.length} objects indexed locally</span>
          <span>·</span>
          <span>Deterministic search</span>
        </div>
      </div>

      {/* Prominent Search / Query Field */}
      <section>
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setSelectedForSynthesis([]); // reset selections on new query
            }}
            placeholder="Search your local knowledge... (e.g. 'women', 'decision friction', 'workout')"
            className="w-full pl-12 pr-10 py-4 bg-surface hover:bg-surface-subtle focus:bg-surface text-main placeholder:text-faint font-serif text-lg sm:text-xl rounded-xl border border-theme-subtle focus:border-theme-strong focus:outline-hidden shadow-theme-card transition-all"
            autoFocus
          />
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-faint hover:text-main transition-colors cursor-pointer p-0.5"
            title="Focus search input"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          {isSearchActive && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedForSynthesis([]);
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-main rounded-full cursor-pointer"
              title="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SEARCH MODE (ACTIVE WHEN QUERY IS TYPED) */}
      {/* ========================================================================= */}
      {isSearchActive ? (
        <section className="space-y-6 animate-in fade-in duration-150">
          {/* Search Header Bar with Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-subtle pb-3">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl text-main font-medium">
                Local Search Results
              </span>
              <span className="text-xs font-mono text-muted bg-surface-subtle border border-theme-subtle px-2 py-0.5 rounded">
                {searchResults.length} matches found
              </span>
            </div>

            {/* Optional AI Synthesis Trigger over selected or all search results */}
            {searchResults.length > 0 && (
              <button
                onClick={handleTriggerSynthesis}
                disabled={isSynthesizing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 disabled:opacity-50 rounded-lg shadow-theme-card transition-colors shrink-0 cursor-pointer"
              >
                <span>
                  {isSynthesizing
                    ? 'Synthesizing...'
                    : selectedForSynthesis.length > 0
                    ? `Synthesize ${selectedForSynthesis.length} Selected Objects`
                    : 'Synthesize Results'}
                </span>
                <AiIndicator />
              </button>
            )}
          </div>

          {/* Quiet Filter Tabs (All, Notes, Sources, Questions, Experiments, Ideas, Observations) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-theme-subtle scrollbar-none text-xs">
            {(['all', 'question', 'observation', 'idea', 'source', 'experiment', 'claim', 'note'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-md transition-colors capitalize whitespace-nowrap cursor-pointer ${
                  selectedType === t
                    ? 'bg-surface-subtle text-main font-semibold border border-theme-strong'
                    : 'text-muted hover:text-main hover:bg-surface-hover'
                }`}
              >
                {t === 'all' ? 'All Types' : t + 's'}
              </button>
            ))}

            <span className="text-faint">|</span>

            <select
              value={selectedTopic || ''}
              onChange={e => setSelectedTopic(e.target.value || null)}
              className="px-2 py-1 text-xs bg-surface border border-theme-subtle rounded text-main focus:outline-hidden"
            >
              <option value="">All Topics</option>
              {allTopics.map(top => (
                <option key={top.name} value={top.name}>{top.name}</option>
              ))}
            </select>
          </div>

          {/* Search Result Cards List */}
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map(result => {
                const isSelected = selectedForSynthesis.some(s => s.id === result.object.id);
                return (
                  <SearchResultCard
                    key={result.object.id}
                    result={result}
                    rawQuery={searchQuery}
                    isSelected={isSelected}
                    onToggleSelect={handleToggleSelectForSynthesis}
                    onSelectObject={onSelectObject}
                  />
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center space-y-2 border border-dashed border-theme-subtle rounded-xl bg-surface-subtle">
              <p className="font-serif text-lg text-main font-medium">
                No matching knowledge found.
              </p>
              <p className="text-xs text-muted font-serif">
                Try searching for alternate keywords, topics, or terms from your notes.
              </p>
            </div>
          )}
        </section>
      ) : (
        /* ========================================================================= */
        /* DEFAULT DISCOVERY MODE (ACTIVE WHEN SEARCH QUERY IS EMPTY) */
        /* ========================================================================= */
        <>
          {/* Section 1: Open Questions */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
              <div>
                <h2 className="font-serif text-2xl text-main">Open Questions</h2>
                <p className="text-xs text-muted">Living inquiries currently being tested and refined</p>
              </div>
              <button
                onClick={() => onNavigateView('questions')}
                className="text-xs text-muted hover:text-main flex items-center gap-1 cursor-pointer"
              >
                <span>View all questions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openQuestions.slice(0, 4).map(q => (
                <div
                  key={q.id}
                  onClick={() => onSelectObject(q)}
                  className="p-5 bg-surface hover:bg-surface-hover border border-theme-subtle rounded-xl shadow-theme-card transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-muted mb-1.5">
                      <span className="uppercase">Question</span>
                      <span>{q.hypotheses?.length || 0} hypotheses</span>
                    </div>
                    <h3 className="font-serif text-lg text-main font-medium group-hover:text-muted leading-snug">
                      {q.title}
                    </h3>
                    {q.currentUnderstanding && (
                      <p className="text-xs text-muted line-clamp-2 mt-2 font-serif italic">
                        “{q.currentUnderstanding}”
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-xs text-muted">
                    <span className="truncate max-w-[200px]">{q.topics?.join(' · ')}</span>
                    <span className="font-mono text-[11px] group-hover:translate-x-0.5 transition-transform text-main font-medium flex items-center gap-1">
                      Inspect workspace <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Emerging Connections */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
              <div>
                <h2 className="font-serif text-2xl text-main flex items-center gap-2">
                  <span>Emerging Connections</span>
                </h2>
                <p className="text-xs text-muted">Cross-domain relationships detected across your archive</p>
              </div>
              <button
                onClick={detectConnections}
                disabled={isDetectingConnections}
                className="text-xs font-medium text-main hover:bg-surface-hover flex items-center gap-1.5 px-2.5 py-1 bg-surface-subtle border border-theme-subtle rounded cursor-pointer"
              >
                <span>{isDetectingConnections ? 'Scanning archive...' : 'Find New Connections'}</span>
                <AiIndicator />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {activePatterns.map(pat => (
                <div
                  key={pat.id}
                  className={`p-5 rounded-xl border transition-all shadow-theme-card ${
                    pat.accepted 
                      ? 'bg-surface-subtle border-theme-strong' 
                      : 'bg-surface border-theme-subtle'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2 text-xs font-mono text-muted">
                        <span className="uppercase">Pattern Discovery</span>
                        <span>·</span>
                        <span>Confidence: <strong className="capitalize font-sans font-medium text-main">{pat.confidence}</strong></span>
                      </div>
                      <h3 className="font-serif text-lg text-main font-medium">
                        {pat.title}
                      </h3>
                      <p className="text-sm text-main leading-relaxed font-serif">
                        {pat.observation}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      {!pat.accepted ? (
                        <>
                          <button
                            onClick={() => acceptPattern(pat.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-main bg-surface-subtle hover:bg-surface-hover border border-theme-subtle rounded transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Insight</span>
                          </button>
                          <button
                            onClick={() => dismissPattern(pat.id)}
                            className="p-1.5 text-faint hover:text-main hover:bg-surface-hover rounded transition-colors"
                            title="Dismiss pattern"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Saved to archive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Recently Captured */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
              <div>
                <h2 className="font-serif text-2xl text-main">Recently Captured</h2>
                <p className="text-xs text-muted font-sans">Recent thoughts, observations, and extracted fragments</p>
              </div>
              <button
                onClick={() => setIsCaptureOpen(true)}
                className="text-xs font-medium text-main hover:text-muted flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Capture</span>
              </button>
            </div>

            <div className="divide-y divide-theme-subtle border-t border-b border-theme-subtle">
              {recentItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelectObject(item)}
                  className="py-3.5 px-2 hover:bg-surface-hover rounded-md transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted">
                      <span className="uppercase">{item.type}</span>
                      {item.sourceTitle && (
                        <>
                          <span>·</span>
                          <span className="font-serif italic truncate max-w-[200px]">{item.sourceTitle}</span>
                        </>
                      )}
                      {item.provenance && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{item.provenance}</span>
                        </>
                      )}
                    </div>
                    <h4 className="font-serif text-base text-main group-hover:text-muted">
                      {item.title}
                    </h4>
                    {item.content && (
                      <p className="text-xs text-muted line-clamp-1 font-serif">
                        {item.content}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-faint font-mono shrink-0">
                    {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Revisit Serendipity Ribbon */}
          <section className="p-6 bg-surface border border-theme-subtle rounded-xl shadow-theme-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono uppercase tracking-widest text-muted font-semibold flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Intellectual Serendipity</span>
              </div>
              <p className="font-serif text-base text-main">
                Revisit knowledge that hasn’t been examined in 30 days or review untested hypotheses.
              </p>
            </div>
            <button
              onClick={() => onNavigateView('revisit')}
              className="px-4 py-2 text-xs font-medium text-main bg-surface-subtle hover:bg-surface-hover border border-theme-subtle rounded-lg shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
            >
              Enter Revisit Studio
            </button>
          </section>
        </>
      )}
    </div>
  );
};
