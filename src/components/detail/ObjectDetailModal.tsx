import React, { useState, useMemo } from 'react';
import { 
  KnowledgeObject, 
  ObjectType,
  SourceMedium,
  Hypothesis, 
  HypothesisStatus, 
  ConfidenceLevel, 
  ProvenanceType,
  SynthesisHistoryEntry 
} from '../../types/knowledge';
import { useKnowledge } from '../../context/KnowledgeContext';
import { 
  X, 
  Star, 
  Trash2, 
  Edit3, 
  Plus, 
  ArrowRight, 
  RotateCcw,
  FlaskConical,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  Film,
  BookOpen,
  FileText,
  Video,
  Mic,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { AiIndicator } from '../common/AiIndicator';

interface ObjectDetailModalProps {
  object: KnowledgeObject | null;
  onClose: () => void;
  onNavigateObject: (obj: KnowledgeObject) => void;
}

export const ObjectDetailModal: React.FC<ObjectDetailModalProps> = ({ object, onClose, onNavigateObject }) => {
  const { 
    items, 
    updateObject, 
    deleteObject, 
    toggleStar, 
    recordRevisit, 
    addHypothesisToQuestion, 
    updateHypothesis,
    recordExperimentResult,
    performAiAction,
    setSelectedTopic
  } = useKnowledge();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedType, setEditedType] = useState<ObjectType>(object?.type || 'observation');
  const [editedMedium, setEditedMedium] = useState<SourceMedium | undefined>(object?.medium || object?.sourceMedium);
  const [editedContent, setEditedContent] = useState('');
  const [editedUnderstanding, setEditedUnderstanding] = useState('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Helper for medium and type icons
  const getMediumOrTypeIcon = (type: ObjectType, medium?: SourceMedium) => {
    if (type === 'source') {
      if (medium === 'movie') return <Film className="w-3.5 h-3.5" />;
      if (medium === 'book') return <BookOpen className="w-3.5 h-3.5" />;
      if (medium === 'article') return <FileText className="w-3.5 h-3.5" />;
      if (medium === 'video') return <Video className="w-3.5 h-3.5" />;
      if (medium === 'podcast') return <Mic className="w-3.5 h-3.5" />;
      if (medium === 'conversation') return <MessageSquare className="w-3.5 h-3.5" />;
      return <BookOpen className="w-3.5 h-3.5" />;
    }
    if (type === 'question') return <HelpCircle className="w-3.5 h-3.5" />;
    if (type === 'experiment') return <FlaskConical className="w-3.5 h-3.5" />;
    if (type === 'idea') return <BookOpen className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
  };

  // New hypothesis modal state
  const [isAddingHypothesis, setIsAddingHypothesis] = useState(false);
  const [newHypStatement, setNewHypStatement] = useState('');
  const [newHypConfidence, setNewHypConfidence] = useState<ConfidenceLevel>('moderate');

  // Record experiment result state
  const [isLoggingResult, setIsLoggingResult] = useState(false);
  const [expResultInput, setExpResultInput] = useState('');
  const [expObsInput, setExpObsInput] = useState('');

  // Extract from source state
  const [isAddingSourceExtract, setIsAddingSourceExtract] = useState(false);
  const [extractCategory, setExtractCategory] = useState<'noticed' | 'ideas' | 'questions' | 'quotes'>('noticed');
  const [extractTextInput, setExtractTextInput] = useState('');

  // Local calculation: new/updated relevant items since last synthesis
  const newRelevantItems = useMemo(() => {
    if (!object || object.type !== 'question') return [];
    const synthDate = object.lastSynthesizedAt ? new Date(object.lastSynthesizedAt).getTime() : 0;
    return items.filter(it => {
      if (it.id === object.id) return false;
      const itDate = new Date(it.updatedAt || it.createdAt).getTime();
      const matchesTopic = it.topics?.some(t => object.topics?.includes(t));
      const matchesLink = object.connectedObjectIds?.includes(it.id) || it.connectedObjectIds?.includes(object.id);
      return (matchesTopic || matchesLink) && itDate > synthDate;
    });
  }, [object, items]);

  if (!object) return null;

  // Initialize edit fields
  const handleStartEdit = () => {
    setEditedTitle(object.title);
    setEditedContent(object.content);
    setEditedUnderstanding(object.currentUnderstanding || '');
    setEditedType(object.type);
    setEditedMedium(object.medium || object.sourceMedium || 'book');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const isSourceOrHasMedium = editedType === 'source' || !!object.sourceTitle;
    const finalMedium = isSourceOrHasMedium ? (editedMedium || 'book') : undefined;

    updateObject(object.id, {
      title: editedTitle,
      type: editedType,
      medium: finalMedium,
      sourceMedium: finalMedium,
      content: editedContent,
      currentUnderstanding: editedUnderstanding,
    });
    setIsEditing(false);
  };

  const handleUpdateUnderstanding = async () => {
    setIsAiLoading(true);
    setAiAnalysisResult(null);
    try {
      const res = await performAiAction('update-understanding', object, newRelevantItems);
      
      const historyEntry: SynthesisHistoryEntry = {
        id: `synth_hist_${Date.now()}`,
        timestamp: new Date().toISOString(),
        previousUnderstanding: object.currentUnderstanding || 'Initial inquiry formulated',
        newUnderstanding: res,
        contributingItemIds: newRelevantItems.map(i => i.id),
        explanation: newRelevantItems.length > 0
          ? `Incorporated ${newRelevantItems.length} new relevant items`
          : 'Refined current understanding based on active hypotheses',
      };

      const updatedHistory = [historyEntry, ...(object.synthesisHistory || [])];

      updateObject(object.id, {
        currentUnderstanding: res,
        lastSynthesizedAt: new Date().toISOString(),
        synthesisHistory: updatedHistory,
      });

      setAiAnalysisResult('Current Understanding updated and recorded in Synthesis History.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiAction = async (action: string) => {
    setIsAiLoading(true);
    setAiAnalysisResult(null);
    try {
      const res = await performAiAction(action, object);
      setAiAnalysisResult(res);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveHypothesis = () => {
    if (!newHypStatement.trim()) return;
    addHypothesisToQuestion(object.id, {
      statement: newHypStatement.trim(),
      status: 'untested',
      confidence: newHypConfidence,
    });
    setNewHypStatement('');
    setIsAddingHypothesis(false);
  };

  const handleSaveExperimentOutcome = () => {
    if (!expResultInput.trim() && !expObsInput.trim()) return;
    recordExperimentResult(object.id, {
      result: expResultInput,
      observation: expObsInput,
      status: 'completed',
    });
    setIsLoggingResult(false);
  };

  const handleAddExtractedItem = () => {
    if (!extractTextInput.trim()) return;
    const current = object.extractedItems || { noticed: [], ideas: [], questions: [], quotes: [] };
    const updated = {
      ...current,
      [extractCategory]: [...(current[extractCategory] || []), extractTextInput.trim()],
    };
    updateObject(object.id, { extractedItems: updated });
    setExtractTextInput('');
    setIsAddingSourceExtract(false);
  };

  const connectedObjects = items.filter(it => object.connectedObjectIds?.includes(it.id));

  const provenanceLabels: Record<ProvenanceType, string> = {
    tested: 'I empirically tested this',
    experienced: 'I experienced this firsthand',
    observed: 'I repeatedly observed this',
    believed: 'I currently believe this',
    thought: 'I think this is true',
    read: 'I read this in external source',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-theme-subtle rounded-xl shadow-theme-modal w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Editorial Top Utility Bar */}
        <div className="px-6 py-3.5 border-b border-theme-subtle bg-surface-subtle flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-2 font-mono uppercase tracking-wider">
            <span className="font-semibold text-main flex items-center gap-1.5">
              {getMediumOrTypeIcon(object.type, object.medium || object.sourceMedium)}
              <span>{object.type}</span>
            </span>
            <span>·</span>
            {(object.sourceMedium || object.medium) && (
              <>
                <span className="capitalize">{object.sourceMedium || object.medium}</span>
                <span>·</span>
              </>
            )}
            <span>Created {new Date(object.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            {object.revisitCount ? (
              <>
                <span>·</span>
                <span>{object.revisitCount} visits</span>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => recordRevisit(object.id)}
              title="Mark as revisited today"
              className="p-1.5 hover:text-main hover:bg-surface-hover rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => toggleStar(object.id)}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                object.isStarred ? 'text-amber-500' : 'hover:text-main hover:bg-surface-hover'
              }`}
            >
              <Star className="w-3.5 h-3.5" fill={object.isStarred ? 'currentColor' : 'none'} />
            </button>
            {!isEditing ? (
              <button
                onClick={handleStartEdit}
                title="Edit object"
                className="p-1.5 hover:text-main hover:bg-surface-hover rounded transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 text-xs text-muted hover:text-main rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-2.5 py-1 text-xs font-medium text-main bg-surface-subtle hover:bg-surface-hover border border-theme-subtle rounded transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            )}
            <button
              onClick={() => {
                if (confirm('Permanently remove this knowledge object?')) {
                  deleteObject(object.id);
                  onClose();
                }
              }}
              className="p-1.5 hover:text-rose-500 hover:bg-surface-hover rounded transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-theme-subtle mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-main hover:bg-surface-hover rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 sm:px-10 py-8 overflow-y-auto space-y-8 divide-y divide-theme-subtle">
          {/* Title Area */}
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={e => setEditedTitle(e.target.value)}
                    className="w-full font-serif text-2xl sm:text-3xl text-main bg-surface border border-theme-subtle rounded-lg p-2.5 focus:border-theme-strong focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                      Type / Category
                    </label>
                    <select
                      value={editedType}
                      onChange={e => {
                        const newType = e.target.value as ObjectType;
                        setEditedType(newType);
                        if (newType === 'source' && !editedMedium) {
                          setEditedMedium('book');
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-surface text-main border border-theme-subtle rounded-lg focus:border-theme-strong focus:outline-hidden capitalize cursor-pointer"
                    >
                      <option value="observation">Observation</option>
                      <option value="idea">Idea</option>
                      <option value="question">Open Question</option>
                      <option value="source">Source</option>
                      <option value="experiment">Experiment</option>
                      <option value="claim">Claim</option>
                      <option value="note">Note</option>
                      <option value="quote">Quote</option>
                      <option value="concept">Concept</option>
                      <option value="experience">Experience</option>
                    </select>
                  </div>

                  {(editedType === 'source' || editedMedium || object.sourceMedium || object.medium) && (
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                        Source Medium
                      </label>
                      <select
                        value={editedMedium || 'book'}
                        onChange={e => setEditedMedium(e.target.value as SourceMedium)}
                        className="w-full px-3 py-2 text-sm bg-surface text-main border border-theme-subtle rounded-lg focus:border-theme-strong focus:outline-hidden capitalize cursor-pointer"
                      >
                        <option value="book">Book</option>
                        <option value="movie">Movie / Film</option>
                        <option value="article">Article / Essay</option>
                        <option value="video">Video</option>
                        <option value="podcast">Podcast</option>
                        <option value="conversation">Conversation</option>
                        <option value="experience">Experience</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <h1 className="font-serif text-3xl sm:text-4xl text-main font-normal leading-tight">
                {object.title}
              </h1>
            )}

            {/* Unboxed Metadata Line (Zero-Pill discipline) */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted pt-1">
              {object.creator && (
                <>
                  <span>By {object.creator}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              {object.year && (
                <>
                  <span>{object.year}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              {object.provenance && (
                <>
                  <span className="text-main font-sans font-medium">{provenanceLabels[object.provenance]}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              {object.confidence && (
                <>
                  <span>Confidence: <strong className="font-sans font-medium capitalize text-main">{object.confidence}</strong></span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              {object.sourceTitle && (
                <>
                  <span>Origin: <em className="font-serif">{object.sourceTitle}</em></span>
                </>
              )}
            </div>

            {/* Topics Bar */}
            {object.topics && object.topics.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted pt-1 font-mono">
                <span className="text-faint">Topics:</span>
                {object.topics.map((t, idx) => (
                  <React.Fragment key={t}>
                    <button
                      onClick={() => {
                        setSelectedTopic(t);
                        onClose();
                      }}
                      className="hover:text-main hover:underline cursor-pointer"
                    >
                      {t}
                    </button>
                    {idx < object.topics.length - 1 && <span className="text-faint">/</span>}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* QUESTION SPECIFIC WORKSPACE */}
          {object.type === 'question' && (
            <div className="pt-8 space-y-8">
              {/* Current Understanding Card */}
              <div className="p-6 bg-surface-subtle border-l-2 border-theme-strong rounded-r-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-theme-subtle pb-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono uppercase tracking-widest text-muted font-semibold">
                      Current Understanding
                    </div>
                    {/* Subtle local indicator of new items */}
                    <div className="text-[11px] font-mono text-muted">
                      {newRelevantItems.length > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          • {newRelevantItems.length} new/updated relevant items since last update
                        </span>
                      ) : (
                        <span>Current understanding is up to date with local archive</span>
                      )}
                    </div>
                  </div>

                  {/* Explicit Update Understanding Button */}
                  <button
                    onClick={handleUpdateUnderstanding}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-main bg-surface border border-theme-subtle hover:bg-surface-hover rounded-md shadow-theme-card transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-muted" />
                    <span>{isAiLoading ? 'Synthesizing...' : 'Update Understanding'}</span>
                    <AiIndicator />
                  </button>
                </div>

                {isEditing ? (
                  <textarea
                    value={editedUnderstanding}
                    onChange={e => setEditedUnderstanding(e.target.value)}
                    className="w-full h-24 p-2 bg-surface text-main text-sm border border-theme-subtle rounded font-serif"
                  />
                ) : (
                  <p className="font-serif text-lg text-main leading-relaxed italic">
                    {object.currentUnderstanding || 'No synthesized understanding formulated yet. Test hypotheses below to update.'}
                  </p>
                )}

                {/* Synthesis History Accordion */}
                {object.synthesisHistory && object.synthesisHistory.length > 0 && (
                  <div className="pt-2 border-t border-theme-subtle">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-main cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Evolution of Understanding ({object.synthesisHistory.length} previous versions)</span>
                      {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {showHistory && (
                      <div className="mt-3 space-y-3 pl-2 border-l border-theme-subtle animate-in fade-in duration-150">
                        {object.synthesisHistory.map((hist) => (
                          <div key={hist.id} className="p-3 bg-surface border border-theme-subtle rounded-md text-xs space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                              <span>Synthesized {new Date(hist.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span>{hist.explanation}</span>
                            </div>
                            <p className="font-serif text-muted italic line-clamp-3">
                              “{hist.previousUnderstanding}”
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Hypotheses Workspace */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-muted font-semibold font-mono">
                      Possible Answers & Hypotheses ({object.hypotheses?.length || 0})
                    </h3>
                    <p className="text-xs text-muted font-sans">Approaches currently being weighed, tested, or challenged</p>
                  </div>
                  <button
                    onClick={() => setIsAddingHypothesis(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-main bg-surface-subtle border border-theme-subtle hover:bg-surface-hover rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Hypothesis</span>
                  </button>
                </div>

                {isAddingHypothesis && (
                  <div className="p-4 bg-surface-subtle rounded-lg border border-theme-subtle space-y-3">
                    <input
                      type="text"
                      value={newHypStatement}
                      onChange={e => setNewHypStatement(e.target.value)}
                      placeholder="Hypothesis statement (e.g. 'Shorter workouts make me more consistent')"
                      className="w-full px-3 py-1.5 text-sm bg-surface text-main border border-theme-subtle rounded"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted">Confidence:</span>
                        {(['low', 'moderate', 'high'] as ConfidenceLevel[]).map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => setNewHypConfidence(lvl)}
                            className={`px-2 py-0.5 rounded capitalize ${newHypConfidence === lvl ? 'bg-accent text-white font-medium' : 'bg-surface text-muted'}`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsAddingHypothesis(false)}
                          className="px-2.5 py-1 text-xs text-muted hover:text-main"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveHypothesis}
                          className="px-3 py-1 text-xs bg-accent text-white rounded font-medium cursor-pointer"
                        >
                          Add to Question
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {(object.hypotheses || []).map((hyp) => {
                    const statusColors: Record<HypothesisStatus, string> = {
                      supported: 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40',
                      promising: 'text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40',
                      testing: 'text-sky-800 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/40',
                      untested: 'text-muted bg-surface-subtle border-theme-subtle',
                      weak: 'text-rose-800 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40',
                      rejected: 'text-faint bg-surface-subtle border-theme-subtle line-through',
                    };

                    return (
                      <div
                        key={hyp.id}
                        className="p-4 bg-surface border border-theme-subtle rounded-lg space-y-2 shadow-theme-card"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-serif text-base text-main leading-snug">
                            {hyp.statement}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={hyp.status}
                              onChange={e => updateHypothesis(object.id, hyp.id, { status: e.target.value as HypothesisStatus })}
                              className={`text-xs font-mono font-medium px-2 py-0.5 rounded border capitalize ${statusColors[hyp.status]}`}
                            >
                              <option value="untested">Untested</option>
                              <option value="testing">Testing</option>
                              <option value="promising">Promising</option>
                              <option value="supported">Supported</option>
                              <option value="weak">Weak</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                        </div>

                        {hyp.evidenceNotes && (
                          <div className="text-xs text-muted italic bg-surface-subtle p-2 rounded border border-theme-subtle">
                            Evidence: {hyp.evidenceNotes}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted font-mono pt-1">
                          <span>Confidence: <span className="capitalize text-main">{hyp.confidence}</span></span>
                          {hyp.lastTestedAt && <span>Tested {hyp.lastTestedAt}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* EXPERIMENT DETAILS */}
          {object.type === 'experiment' && object.experimentDetails && (
            <div className="pt-8 space-y-6">
              <div className="p-5 bg-surface-subtle rounded-lg border border-theme-subtle space-y-3">
                <div className="text-xs font-mono uppercase tracking-widest text-muted font-semibold">
                  Protocol Specification
                </div>
                <p className="text-sm font-medium text-main leading-relaxed">
                  {object.experimentDetails.protocol}
                </p>
                {object.experimentDetails.durationDays && (
                  <div className="text-xs font-mono text-muted">
                    Duration: {object.experimentDetails.durationDays} days · Status: <span className="capitalize font-semibold text-main">{object.experimentDetails.status}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-surface border border-theme-subtle rounded-lg space-y-1.5 shadow-theme-card">
                  <div className="text-xs font-mono uppercase tracking-widest text-muted font-semibold">
                    Empirical Result
                  </div>
                  <p className="text-sm text-main">
                    {object.experimentDetails.result || 'No empirical outcome recorded yet.'}
                  </p>
                </div>

                <div className="p-4 bg-surface border border-theme-subtle rounded-lg space-y-1.5 shadow-theme-card">
                  <div className="text-xs font-mono uppercase tracking-widest text-muted font-semibold">
                    Key Observation
                  </div>
                  <p className="text-sm text-main italic">
                    {object.experimentDetails.observation || 'No observations logged.'}
                  </p>
                </div>
              </div>

              {!isLoggingResult ? (
                <button
                  onClick={() => {
                    setExpResultInput(object.experimentDetails?.result || '');
                    setExpObsInput(object.experimentDetails?.observation || '');
                    setIsLoggingResult(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-main bg-surface-subtle border border-theme-subtle hover:bg-surface-hover rounded transition-colors cursor-pointer"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Update Experiment Results</span>
                </button>
              ) : (
                <div className="p-4 bg-surface-subtle rounded-lg border border-theme-subtle space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-muted">Record Test Outcome</h4>
                  <input
                    type="text"
                    value={expResultInput}
                    onChange={e => setExpResultInput(e.target.value)}
                    placeholder="Result (e.g. 'Completed 11/14 sessions')"
                    className="w-full px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded"
                  />
                  <textarea
                    value={expObsInput}
                    onChange={e => setExpObsInput(e.target.value)}
                    placeholder="Observation (e.g. 'I resisted starting much less often...')"
                    className="w-full h-20 px-3 py-1.5 text-xs bg-surface text-main border border-theme-subtle rounded"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsLoggingResult(false)}
                      className="px-2.5 py-1 text-xs text-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveExperimentOutcome}
                      className="px-3 py-1 text-xs bg-accent text-white rounded font-medium cursor-pointer"
                    >
                      Save Result
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SOURCE SPECIFIC EXTRACTS */}
          {object.type === 'source' && object.extractedItems && (
            <div className="pt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-widest text-muted font-semibold font-mono">
                  Extracted Intellectual Fragments
                </h3>
                <button
                  onClick={() => setIsAddingSourceExtract(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-main bg-surface-subtle border border-theme-subtle hover:bg-surface-hover rounded transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Extract from Source</span>
                </button>
              </div>

              {isAddingSourceExtract && (
                <div className="p-4 bg-surface-subtle rounded-lg border border-theme-subtle space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Extract category:</span>
                    <select
                      value={extractCategory}
                      onChange={e => setExtractCategory(e.target.value as any)}
                      className="text-xs px-2 py-1 bg-surface text-main border border-theme-subtle rounded capitalize"
                    >
                      <option value="noticed">Things I noticed (Observation)</option>
                      <option value="ideas">Idea extracted</option>
                      <option value="questions">Question raised</option>
                      <option value="quotes">Quote</option>
                    </select>
                  </div>
                  <textarea
                    value={extractTextInput}
                    onChange={e => setExtractTextInput(e.target.value)}
                    placeholder="Write the extracted thought or quote..."
                    className="w-full h-20 p-2 text-xs bg-surface text-main border border-theme-subtle rounded"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingSourceExtract(false)}
                      className="px-2.5 py-1 text-xs text-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddExtractedItem}
                      className="px-3 py-1 text-xs bg-accent text-white rounded font-medium cursor-pointer"
                    >
                      Add Extract
                    </button>
                  </div>
                </div>
              )}

              {/* Things I noticed */}
              {object.extractedItems.noticed && object.extractedItems.noticed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-muted">
                    Things I Noticed
                  </h4>
                  <div className="space-y-2">
                    {object.extractedItems.noticed.map((notic, idx) => (
                      <div key={idx} className="p-3 bg-surface border border-theme-subtle rounded-md text-sm text-main shadow-theme-card">
                        {notic}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ideas Extracted */}
              {object.extractedItems.ideas && object.extractedItems.ideas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-muted">
                    Ideas Extracted
                  </h4>
                  <div className="space-y-2">
                    {object.extractedItems.ideas.map((idea, idx) => (
                      <div key={idx} className="p-3 bg-surface border border-theme-subtle rounded-md text-sm text-main font-serif italic shadow-theme-card">
                        “{idea}”
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions Raised */}
              {object.extractedItems.questions && object.extractedItems.questions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-muted">
                    Questions Raised
                  </h4>
                  <div className="space-y-2">
                    {object.extractedItems.questions.map((q, idx) => (
                      <div key={idx} className="p-3 bg-surface border border-theme-subtle rounded-md text-sm text-main font-serif shadow-theme-card">
                        ? {q}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quotes */}
              {object.extractedItems.quotes && object.extractedItems.quotes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-muted">
                    Quotes
                  </h4>
                  <div className="space-y-2">
                    {object.extractedItems.quotes.map((qt, idx) => (
                      <blockquote key={idx} className="p-3 bg-surface-subtle border-l-2 border-theme-strong text-sm text-main italic font-serif">
                        {qt}
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes & Content */}
          <div className="pt-8 space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-muted font-semibold font-mono">
              Notes & Reflections
            </h3>
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                className="w-full h-48 p-3 text-sm bg-surface text-main border border-theme-subtle rounded font-serif leading-relaxed"
              />
            ) : (
              <div className="prose text-main font-serif text-base leading-relaxed whitespace-pre-wrap">
                {object.content || 'No detailed notes recorded.'}
              </div>
            )}
          </div>

          {/* Connected Objects in Brain */}
          {connectedObjects.length > 0 && (
            <div className="pt-8 space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-muted font-semibold font-mono">
                Connected Knowledge Objects ({connectedObjects.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {connectedObjects.map(conn => (
                  <button
                    key={conn.id}
                    onClick={() => onNavigateObject(conn)}
                    className="p-3 text-left bg-surface hover:bg-surface-hover rounded-lg border border-theme-subtle transition-colors group flex items-start justify-between cursor-pointer shadow-theme-card"
                  >
                    <div>
                      <div className="text-xs font-mono text-muted uppercase">{conn.type}</div>
                      <div className="text-sm font-medium text-main group-hover:text-muted leading-snug">
                        {conn.title}
                      </div>
                      {conn.topics && (
                        <div className="text-xs text-faint mt-1 truncate max-w-[240px]">
                          {conn.topics.join(' · ')}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-faint group-hover:text-main transition-transform group-hover:translate-x-0.5 shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Thinking Partner Bar */}
          <div className="pt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest text-muted font-semibold font-mono flex items-center gap-1.5">
                <span>Intellectual Reasoning Actions</span>
              </h3>
              {isAiLoading && <span className="text-xs text-muted font-mono">Reasoning over relevant context...</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleAiAction('challenge')}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-main bg-surface border border-theme-subtle hover:bg-surface-hover rounded-md shadow-theme-card transition-colors cursor-pointer"
              >
                <span>Challenge This Conclusion</span>
                <AiIndicator />
              </button>
              <button
                onClick={() => handleAiAction('extract')}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-main bg-surface border border-theme-subtle hover:bg-surface-hover rounded-md shadow-theme-card transition-colors cursor-pointer"
              >
                <span>Extract Atomic Ideas</span>
                <AiIndicator />
              </button>
            </div>

            {aiAnalysisResult && (
              <div className="p-4 bg-surface-subtle rounded-lg border border-theme-subtle text-main text-sm space-y-2 animate-in fade-in duration-150 shadow-theme-card">
                <div className="flex items-center justify-between border-b border-theme-subtle pb-1 text-xs font-mono text-muted">
                  <span>AI Reasoning Feedback</span>
                  <button onClick={() => setAiAnalysisResult(null)} className="hover:text-main">×</button>
                </div>
                <div className="whitespace-pre-wrap font-serif leading-relaxed text-main text-sm">
                  {aiAnalysisResult}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
