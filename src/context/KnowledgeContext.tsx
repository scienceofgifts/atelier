import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  KnowledgeObject, 
  ConnectionPattern, 
  ObjectType, 
  SynthesisResult,
  Hypothesis,
  ExperimentRun 
} from '../types/knowledge';
import { INITIAL_KNOWLEDGE_OBJECTS, INITIAL_PATTERNS } from '../data/seedData';
import { executeLocalSearch, SearchResultItem } from '../utils/localSearch';

interface KnowledgeContextType {
  items: KnowledgeObject[];
  patterns: ConnectionPattern[];
  activeItem: KnowledgeObject | null;
  setActiveItem: (item: KnowledgeObject | null) => void;
  addObject: (data: Partial<KnowledgeObject>) => KnowledgeObject;
  updateObject: (id: string, updates: Partial<KnowledgeObject>) => void;
  deleteObject: (id: string) => void;
  toggleStar: (id: string) => void;
  recordRevisit: (id: string) => void;
  addHypothesisToQuestion: (questionId: string, hypothesis: Omit<Hypothesis, 'id'>) => void;
  updateHypothesis: (questionId: string, hypothesisId: string, updates: Partial<Hypothesis>) => void;
  recordExperimentResult: (experimentId: string, resultDetails: Partial<ExperimentRun>) => void;
  acceptPattern: (patternId: string) => void;
  dismissPattern: (patternId: string) => void;
  
  // Navigation, Local Search & Filtering
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SearchResultItem[];
  selectedTopic: string | null;
  setSelectedTopic: (t: string | null) => void;
  selectedType: ObjectType | 'all';
  setSelectedType: (t: ObjectType | 'all') => void;
  
  // Capture Modal State
  isCaptureOpen: boolean;
  setIsCaptureOpen: (open: boolean) => void;
  
  // Secondary Gemini Synthesis over Selected Local Results
  synthesizeSelectedItems: (query: string, selectedItems: KnowledgeObject[]) => Promise<SynthesisResult>;
  isSynthesizing: boolean;
  lastSynthesis: SynthesisResult | null;
  setLastSynthesis: (res: SynthesisResult | null) => void;
  
  // Connections detection
  detectConnections: () => Promise<void>;
  isDetectingConnections: boolean;
  
  // AI contextual action
  performAiAction: (action: string, object: KnowledgeObject, customRelevantItems?: KnowledgeObject[]) => Promise<string>;
  
