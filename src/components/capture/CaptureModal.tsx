import React, { useState, useEffect, useRef } from 'react';
import { useKnowledge } from '../../context/KnowledgeContext';
import { ObjectType, ProvenanceType, ConfidenceLevel } from '../../types/knowledge';
import { X, Plus, Check, Link2 } from 'lucide-react';
import { AiIndicator } from '../common/AiIndicator';

export const CaptureModal: React.FC = () => {
  const { isCaptureOpen, setIsCaptureOpen, addObject, items, allTopics } = useKnowledge();

  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState<ObjectType>('observation');
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [provenance, setProvenance] = useState<ProvenanceType>('observed');
  const [confidence, setConfidence] = useState<ConfidenceLevel>('high');
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [suggestedConnections, setSuggestedConnections] = useState<{ itemId: string; itemTitle: string; rationale: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasSuggested, setHasSuggested] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when opened
  useEffect(() => {
    if (isCaptureOpen) {
      setTimeout(() => textareaRef.current?.focus(), 80);
    } else {
      // Reset
      setRawText('');
      setTitle('');
      setSelectedType('observation');
      setTopics([]);
      setSelectedConnectionIds([]);
      setSuggestedConnections([]);
      setHasSuggested(false);
    }
  }, [isCaptureOpen]);

  // Handle analysis
  const handleAnalyzeCapture = async () => {
    if (!rawText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/suggest-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          existingTopics: allTopics.map(t => t.name),
          existingItems: items.map(i => ({ id: i.id, title: i.title, type: i.type, topics: i.topics })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const s = data.suggestion;
        if (s) {
          if (!title || title.trim() === '') {
            setTitle(s.suggestedTitle || '');
          }
          if (s.suggestedType) {
            setSelectedType(s.suggestedType);
          }
          if (Array.isArray(s.suggestedTopics) && s.suggestedTopics.length > 0) {
            setTopics(Array.from(new Set([...topics, ...s.suggestedTopics])));
          }
          if (s.provenance) setProvenance(s.provenance);
          if (s.confidence) setConfidence(s.confidence);
          if (Array.isArray(s.potentialConnections) && s.potentialConnections.length > 0) {
            setSuggestedConnections(s.potentialConnections);
            // Default select first suggestion
            setSelectedConnectionIds(s.potentialConnections.slice(0, 2).map((c: any) => c.itemId));
          }
          setHasSuggested(true);
        }
      }
    } catch (e) {
      console.warn('Capture analyze error:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!rawText.trim()) return;

    const finalTitle = title.trim() || rawText.trim().split('\n')[0].slice(0, 60);

    addObject({
      title: finalTitle,
      type: selectedType,
      content: rawText,
      summary: rawText.length > 180 ? rawText.slice(0, 180) + '...' : rawText,
      topics,
      provenance,
      confidence,
      connectedObjectIds: selectedConnectionIds,
    });

    setIsCaptureOpen(false);
  };

  const handleAddTopic = () => {
    const trimmed = newTopicInput.trim();
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed]);
      setNewTopicInput('');
    }
  };

  const removeTopic = (t: string) => {
    setTopics(topics.filter(topic => topic !== t));
  };

  const toggleConnection = (id: string) => {
    if (selectedConnectionIds.includes(id)) {
      setSelectedConnectionIds(selectedConnectionIds.filter(i => i !== id));
    } else {
      setSelectedConnectionIds([...selectedConnectionIds, id]);
    }
  };

  if (!isCaptureOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-theme-subtle rounded-xl shadow-theme-modal w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-subtle flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-medium text-main">
              Quick Capture
            </span>
            <span className="text-muted">·</span>
            <span className="text-xs text-muted">Capture first, organize effortlessly</span>
          </div>
          <button
            onClick={() => setIsCaptureOpen(false)}
            className="p-1.5 text-muted hover:text-main hover:bg-surface-hover rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {/* Raw Text Input */}
          <div>
            <textarea
              ref={textareaRef}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="What did you notice, observe, read, or think? E.g. 'I noticed that I procrastinate much more when a task requires lots of tiny decisions.'"
              className="w-full h-32 p-3 text-main placeholder:text-faint bg-surface-subtle rounded-lg border border-theme-subtle focus:border-theme-strong focus:bg-surface focus:outline-hidden transition-all text-sm leading-relaxed resize-none font-serif"
            />
          </div>

          {/* AI Suggest Bar */}
          <div className="flex items-center justify-between pb-1 border-b border-theme-subtle">
            <div className="text-xs text-muted flex items-center gap-1.5 font-mono">
              <span>{hasSuggested ? 'Suggestions generated' : 'Fast local capture'}</span>
            </div>
            <button
              type="button"
              onClick={handleAnalyzeCapture}
              disabled={isAnalyzing || !rawText.trim()}
              className="text-xs font-medium text-main hover:bg-surface-hover disabled:opacity-40 flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-subtle border border-theme-subtle transition-colors cursor-pointer"
            >
              <span>{isAnalyzing ? 'Analyzing...' : 'Organize'}</span>
              <AiIndicator />
            </button>
          </div>

          {/* Title & Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Editorial title..."
                className="w-full px-3 py-1.5 text-sm bg-surface text-main border border-theme-subtle rounded-md focus:border-theme-strong focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                Type
              </label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value as ObjectType)}
                className="w-full px-3 py-1.5 text-sm bg-surface text-main border border-theme-subtle rounded-md focus:border-theme-strong focus:outline-hidden capitalize"
              >
                <option value="observation">Observation</option>
                <option value="idea">Idea</option>
                <option value="question">Open Question</option>
                <option value="claim">Claim</option>
                <option value="experiment">Experiment</option>
                <option value="source">Source</option>
                <option value="note">Note</option>
                <option value="quote">Quote</option>
                <option value="experience">Experience</option>
              </select>
            </div>
          </div>

          {/* Provenance & Confidence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                Provenance (Origin of Knowledge)
              </label>
              <select
                value={provenance}
                onChange={e => setProvenance(e.target.value as ProvenanceType)}
                className="w-full px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded-md focus:border-theme-strong focus:outline-hidden"
              >
                <option value="observed">I repeatedly observed this</option>
                <option value="tested">I empirically tested this</option>
                <option value="experienced">I experienced this firsthand</option>
                <option value="thought">I think this is true (hypothesis)</option>
                <option value="believed">I currently believe this</option>
                <option value="read">I read or heard this externally</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                Confidence
              </label>
              <div className="flex items-center gap-1.5 p-1 bg-surface-subtle border border-theme-subtle rounded-md">
                {(['low', 'moderate', 'high', 'provisional'] as ConfidenceLevel[]).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setConfidence(lvl)}
                    className={`flex-1 py-1 text-xs font-medium rounded transition-colors capitalize cursor-pointer ${
                      confidence === lvl
                        ? 'bg-surface text-main font-semibold shadow-theme-card border border-theme-subtle'
                        : 'text-muted hover:text-main'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Topics & Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-muted">
              Related Topics
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {topics.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-surface-subtle text-main rounded-md border border-theme-subtle font-mono"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => removeTopic(t)}
                    className="text-faint hover:text-main cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newTopicInput}
                  onChange={e => setNewTopicInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTopic();
                    }
                  }}
                  placeholder="+ Add topic..."
                  className="px-2 py-1 text-xs bg-transparent border-b border-theme-subtle focus:border-theme-strong text-main focus:outline-hidden w-28"
                />
              </div>
            </div>
          </div>

          {/* Suggested Connections to Existing Archive */}
          {suggestedConnections.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-theme-subtle">
              <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                Suggested Connections in Your Archive
              </label>
              <div className="space-y-1.5">
                {suggestedConnections.map(conn => {
                  const isChecked = selectedConnectionIds.includes(conn.itemId);
                  return (
                    <button
                      key={conn.itemId}
                      type="button"
                      onClick={() => toggleConnection(conn.itemId)}
                      className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors flex items-start justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-surface-subtle border-theme-strong text-main font-semibold'
                          : 'bg-surface border-theme-subtle text-muted hover:bg-surface-hover'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-main flex items-center gap-1.5">
                          <Link2 className="w-3 h-3 text-muted" />
                          <span>{conn.itemTitle}</span>
                        </div>
                        <p className="text-muted italic pl-4 font-serif">{conn.rationale}</p>
                      </div>
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-accent border-accent text-white' : 'border-theme-subtle bg-surface'
                      }`}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-theme-subtle bg-surface-subtle flex items-center justify-between">
          <span className="text-xs font-mono text-faint">
            Press Cmd+Enter or click Save
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCaptureOpen(false)}
              className="px-3 py-1.5 text-xs text-muted hover:text-main rounded-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!rawText.trim()}
              className="px-4 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 disabled:opacity-40 rounded-md shadow-theme-card transition-colors cursor-pointer"
            >
              Save to Knowledge Desk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
