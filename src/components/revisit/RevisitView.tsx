import React, { useState } from 'react';
import { useKnowledge } from '../../context/KnowledgeContext';
import { KnowledgeObject } from '../../types/knowledge';
import { Shuffle, ArrowRight } from 'lucide-react';

interface RevisitViewProps {
  onSelectObject: (item: KnowledgeObject) => void;
}

export const RevisitView: React.FC<RevisitViewProps> = ({ onSelectObject }) => {
  const { items, recordRevisit } = useKnowledge();
  const [activeLens, setActiveLens] = useState<'dormant' | 'unresolved' | 'beliefs' | 'experiments'>('dormant');
  const [surpriseItem, setSurpriseItem] = useState<KnowledgeObject | null>(null);

  // 1. Dormant: items not visited or visited longest ago
  const dormantItems = [...items]
    .sort((a, b) => {
      const aDate = a.lastRevisitedAt ? new Date(a.lastRevisitedAt).getTime() : new Date(a.createdAt).getTime();
      const bDate = b.lastRevisitedAt ? new Date(b.lastRevisitedAt).getTime() : new Date(b.createdAt).getTime();
      return aDate - bDate;
    })
    .slice(0, 6);

  // 2. Unresolved questions
  const unresolvedQuestions = items.filter(
    i => i.type === 'question' && i.hypotheses?.some(h => h.status === 'untested' || h.status === 'testing')
  );

  // 3. High confidence beliefs (good for intellectual stress testing)
  const highConfidenceClaims = items.filter(
    i => (i.type === 'claim' || i.type === 'idea') && i.confidence === 'high'
  );

  // 4. Completed experiments
  const completedExperiments = items.filter(
    i => i.type === 'experiment' && i.experimentDetails?.status === 'completed'
  );

  const handleDrawSurprise = () => {
    if (items.length === 0) return;
    const randomIndex = Math.floor(Math.random() * items.length);
    const chosen = items[randomIndex];
    setSurpriseItem(chosen);
    recordRevisit(chosen.id);
  };

  const getLensItems = () => {
    switch (activeLens) {
      case 'dormant':
        return dormantItems;
      case 'unresolved':
        return unresolvedQuestions;
      case 'beliefs':
        return highConfidenceClaims;
      case 'experiments':
        return completedExperiments;
    }
  };

  const currentList = getLensItems();

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Masthead */}
      <div className="border-b border-theme-subtle pb-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted font-mono">
            Active Reflection
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-main font-normal tracking-tight mt-1">
            Revisit Studio
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl font-serif">
            Knowledge is only valuable if it resurfaces when you are ready to rethink it. This is intellectual exploration, not mechanical flashcards.
          </p>
        </div>

        <button
          onClick={handleDrawSurprise}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-main bg-surface-subtle border border-theme-subtle hover:bg-surface-hover rounded-lg shadow-theme-card transition-colors shrink-0 cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Surprise Me from Archive</span>
        </button>
      </div>

      {/* Surprise Card */}
      {surpriseItem && (
        <div className="p-6 bg-surface-subtle border border-theme-strong rounded-xl space-y-3 animate-in fade-in duration-200 shadow-theme-modal">
          <div className="flex items-center justify-between text-xs font-mono text-muted">
            <span className="uppercase flex items-center gap-1 text-main font-semibold">
              <Shuffle className="w-3.5 h-3.5" />
              <span>Serendipitous Resurfacing</span>
            </span>
            <button
              onClick={() => setSurpriseItem(null)}
              className="hover:text-main cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <h3 className="font-serif text-2xl text-main font-medium">
            {surpriseItem.title}
          </h3>

          <p className="font-serif text-sm text-main leading-relaxed italic">
            “{surpriseItem.summary || surpriseItem.content.slice(0, 200)}”
          </p>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs font-mono text-faint">
              {surpriseItem.type} · {surpriseItem.topics?.join(' / ')}
            </span>
            <button
              onClick={() => onSelectObject(surpriseItem)}
              className="text-xs font-medium text-main hover:text-muted flex items-center gap-1 cursor-pointer"
            >
              <span>Explore in Depth</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Curated Revisit Lenses */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-theme-subtle scrollbar-none">
        <button
          onClick={() => setActiveLens('dormant')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeLens === 'dormant'
              ? 'bg-surface-subtle text-main font-semibold border border-theme-strong'
              : 'text-muted hover:text-main hover:bg-surface-hover'
          }`}
        >
          Dormant Knowledge ({dormantItems.length})
        </button>

        <button
          onClick={() => setActiveLens('unresolved')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeLens === 'unresolved'
              ? 'bg-surface-subtle text-main font-semibold border border-theme-strong'
              : 'text-muted hover:text-main hover:bg-surface-hover'
          }`}
        >
          Unresolved Inquiries ({unresolvedQuestions.length})
        </button>

        <button
          onClick={() => setActiveLens('beliefs')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeLens === 'beliefs'
              ? 'bg-surface-subtle text-main font-semibold border border-theme-strong'
              : 'text-muted hover:text-main hover:bg-surface-hover'
          }`}
        >
          Claims to Stress-Test ({highConfidenceClaims.length})
        </button>

        <button
          onClick={() => setActiveLens('experiments')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeLens === 'experiments'
              ? 'bg-surface-subtle text-main font-semibold border border-theme-strong'
              : 'text-muted hover:text-main hover:bg-surface-hover'
          }`}
        >
          Tested Outcomes ({completedExperiments.length})
        </button>
      </div>

      {/* Lens List */}
      <div className="space-y-4">
        {currentList.map(item => (
          <div
            key={item.id}
            onClick={() => {
              recordRevisit(item.id);
              onSelectObject(item);
            }}
            className="p-5 bg-surface hover:bg-surface-hover border border-theme-subtle rounded-xl shadow-theme-card transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-baseline justify-between gap-3"
          >
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-mono text-muted">
                <span className="uppercase">{item.type}</span>
                {item.provenance && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{item.provenance}</span>
                  </>
                )}
                {item.revisitCount ? (
                  <>
                    <span>·</span>
                    <span>Revisited {item.revisitCount} times</span>
                  </>
                ) : (
                  <>
                    <span>·</span>
                    <span className="text-amber-600 dark:text-amber-400">Unrevisited</span>
                  </>
                )}
              </div>

              <h3 className="font-serif text-xl text-main font-medium group-hover:text-muted transition-colors leading-snug">
                {item.title}
              </h3>

              {item.summary && (
                <p className="text-xs text-muted line-clamp-2 font-serif">
                  {item.summary}
                </p>
              )}

              {item.currentUnderstanding && item.type === 'question' && (
                <p className="text-xs text-muted italic border-l border-theme-strong pl-2">
                  “{item.currentUnderstanding}”
                </p>
              )}
            </div>

            <div className="text-xs font-mono text-muted flex sm:flex-col sm:items-end justify-between shrink-0 gap-1">
              <span>{item.topics?.join(' · ')}</span>
              <span className="group-hover:translate-x-0.5 transition-transform text-main font-medium flex items-center gap-1">
                Re-examine <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}

        {currentList.length === 0 && (
          <div className="p-8 text-center text-sm text-muted font-serif italic border border-dashed border-theme-subtle rounded-lg bg-surface-subtle">
            No items in this lens right now.
          </div>
        )}
      </div>
    </div>
  );
};