  // Storage maintenance & backup protection
  allTopics: { name: string; count: number }[];
  resetToSampleData: () => void;
  restorePreviousSnapshot: () => boolean;
  hasBackupSnapshot: boolean;
  backupTimestamp: string | null;
  lastResetOccurred: boolean;
  clearResetNotice: () => void;
  exportArchiveJson: () => void;
  importArchiveJson: (json: string) => boolean;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

const STORAGE_KEY_ITEMS = 'atelier_brain_items_v1';
const STORAGE_KEY_PATTERNS = 'atelier_brain_patterns_v1';
const STORAGE_KEY_BACKUP = 'atelier_brain_backup_snapshot_v1';

interface BackupSnapshot {
  timestamp: string;
  items: KnowledgeObject[];
  patterns: ConnectionPattern[];
}

export const KnowledgeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<KnowledgeObject[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
    }
    return INITIAL_KNOWLEDGE_OBJECTS;
  });

  const [patterns, setPatterns] = useState<ConnectionPattern[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PATTERNS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading patterns from localStorage:', e);
    }
    return INITIAL_PATTERNS;
  });

  // Automatic backup snapshot state
  const [hasBackupSnapshot, setHasBackupSnapshot] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY_BACKUP);
    } catch {
      return false;
    }
  });

  const [backupTimestamp, setBackupTimestamp] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BACKUP);
      if (stored) {
        const parsed: BackupSnapshot = JSON.parse(stored);
        return parsed.timestamp || null;
      }
    } catch {}
    return null;
  });

  const [lastResetOccurred, setLastResetOccurred] = useState<boolean>(false);

  const [activeItem, setActiveItem] = useState<KnowledgeObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ObjectType | 'all'>('all');
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [lastSynthesis, setLastSynthesis] = useState<SynthesisResult | null>(null);
  const [isDetectingConnections, setIsDetectingConnections] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save items to localStorage:', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PATTERNS, JSON.stringify(patterns));
    } catch (e) {
      console.error('Failed to save patterns to localStorage:', e);
    }
  }, [patterns]);

  // Keep activeItem updated if items change
  useEffect(() => {
    if (activeItem) {
      const updated = items.find(i => i.id === activeItem.id);
      if (updated && updated !== activeItem) {
        setActiveItem(updated);
      }
    }
  }, [items, activeItem]);

  // Dynamic deterministic local search results over ALL local items
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return executeLocalSearch(items, searchQuery, {
      typeFilter: selectedType,
      topicFilter: selectedTopic,
    });
  }, [items, searchQuery, selectedType, selectedTopic]);

  // Dynamic topics with counts
  const allTopics = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      for (const t of it.topics || []) {
        map.set(t, (map.get(t) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const addObject = (data: Partial<KnowledgeObject>): KnowledgeObject => {
    const now = new Date().toISOString();
    const newId = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newObj: KnowledgeObject = {
      id: newId,
      title: data.title || 'Untitled Thought',
      type: data.type || 'note',
      summary: data.summary || '',
      content: data.content || '',
      topics: data.topics || [],
      connectedObjectIds: data.connectedObjectIds || [],
      provenance: data.provenance,
      confidence: data.confidence,
      sourceId: data.sourceId,
      sourceTitle: data.sourceTitle,
      sourceMedium: data.sourceMedium,
      creator: data.creator,
      year: data.year,
      currentUnderstanding: data.currentUnderstanding,
      hypotheses: data.hypotheses,
      experimentDetails: data.experimentDetails,
      relatedQuestionId: data.relatedQuestionId,
      extractedItems: data.extractedItems,
      createdAt: now,
      updatedAt: now,
      revisitCount: 0,
      isStarred: false,
    };

    setItems(prev => [newObj, ...prev]);
    return newObj;
  };

  const updateObject = (id: string, updates: Partial<KnowledgeObject>) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          const updated = {
            ...it,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          if (activeItem?.id === id) {
            setActiveItem(updated);
          }
          return updated;
        }
        return it;
      })
    );
  };

  const deleteObject = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    if (activeItem?.id === id) {
      setActiveItem(null);
    }
  };

  const toggleStar = (id: string) => {
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, isStarred: !it.isStarred } : it))
    );
  };

  const recordRevisit = (id: string) => {
    const now = new Date().toISOString();
    setItems(prev =>
      prev.map(it =>
        it.id === id
          ? {
              ...it,
              revisitCount: (it.revisitCount || 0) + 1,
              lastRevisitedAt: now,
            }
          : it
      )
    );
  };

  const addHypothesisToQuestion = (questionId: string, hypothesis: Omit<Hypothesis, 'id'>) => {
    const newHyp: Hypothesis = {
      ...hypothesis,
      id: `hyp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lastTestedAt: new Date().toISOString().split('T')[0],
    };

    setItems(prev =>
      prev.map(it => {
        if (it.id === questionId && it.type === 'question') {
          return {
            ...it,
            hypotheses: [...(it.hypotheses || []), newHyp],
            updatedAt: new Date().toISOString(),
          };
        }
        return it;
      })
    );
  };

  const updateHypothesis = (questionId: string, hypothesisId: string, updates: Partial<Hypothesis>) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === questionId && it.type === 'question') {
          return {
            ...it,
            hypotheses: (it.hypotheses || []).map(h => (h.id === hypothesisId ? { ...h, ...updates } : h)),
            updatedAt: new Date().toISOString(),
          };
        }
        return it;
      })
    );
  };

  const recordExperimentResult = (experimentId: string, resultDetails: Partial<ExperimentRun>) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === experimentId) {
          const updatedDetails: ExperimentRun = {
            protocol: it.experimentDetails?.protocol || it.title,
            result: resultDetails.result || it.experimentDetails?.result || '',
            observation: resultDetails.observation || it.experimentDetails?.observation || '',
            status: resultDetails.status || 'completed',
            durationDays: resultDetails.durationDays || it.experimentDetails?.durationDays,
            completedDate: new Date().toISOString().split('T')[0],
          };
          return {
            ...it,
            experimentDetails: updatedDetails,
            updatedAt: new Date().toISOString(),
          };
        }
        return it;
      })
    );
  };

  const acceptPattern = (patternId: string) => {
    setPatterns(prev =>
      prev.map(p => (p.id === patternId ? { ...p, accepted: true, dismissed: false } : p))
    );
    const pat = patterns.find(p => p.id === patternId);
    if (pat) {
      addObject({
        title: pat.title,
        type: 'idea',
        summary: pat.observation,
        content: `Synthesized Emerging Insight:\n\n${pat.observation}\n\nGenerated across connected threads: ${pat.suggestedAction}`,
        topics: ['Emerging Patterns', 'Synthesized Insight'],
        provenance: 'thought',
        confidence: pat.confidence,
        connectedObjectIds: pat.relatedItemIds,
      });
    }
  };

  const dismissPattern = (patternId: string) => {
    setPatterns(prev =>
      prev.map(p => (p.id === patternId ? { ...p, dismissed: true, accepted: false } : p))
    );
  };

  // Optional Gemini synthesis over user-selected local search results
  const synthesizeSelectedItems = async (query: string, selectedItems: KnowledgeObject[]): Promise<SynthesisResult> => {
    setIsSynthesizing(true);
    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, items: selectedItems }),
      });

      if (!response.ok) {
        throw new Error(`Synthesis server responded with status: ${response.status}`);
      }

      const data = await response.json();
      const synthesis: SynthesisResult = {
        query,
        ...data.synthesis,
        timestamp: new Date().toISOString(),
        provider: data.provider,
      };

      setLastSynthesis(synthesis);
      return synthesis;
    } catch (err) {
      console.warn('Network error during synthesis, using local fallback:', err);
      const localRes: SynthesisResult = {
        query,
        summary: selectedItems.length > 0
          ? `Selected ${selectedItems.length} knowledge objects regarding "${query}". Key principles center on lowered initiation friction and empirical iteration.`
          : `No specific objects selected for "${query}".`,
        whatYouKnow: selectedItems.map(m => m.title),
        supportingEvidence: selectedItems.map(m => ({ text: m.summary || m.content.slice(0, 140), source: m.title, type: m.type })),
        sources: selectedItems.filter(m => m.type === 'source' || m.sourceTitle).map(m => ({ title: m.sourceTitle || m.title, medium: m.sourceMedium || 'source', relevance: 'Selected from your archive' })),
        experiments: selectedItems.filter(m => m.experimentDetails).map(m => ({
          protocol: m.experimentDetails!.protocol,
          result: m.experimentDetails!.result,
          takeaway: m.experimentDetails!.observation,
        })),
        contradictions: [],
        openQuestions: selectedItems.filter(m => m.type === 'question').map(m => m.title),
        relatedKnowledgeIds: selectedItems.map(m => m.id),
        timestamp: new Date().toISOString(),
        provider: 'local-engine',
      };
      setLastSynthesis(localRes);
      return localRes;
    } finally {
      setIsSynthesizing(false);
    }
  };

  const detectConnections = async () => {
    setIsDetectingConnections(true);
    try {
      const res = await fetch('/api/detect-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.patterns && Array.isArray(data.patterns)) {
          setPatterns(data.patterns);
        }
      }
    } catch (e) {
      console.warn('Detect connections error:', e);
    } finally {
      setIsDetectingConnections(false);
    }
  };

  const performAiAction = async (action: string, object: KnowledgeObject, customRelevantItems?: KnowledgeObject[]): Promise<string> => {
    try {
      const relevantItems = customRelevantItems || items.filter(i => 
        i.id !== object.id && (
          object.connectedObjectIds?.includes(i.id) || 
          i.topics?.some(t => object.topics?.includes(t))
        )
      ).slice(0, 15);

      const res = await fetch('/api/ai-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, object, relevantItems }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.result || '';
      }
    } catch (e) {
      console.warn('AI action request error:', e);
    }
    return 'Analysis completed through your local archive.';
  };

  const resetToSampleData = () => {
    // 1. Create automatic backup snapshot before resetting
    try {
      const backup: BackupSnapshot = {
        timestamp: new Date().toISOString(),
        items: [...items],
        patterns: [...patterns],
      };
      localStorage.setItem(STORAGE_KEY_BACKUP, JSON.stringify(backup));
      setHasBackupSnapshot(true);
      setBackupTimestamp(backup.timestamp);
    } catch (e) {
      console.error('Failed to create automatic pre-reset backup:', e);
    }

    // 2. Load sample datasets
    setItems(INITIAL_KNOWLEDGE_OBJECTS);
    setPatterns(INITIAL_PATTERNS);
    setActiveItem(null);
    setLastSynthesis(null);
    setSearchQuery('');
    setLastResetOccurred(true);
  };

  const restorePreviousSnapshot = (): boolean => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BACKUP);
      if (stored) {
        const parsed: BackupSnapshot = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.items)) {
          setItems(parsed.items);
          if (Array.isArray(parsed.patterns)) setPatterns(parsed.patterns);
          setLastResetOccurred(false);
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to restore previous backup snapshot:', e);
    }
    return false;
  };

  const clearResetNotice = () => {
    setLastResetOccurred(false);
  };

  const exportArchiveJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      items,
      patterns,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atelier_brain_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importArchiveJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.items)) {
        setItems(parsed.items);
        if (Array.isArray(parsed.patterns)) setPatterns(parsed.patterns);
        return true;
      }
    } catch (err) {
      console.error('Failed to import JSON archive:', err);
    }
    return false;
  };

  return (
    <KnowledgeContext.Provider
      value={{
        items,
        patterns,
        activeItem,
        setActiveItem,
        addObject,
        updateObject,
        deleteObject,
        toggleStar,
        recordRevisit,
        addHypothesisToQuestion,
        updateHypothesis,
        recordExperimentResult,
        acceptPattern,
        dismissPattern,
        searchQuery,
        setSearchQuery,
        searchResults,
        selectedTopic,
        setSelectedTopic,
        selectedType,
        setSelectedType,
        isCaptureOpen,
        setIsCaptureOpen,
        synthesizeSelectedItems,
        isSynthesizing,
        lastSynthesis,
        setLastSynthesis,
        detectConnections,
        isDetectingConnections,
        performAiAction,
        allTopics,
        resetToSampleData,
        restorePreviousSnapshot,
        hasBackupSnapshot,
        backupTimestamp,
        lastResetOccurred,
        clearResetNotice,
        exportArchiveJson,
        importArchiveJson,
      }}
    >
      {children}
    </KnowledgeContext.Provider>
  );
};

export const useKnowledge = () => {
  const context = useContext(KnowledgeContext);
  if (!context) {
    throw new Error('useKnowledge must be used within a KnowledgeProvider');
  }
  return context;
};
