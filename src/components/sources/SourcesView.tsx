import React, { useState } from 'react';
import { useKnowledge } from '../../context/KnowledgeContext';
import { KnowledgeObject, SourceMedium } from '../../types/knowledge';
import { Plus, Film, BookOpen, FileText, Video, Mic, MessageSquare, ArrowRight } from 'lucide-react';

interface SourcesViewProps {
  onSelectObject: (item: KnowledgeObject) => void;
}

export const SourcesView: React.FC<SourcesViewProps> = ({ onSelectObject }) => {
  const { items, addObject } = useKnowledge();
  const [selectedMedium, setSelectedMedium] = useState<SourceMedium | 'all'>('all');
  const [isCreating, setIsCreating] = useState(false);

  // New source form state
  const [newTitle, setNewTitle] = useState('');
  const [newMedium, setNewMedium] = useState<SourceMedium>('book');
  const [newCreator, setNewCreator] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newTopics, setNewTopics] = useState('');

  const sources = items.filter(i => i.type === 'source');
  const filteredSources = selectedMedium === 'all'
    ? sources
    : sources.filter(s => s.medium === selectedMedium || s.sourceMedium === selectedMedium);

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = addObject({
      title: newTitle.trim(),
      type: 'source',
      medium: newMedium,
      sourceMedium: newMedium,
      creator: newCreator.trim(),
      year: newYear.trim(),
      summary: newSummary.trim(),
      content: newSummary.trim(),
      topics: newTopics ? newTopics.split(',').map(t => t.trim()) : ['General'],
      extractedItems: { noticed: [], ideas: [], questions: [], quotes: [] },
    });

    setIsCreating(false);
    setNewTitle('');
    setNewCreator('');
    setNewYear('');
    setNewSummary('');
    setNewTopics('');
    onSelectObject(created);
  };

  const mediumIcons: Record<string, React.ReactNode> = {
    movie: <Film className="w-4 h-4" />,
    book: <BookOpen className="w-4 h-4" />,
    article: <FileText className="w-4 h-4" />,
    video: <Video className="w-4 h-4" />,
    podcast: <Mic className="w-4 h-4" />,
    conversation: <MessageSquare className="w-4 h-4" />,
    experience: <FileText className="w-4 h-4" />,
    other: <FileText className="w-4 h-4" />,
  };

  const mediums: { id: SourceMedium | 'all'; label: string }[] = [
    { id: 'all', label: 'All Sources' },
    { id: 'movie', label: 'Movies' },
    { id: 'book', label: 'Books' },
    { id: 'article', label: 'Articles' },
    { id: 'video', label: 'Videos' },
    { id: 'podcast', label: 'Podcasts' },
    { id: 'conversation', label: 'Conversations' },
  ];

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Masthead */}
      <div className="border-b border-theme-subtle pb-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted font-mono">
            Origin & Provenance
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-main font-normal tracking-tight mt-1">
            Sources
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl font-serif">
            Knowledge retains its origins. Ideas, observations, and questions extracted from books, films, and dialogues live here, connected directly to your topics.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-lg shadow-theme-card transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Source</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-theme-subtle scrollbar-none">
        {mediums.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedMedium(m.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              selectedMedium === m.id
                ? 'bg-surface-subtle text-main font-semibold border border-theme-strong'
                : 'text-muted hover:text-main hover:bg-surface-hover'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Creation Modal / Form */}
      {isCreating && (
        <form onSubmit={handleCreateSource} className="p-6 bg-surface-subtle border border-theme-subtle rounded-xl space-y-4 animate-in fade-in duration-150 shadow-theme-card">
          <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
            <h3 className="font-serif text-lg text-main font-medium">Catalog New Source</h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-muted hover:text-main"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                Title of Work
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. The Girl with the Dragon Tattoo, Deep Work"
                className="w-full px-3 py-2 text-sm bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden font-serif"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                Medium
              </label>
              <select
                value={newMedium}
                onChange={e => setNewMedium(e.target.value as SourceMedium)}
                className="w-full px-3 py-2 text-sm bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden capitalize"
              >
                <option value="book">Book</option>
                <option value="movie">Movie / Film</option>
                <option value="article">Article / Essay</option>
                <option value="video">Video</option>
                <option value="podcast">Podcast</option>
                <option value="conversation">Conversation</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                Author / Director / Creator
              </label>
              <input
                type="text"
                value={newCreator}
                onChange={e => setNewCreator(e.target.value)}
                placeholder="e.g. David Fincher, Daniel Kahneman"
                className="w-full px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                Year / Release
              </label>
              <input
                type="text"
                value={newYear}
                onChange={e => setNewYear(e.target.value)}
                placeholder="e.g. 2011"
                className="w-full px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
              Personal Notes & Core Takeaways
            </label>
            <textarea
              value={newSummary}
              onChange={e => setNewSummary(e.target.value)}
              placeholder="Initial impressions, reflections, and key ideas..."
              className="w-full h-24 px-3 py-2 text-sm bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden font-serif"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
              Associated Topics (comma separated)
            </label>
            <input
              type="text"
              value={newTopics}
              onChange={e => setNewTopics(e.target.value)}
              placeholder="e.g. Human Behavior, Power Dynamics, Social Dynamics"
              className="w-full px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-muted hover:text-main"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-md shadow-theme-card disabled:opacity-40"
            >
              Save Source
            </button>
          </div>
        </form>
      )}

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredSources.map(src => {
          const medium = src.medium || src.sourceMedium || 'source';
          const extracts = src.extractedItems || { noticed: [], ideas: [], questions: [], quotes: [] };
          const totalExtracts = 
            (extracts.noticed?.length || 0) + 
            (extracts.ideas?.length || 0) + 
            (extracts.questions?.length || 0) + 
            (extracts.quotes?.length || 0);

          return (
            <div
              key={src.id}
              onClick={() => onSelectObject(src)}
              className="p-6 bg-surface hover:bg-surface-hover border border-theme-subtle rounded-xl shadow-theme-card transition-all cursor-pointer group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-muted">
                  <span className="capitalize flex items-center gap-1 text-main font-medium">
                    {mediumIcons[medium] || <FileText className="w-3.5 h-3.5" />}
                    <span>{medium}</span>
                  </span>
                  {src.creator && (
                    <>
                      <span>·</span>
                      <span>{src.creator}</span>
                    </>
                  )}
                  {src.year && (
                    <>
                      <span>·</span>
                      <span>{src.year}</span>
                    </>
                  )}
                </div>

                <h3 className="font-serif text-2xl text-main font-medium group-hover:text-muted transition-colors leading-snug">
                  {src.title}
                </h3>

                {src.summary && (
                  <p className="text-xs text-muted line-clamp-2 font-serif leading-relaxed">
                    {src.summary}
                  </p>
                )}
              </div>

              {/* Extracted Stats Preview */}
              <div className="pt-3 border-t border-theme-subtle space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted">
                  {extracts.noticed?.length ? <span>{extracts.noticed.length} noticed</span> : null}
                  {extracts.ideas?.length ? <span>{extracts.ideas.length} ideas</span> : null}
                  {extracts.questions?.length ? <span>{extracts.questions.length} questions</span> : null}
                  {extracts.quotes?.length ? <span>{extracts.quotes.length} quotes</span> : null}
                  {!totalExtracts && <span>0 extracted items</span>}
                </div>

                <div className="flex items-center justify-between text-xs text-muted font-mono pt-1">
                  <span className="truncate max-w-[200px]">{src.topics?.join(' · ')}</span>
                  <span className="text-main font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Open notebook <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
