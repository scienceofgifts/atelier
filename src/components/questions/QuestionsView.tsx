import React, { useState } from 'react';
import { useKnowledge } from '../../context/KnowledgeContext';
import { KnowledgeObject } from '../../types/knowledge';
import { Plus, ArrowRight } from 'lucide-react';

interface QuestionsViewProps {
  onSelectObject: (item: KnowledgeObject) => void;
}

export const QuestionsView: React.FC<QuestionsViewProps> = ({ onSelectObject }) => {
  const { items, addObject } = useKnowledge();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUnderstanding, setNewUnderstanding] = useState('');
  const [newTopic, setNewTopic] = useState('');

  const questions = items.filter(i => i.type === 'question');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = addObject({
      title: newTitle.trim(),
      type: 'question',
      currentUnderstanding: newUnderstanding.trim(),
      topics: newTopic ? [newTopic.trim()] : ['Inquiry'],
      hypotheses: [],
      content: newUnderstanding.trim(),
    });

    setIsCreating(false);
    setNewTitle('');
    setNewUnderstanding('');
    setNewTopic('');
    onSelectObject(created);
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Masthead */}
      <div className="border-b border-theme-subtle pb-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted font-mono">
            Empirical Inquiry
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-main font-normal tracking-tight mt-1">
            Open Questions
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl font-serif">
            A question is not an unanswered exam; it is a workspace for testing hypotheses, recording trials, and gradually refining what you believe.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-lg shadow-theme-card transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Formulate Question</span>
        </button>
      </div>

      {/* Creation Drawer/Box */}
      {isCreating && (
        <form onSubmit={handleCreate} className="p-6 bg-surface-subtle border border-theme-subtle rounded-xl space-y-4 animate-in fade-in duration-150 shadow-theme-card">
          <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
            <h3 className="font-serif text-lg text-main font-medium">New Open Question</h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-muted hover:text-main"
            >
              Cancel
            </button>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
              Question Title
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. How do I maintain creative flow without burn-out?"
              className="w-full px-3 py-2 text-base font-serif bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
              Current Understanding (What do you currently suspect?)
            </label>
            <textarea
              value={newUnderstanding}
              onChange={e => setNewUnderstanding(e.target.value)}
              placeholder="Provisional statement of current beliefs..."
              className="w-full h-24 px-3 py-2 text-sm font-serif bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
              Primary Topic
            </label>
            <input
              type="text"
              value={newTopic}
              onChange={e => setNewTopic(e.target.value)}
              placeholder="e.g. Creative Flow, Decision Friction, Health"
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
              Create Workspace
            </button>
          </div>
        </form>
      )}

      {/* Questions Grid */}
      <div className="space-y-4">
        {questions.map(q => {
          const hypCount = q.hypotheses?.length || 0;
          const supportedCount = q.hypotheses?.filter(h => h.status === 'supported').length || 0;
          const testingCount = q.hypotheses?.filter(h => h.status === 'testing' || h.status === 'promising').length || 0;

          return (
            <div
              key={q.id}
              onClick={() => onSelectObject(q)}
              className="p-6 bg-surface hover:bg-surface-hover border border-theme-subtle rounded-xl shadow-theme-card transition-all cursor-pointer group space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted">
                    <span className="uppercase">Inquiry</span>
                    <span>·</span>
                    <span>{hypCount} Hypotheses ({supportedCount} supported, {testingCount} in testing)</span>
                  </div>
                  <h2 className="font-serif text-2xl text-main font-medium group-hover:text-muted transition-colors">
                    {q.title}
                  </h2>
                </div>
                <span className="text-xs font-mono text-main font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0">
                  Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {q.currentUnderstanding && (
                <div className="p-4 bg-surface-subtle border-l-2 border-theme-strong rounded-r-md">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-muted font-semibold mb-1">
                    Current Understanding
                  </div>
                  <p className="font-serif text-sm text-main leading-relaxed italic">
                    “{q.currentUnderstanding}”
                  </p>
                </div>
              )}

              {/* Hypotheses Overview */}
              {q.hypotheses && q.hypotheses.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-mono uppercase tracking-wider text-muted">
                    Active Hypotheses
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.hypotheses.slice(0, 4).map(h => (
                      <div
                        key={h.id}
                        className="p-2.5 bg-surface-subtle border border-theme-subtle rounded-md text-xs space-y-1"
                      >
                        <div className="font-serif text-main leading-snug">
                          {h.statement}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-0.5">
                          <span className="capitalize font-medium text-main">{h.status}</span>
                          <span className="capitalize">Conf: {h.confidence}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-xs text-muted font-mono">
                <span>Topics: {q.topics?.join(' · ')}</span>
                <span>Last updated {new Date(q.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
