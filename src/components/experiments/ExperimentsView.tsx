import React, { useState } from 'react';
import { useKnowledge } from '../../context/KnowledgeContext';
import { KnowledgeObject } from '../../types/knowledge';
import { Plus, FlaskConical, ArrowRight } from 'lucide-react';

interface ExperimentsViewProps {
  onSelectObject: (item: KnowledgeObject) => void;
}

export const ExperimentsView: React.FC<ExperimentsViewProps> = ({ onSelectObject }) => {
  const { items, addObject } = useKnowledge();
  const [isCreating, setIsCreating] = useState(false);

  // New Experiment form state
  const [title, setTitle] = useState('');
  const [protocol, setProtocol] = useState('');
  const [durationDays, setDurationDays] = useState<number>(14);
  const [topics, setTopics] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState('');

  const experiments = items.filter(i => i.type === 'experiment');
  const questions = items.filter(i => i.type === 'question');

  const handleCreateExperiment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !protocol.trim()) return;

    const created = addObject({
      title: title.trim(),
      type: 'experiment',
      summary: protocol.trim(),
      content: `### Experiment Protocol\n${protocol.trim()}\n\nDuration planned: ${durationDays} days.`,
      topics: topics ? topics.split(',').map(t => t.trim()) : ['Empirical Testing'],
      provenance: 'tested',
      confidence: 'provisional',
      relatedQuestionId: selectedQuestionId || undefined,
      experimentDetails: {
        protocol: protocol.trim(),
        durationDays,
        result: '',
        observation: '',
        status: 'active',
      },
    });

    setIsCreating(false);
    setTitle('');
    setProtocol('');
    setTopics('');
    setSelectedQuestionId('');
    onSelectObject(created);
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Masthead */}
      <div className="border-b border-theme-subtle pb-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted font-mono">
            Empirical Validation
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-main font-normal tracking-tight mt-1">
            Experiments Lab
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl font-serif">
            Beliefs remain unverified until tested against reality. Design simple behavioral protocols, observe resistance, and update hypotheses.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-lg shadow-theme-card transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Plan Experiment</span>
        </button>
      </div>

      {/* Creation Drawer */}
      {isCreating && (
        <form onSubmit={handleCreateExperiment} className="p-6 bg-surface-subtle border border-theme-subtle rounded-xl space-y-4 animate-in fade-in duration-150 shadow-theme-card">
          <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
            <h3 className="font-serif text-lg text-main font-medium">Design New Experiment</h3>
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
              Experiment Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. 20-minute daily routine for 14 days"
              className="w-full px-3 py-2 text-sm bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden font-serif"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
              Protocol Specification (What exact rules will you follow?)
            </label>
            <textarea
              value={protocol}
              onChange={e => setProtocol(e.target.value)}
              placeholder="e.g. Daily predetermined kettlebell circuit at 07:30. Fixed timer of 20:00."
              className="w-full h-24 px-3 py-2 text-sm bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden font-serif"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                Duration (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={durationDays}
                onChange={e => setDurationDays(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                Link to Open Question (Optional)
              </label>
              <select
                value={selectedQuestionId}
                onChange={e => setSelectedQuestionId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded-md focus:outline-hidden"
              >
                <option value="">None / Standalone</option>
                {questions.map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
              Topics (comma separated)
            </label>
            <input
              type="text"
              value={topics}
              onChange={e => setTopics(e.target.value)}
              placeholder="e.g. Physical Practice, Decision Friction"
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
              disabled={!title.trim() || !protocol.trim()}
              className="px-4 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 rounded-md shadow-theme-card disabled:opacity-40"
            >
              Initiate Experiment
            </button>
          </div>
        </form>
      )}

      {/* Experiments List */}
      <div className="space-y-5">
        {experiments.map(exp => {
          const details = exp.experimentDetails;
          const isCompleted = details?.status === 'completed';

          return (
            <div
              key={exp.id}
              onClick={() => onSelectObject(exp)}
              className="p-6 bg-surface hover:bg-surface-hover border border-theme-subtle rounded-xl shadow-theme-card transition-all cursor-pointer group space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted">
                    <span className="uppercase flex items-center gap-1 font-semibold text-main">
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>Experiment</span>
                    </span>
                    <span>·</span>
                    <span className={`capitalize font-medium ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {details?.status || 'active'}
                    </span>
                    {details?.durationDays && (
                      <>
                        <span>·</span>
                        <span>{details.durationDays} days</span>
                      </>
                    )}
                  </div>

                  <h3 className="font-serif text-2xl text-main font-medium group-hover:text-muted transition-colors">
                    {exp.title}
                  </h3>
                </div>

                <span className="text-xs font-mono text-main font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0">
                  Inspect results <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Protocol snippet */}
              {details?.protocol && (
                <div className="p-3.5 bg-surface-subtle rounded-md text-xs text-main space-y-1">
                  <span className="font-mono uppercase tracking-wider text-muted font-semibold text-[10px]">
                    Protocol:
                  </span>
                  <p className="font-serif">{details.protocol}</p>
                </div>
              )}

              {/* Results & Observations */}
              {(details?.result || details?.observation) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {details.result && (
                    <div className="p-3 bg-surface-subtle border border-theme-subtle rounded-md text-xs space-y-1">
                      <span className="font-mono uppercase tracking-wider text-muted text-[10px]">
                        Empirical Outcome:
                      </span>
                      <p className="text-main font-medium">{details.result}</p>
                    </div>
                  )}

                  {details.observation && (
                    <div className="p-3 bg-surface-subtle border border-theme-subtle rounded-md text-xs space-y-1">
                      <span className="font-mono uppercase tracking-wider text-muted text-[10px]">
                        Observation:
                      </span>
                      <p className="text-main italic font-serif">“{details.observation}”</p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-xs text-muted font-mono">
                <span>Topics: {exp.topics?.join(' · ')}</span>
                {details?.completedDate && <span>Completed {details.completedDate}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
