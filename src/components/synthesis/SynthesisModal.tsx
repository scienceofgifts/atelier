import React, { useState } from 'react';
import { SynthesisResult, KnowledgeObject } from '../../types/knowledge';
import { useKnowledge } from '../../context/KnowledgeContext';
import { X, Copy, Check, BookmarkPlus, ArrowRight } from 'lucide-react';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface SynthesisModalProps {
  synthesis: SynthesisResult | null;
  onClose: () => void;
  onSelectObject: (item: KnowledgeObject) => void;
}

export const SynthesisModal: React.FC<SynthesisModalProps> = ({ synthesis, onClose, onSelectObject }) => {
  const { items, addObject } = useKnowledge();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!synthesis) return null;

  const handleCopy = () => {
    const text = `# Synthesis: ${synthesis.query}

## Summary
${synthesis.summary}

## What You Know
${synthesis.whatYouKnow.map(k => `- ${k}`).join('\n')}

## Supporting Evidence
${synthesis.supportingEvidence.map(e => `- "${e.text}" (Source: ${e.source})`).join('\n')}

## Sources
${synthesis.sources.map(s => `- ${s.title} (${s.medium}): ${s.relevance}`).join('\n')}

## Experiments
${synthesis.experiments.map(exp => `- Protocol: ${exp.protocol}\n  Result: ${exp.result}\n  Takeaway: ${exp.takeaway}`).join('\n')}

## Contradictions
${synthesis.contradictions.map(c => `- ${c}`).join('\n')}

## Open Questions
${synthesis.openQuestions.map(q => `- ${q}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToArchive = () => {
    addObject({
      title: `Synthesis: ${synthesis.query}`,
      type: 'claim',
      summary: synthesis.summary,
      content: `${synthesis.summary}\n\n### Key Principles Established:\n${synthesis.whatYouKnow.map(k => `• ${k}`).join('\n')}\n\n### Open Questions Remaining:\n${synthesis.openQuestions.map(q => `• ${q}`).join('\n')}`,
      topics: ['Synthesis', 'Working Principles'],
      provenance: 'believed',
      confidence: 'high',
      connectedObjectIds: synthesis.relatedKnowledgeIds || [],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const relatedItems = items.filter(i => synthesis.relatedKnowledgeIds?.includes(i.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-theme-subtle rounded-xl shadow-theme-modal w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-theme-subtle flex items-start justify-between bg-surface-subtle">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted mb-1">
              <span>Knowledge Synthesis</span>
              <span>·</span>
              <span className="capitalize">{synthesis.provider === 'gemini' ? 'Grounded AI Synthesis' : 'Archive Index Synthesis'}</span>
            </div>
            <h2 className="font-serif text-2xl text-main leading-snug">
              “{synthesis.query}”
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-main hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-6 overflow-y-auto space-y-8 divide-y divide-theme-subtle text-main leading-relaxed">
          {/* Summary */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-muted font-semibold">
              Current Synthesis
            </h3>
            <div className="font-serif text-lg text-main italic leading-relaxed">
              <MarkdownRenderer content={synthesis.summary} />
            </div>
          </div>

          {/* What You Currently Know */}
          {synthesis.whatYouKnow && synthesis.whatYouKnow.length > 0 && (
            <div className="pt-6 space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-muted font-semibold">
                What You Currently Know
              </h3>
              <ul className="space-y-2.5">
                {synthesis.whatYouKnow.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-main">
                    <span className="text-faint mt-1 select-none">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Supporting Evidence & Observations */}
          {synthesis.supportingEvidence && synthesis.supportingEvidence.length > 0 && (
            <div className="pt-6 space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-muted font-semibold">
                Supporting Evidence & Observations
              </h3>
              <div className="space-y-3">
                {synthesis.supportingEvidence.map((ev, idx) => (
                  <div key={idx} className="p-3 bg-surface-subtle rounded-md border border-theme-subtle text-sm">
                    <p className="text-main italic">“{ev.text}”</p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted font-mono">
                      <span>Source: {ev.source}</span>
                      <span>·</span>
                      <span className="capitalize">{ev.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experiments Run */}
          {synthesis.experiments && synthesis.experiments.length > 0 && (
            <div className="pt-6 space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-muted font-semibold">
                Empirical Trials & Experiments
              </h3>
              <div className="space-y-3">
                {synthesis.experiments.map((exp, idx) => (
                  <div key={idx} className="p-3.5 bg-surface-subtle rounded-md border border-theme-subtle text-sm space-y-1.5">
                    <div className="font-medium text-main">{exp.protocol}</div>
                    <div className="text-xs text-muted"><span className="font-semibold text-main">Outcome:</span> {exp.result}</div>
                    {exp.takeaway && (
                      <div className="text-xs text-muted"><span className="font-semibold text-main">Observation:</span> {exp.takeaway}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contradictions & Tensions */}
          {synthesis.contradictions && synthesis.contradictions.length > 0 && (
            <div className="pt-6 space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-muted font-semibold flex items-center gap-1.5">
                <span>Contradictions & Tensions</span>
              </h3>
              <ul className="space-y-2">
                {synthesis.contradictions.map((contra, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-main">
                    <span className="text-faint mt-1 select-none">↳</span>
                    <span>{contra}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Open Questions Remaining */}
          {synthesis.openQuestions && synthesis.openQuestions.length > 0 && (
            <div className="pt-6 space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-muted font-semibold">
                Open Questions Remaining
              </h3>
              <ul className="space-y-2">
                {synthesis.openQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-main font-serif italic">
                    <span className="text-faint font-sans not-italic">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Linked Objects in Archive */}
          {relatedItems.length > 0 && (
            <div className="pt-6 space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-muted font-semibold">
                Directly Connected Objects in Archive
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relatedItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onClose();
                      onSelectObject(item);
                    }}
                    className="p-3 text-left bg-surface-subtle hover:bg-surface-hover rounded-md border border-theme-subtle transition-colors group flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-mono text-muted uppercase">{item.type}</div>
                      <div className="text-sm font-medium text-main group-hover:text-muted truncate max-w-[220px]">
                        {item.title}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-faint group-hover:text-main transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-theme-subtle bg-surface-subtle flex items-center justify-between">
          <div className="text-xs text-muted font-mono">
            {synthesis.supportingEvidence?.length || 0} observations synthesized
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-main bg-surface border border-theme-subtle hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Synthesis'}</span>
            </button>
            <button
              onClick={handleSaveToArchive}
              disabled={saved}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-accent hover:opacity-90 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{saved ? 'Saved to Archive' : 'Save as Knowledge Object'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
