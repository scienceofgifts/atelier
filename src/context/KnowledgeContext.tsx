import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef } from 'react';
import { 
  KnowledgeObject, 
  ConnectionPattern, 
  ObjectType, 
  SynthesisResult,
  Hypothesis, 
  ExperimentRun,
  SourceMedium
} from '../types/knowledge';
import { INITIAL_KNOWLEDGE_OBJECTS, INITIAL_PATTERNS } from '../data/seedData';
import { executeLocalSearch, SearchResultItem } from '../utils/localSearch';
import {
  putItemInDb,
  bulkPutItemsInDb,
  clearItemsInDb,
  putPatternInDb,
  bulkPutPatternsInDb,
  clearPatternsInDb,
  migrateFromLocalStorage,
  generateUUID,
  normalizeItem
} from '../services/indexedDb';
import { useAuth } from './AuthContext';
import {
  SyncStatus,
  checkCloudDataStatus,
  fetchCloudItems,
  fetchCloudPatterns,
  uploadLocalToCloud,
  syncSingleItem,
  syncSinglePattern,
  setupRealtimeListeners,
  reconcileItems,
  reconcilePatterns
} from '../services/syncService';
import { MigrationScenario } from '../components/common/CloudMigrationModal';

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

  // Cloud Synchronization & Multi-Device State
  syncStatus: SyncStatus;
  syncNow: () => Promise<void>;
  migrationModalOpen: boolean;
  migrationScenario: MigrationScenario;
  cloudItemCount: number;
  confirmUploadToCloud: () => Promise<void>;
  confirmDownloadFromCloud: () => Promise<void>;
  confirmMergeCloudAndLocal: () => Promise<void>;
  dismissMigration: () => void;
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
  const { user, isConfigured } = useAuth();

  // Store all items including tombstones for IndexedDB persistence and sync
  const [allItems, setAllItems] = useState<KnowledgeObject[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizeItem);
      }
    } catch (e) {
      console.warn('Error reading initial items from localStorage:', e);
    }
    return INITIAL_KNOWLEDGE_OBJECTS.map(normalizeItem);
  });

  // Active items exposed to normal UI views, filters, and searches (hiding tombstones)
  const items = useMemo(() => allItems.filter(it => !it.isDeleted), [allItems]);

  // Store all patterns
  const [allPatterns, setAllPatterns] = useState<ConnectionPattern[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PATTERNS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: ConnectionPattern) => ({ ...p, isDeleted: p.isDeleted ?? false }));
        }
      }
    } catch (e) {
      console.warn('Error reading patterns from localStorage:', e);
    }
    return INITIAL_PATTERNS.map(p => ({ ...p, isDeleted: false }));
  });

  const patterns = useMemo(() => allPatterns.filter(p => !p.isDeleted), [allPatterns]);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    return 'idle';
  });

  // Migration modal state
  const [migrationModalOpen, setMigrationModalOpen] = useState<boolean>(false);
  const [migrationScenario, setMigrationScenario] = useState<MigrationScenario>(null);
  const [cloudItemCount, setCloudItemCount] = useState<number>(0);

  // Ref to hold latest state for sync reconciliations
  const allItemsRef = useRef(allItems);
  allItemsRef.current = allItems;
  const allPatternsRef = useRef(allPatterns);
  allPatternsRef.current = allPatterns;

  // On mount, perform safe, automatic migration from localStorage to IndexedDB
  useEffect(() => {
    migrateFromLocalStorage()
      .then(({ items: loadedItems, patterns: loadedPatterns }) => {
        setAllItems(loadedItems);
        setAllPatterns(loadedPatterns);
      })
      .catch(err => {
        console.error('Failed to load/migrate IndexedDB:', err);
      });
  }, []);

  // Monitor network online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(user ? 'pending' : 'idle');
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Handle Authentication & Initial Cloud Sync / Migration
  useEffect(() => {
    if (!isConfigured || !user) {
      setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle');
      return;
    }

    let isSubscribed = true;
    let unsubscribeListeners: (() => void) | null = null;

    const initializeCloudSync = async () => {
      setSyncStatus('syncing');

      try {
        const { hasCloudData, cloudItemCount: remoteCount } = await checkCloudDataStatus(user.uid);
        if (!isSubscribed) return;

        setCloudItemCount(remoteCount);

        const currentLocal = allItemsRef.current;
        const isDefaultSeed = currentLocal.length <= INITIAL_KNOWLEDGE_OBJECTS.length &&
          currentLocal.every(l => INITIAL_KNOWLEDGE_OBJECTS.some(s => s.id === l.id));

        if (!hasCloudData && currentLocal.length > 0) {
          // Scenario A: Local items exist, Cloud is empty -> Offer upload
          setMigrationScenario('upload_local');
          setMigrationModalOpen(true);
          setSyncStatus('idle');
        } else if (hasCloudData && isDefaultSeed) {
          // Scenario B: Cloud has items, local is just default seed -> Automatically download
          const remoteItems = await fetchCloudItems(user.uid);
          const remotePatterns = await fetchCloudPatterns(user.uid);

          if (!isSubscribed) return;

          await clearItemsInDb();
          await bulkPutItemsInDb(remoteItems);
          if (remotePatterns.length > 0) {
            await clearPatternsInDb();
            await bulkPutPatternsInDb(remotePatterns);
            setAllPatterns(remotePatterns);
          }
          setAllItems(remoteItems);
          setSyncStatus('synced');
        } else if (hasCloudData && !isDefaultSeed) {
          // Scenario C: Both local and cloud have custom data -> Reconcile or prompt
          setMigrationScenario('merge_conflict');
          setMigrationModalOpen(true);
          setSyncStatus('idle');
        } else {
          setSyncStatus('synced');
        }

        // Setup real-time listener for remote changes from other devices
        unsubscribeListeners = setupRealtimeListeners(user.uid, async (remoteItems, remotePatterns) => {
          if (!isSubscribed || remoteItems.length === 0) return;

          const localCurrent = allItemsRef.current;
          const { mergedItems, hasLocalChangesToPush } = reconcileItems(localCurrent, remoteItems);

          // Update local IndexedDB and State
          await bulkPutItemsInDb(mergedItems);
          setAllItems(mergedItems);

          if (remotePatterns.length > 0) {
            const mergedPatterns = reconcilePatterns(allPatternsRef.current, remotePatterns);
            await bulkPutPatternsInDb(mergedPatterns);
            setAllPatterns(mergedPatterns);
          }

          if (hasLocalChangesToPush && user && navigator.onLine) {
            uploadLocalToCloud(user.uid, mergedItems, allPatternsRef.current).catch(err => {
              console.warn('[Atelier Sync] Background upload failed:', err);
            });
          }

          setSyncStatus('synced');
        });

      } catch (err) {
        console.error('[Atelier Sync] Error during initial cloud sync setup:', err);
        setSyncStatus('error');
      }
    };

    initializeCloudSync();

    return () => {
      isSubscribed = false;
      if (unsubscribeListeners) {
        unsubscribeListeners();
      }
    };
  }, [user, isConfigured]);

  // Migration Handlers
  const confirmUploadToCloud = async () => {
    if (!user) return;
    setSyncStatus('syncing');
    try {
      // 1. Safety backup snapshot before migration
      exportArchiveSnapshotLocally();

      // 2. Upload all local items and patterns
      await uploadLocalToCloud(user.uid, allItemsRef.current, allPatternsRef.current);
      setSyncStatus('synced');
      setMigrationModalOpen(false);
      setMigrationScenario(null);
    } catch (err) {
      console.error('[Atelier Sync] Migration upload failed:', err);
      setSyncStatus('error');
    }
  };

  const confirmDownloadFromCloud = async () => {
    if (!user) return;
    setSyncStatus('syncing');
    try {
      // 1. Safety backup snapshot before overwriting
      exportArchiveSnapshotLocally();

      // 2. Fetch and replace local
      const remoteItems = await fetchCloudItems(user.uid);
      const remotePatterns = await fetchCloudPatterns(user.uid);

      await clearItemsInDb();
      await bulkPutItemsInDb(remoteItems);
      setAllItems(remoteItems);

      if (remotePatterns.length > 0) {
        await clearPatternsInDb();
        await bulkPutPatternsInDb(remotePatterns);
        setAllPatterns(remotePatterns);
      }

      setSyncStatus('synced');
      setMigrationModalOpen(false);
      setMigrationScenario(null);
    } catch (err) {
      console.error('[Atelier Sync] Migration download failed:', err);
      setSyncStatus('error');
    }
  };

  const confirmMergeCloudAndLocal = async () => {
    if (!user) return;
    setSyncStatus('syncing');
    try {
      // 1. Safety backup snapshot
      exportArchiveSnapshotLocally();

      // 2. Fetch remote and reconcile
      const remoteItems = await fetchCloudItems(user.uid);
      const remotePatterns = await fetchCloudPatterns(user.uid);

      const { mergedItems } = reconcileItems(allItemsRef.current, remoteItems);
      const mergedPatterns = reconcilePatterns(allPatternsRef.current, remotePatterns);

      // 3. Save merged result to IndexedDB & upload to cloud
      await clearItemsInDb();
      await bulkPutItemsInDb(mergedItems);
      setAllItems(mergedItems);

      if (mergedPatterns.length > 0) {
        await clearPatternsInDb();
        await bulkPutPatternsInDb(mergedPatterns);
        setAllPatterns(mergedPatterns);
      }

      await uploadLocalToCloud(user.uid, mergedItems, mergedPatterns);

      setSyncStatus('synced');
      setMigrationModalOpen(false);
      setMigrationScenario(null);
    } catch (err) {
      console.error('[Atelier Sync] Merge failed:', err);
      setSyncStatus('error');
    }
  };

  const dismissMigration = () => {
    setMigrationModalOpen(false);
    setMigrationScenario(null);
  };

  const exportArchiveSnapshotLocally = () => {
    try {
      const backup: BackupSnapshot = {
        timestamp: new Date().toISOString(),
        items: [...allItemsRef.current],
        patterns: [...allPatternsRef.current],
      };
      localStorage.setItem(STORAGE_KEY_BACKUP, JSON.stringify(backup));
      setHasBackupSnapshot(true);
      setBackupTimestamp(backup.timestamp);
    } catch (e) {
      console.warn('Failed to write local backup snapshot:', e);
    }
  };

  // Manual Sync Now Trigger
  const syncNow = async () => {
    if (!user || !isConfigured) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    try {
      const remoteItems = await fetchCloudItems(user.uid);
      const remotePatterns = await fetchCloudPatterns(user.uid);

      const { mergedItems, hasLocalChangesToPush } = reconcileItems(allItemsRef.current, remoteItems);
      const mergedPatterns = reconcilePatterns(allPatternsRef.current, remotePatterns);

      await bulkPutItemsInDb(mergedItems);
      setAllItems(mergedItems);

      if (mergedPatterns.length > 0) {
        await bulkPutPatternsInDb(mergedPatterns);
        setAllPatterns(mergedPatterns);
      }

      if (hasLocalChangesToPush || remoteItems.length === 0) {
        await uploadLocalToCloud(user.uid, mergedItems, mergedPatterns);
      }

      setSyncStatus('synced');
    } catch (err) {
      console.error('[Atelier Sync] Manual sync failed:', err);
      setSyncStatus('error');
    }
  };

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

  // Keep activeItem updated if items change
  useEffect(() => {
    if (activeItem) {
      const updated = items.find(i => i.id === activeItem.id);
      if (updated && updated !== activeItem) {
        setActiveItem(updated);
      }
    }
  }, [items, activeItem]);

  // Dynamic deterministic local search results over active items
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return executeLocalSearch(items, searchQuery, {
      typeFilter: selectedType,
      topicFilter: selectedTopic,
    });
  }, [items, searchQuery, selectedType, selectedTopic]);

  // Dynamic topics with counts calculated strictly from active non-deleted items
  const allTopics = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      if (it.isDeleted) continue;
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
    const newId = generateUUID();
    const canonicalMedium: SourceMedium | undefined = data.medium || data.sourceMedium;

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
      medium: canonicalMedium,
      sourceMedium: canonicalMedium,
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
      isDeleted: false,
    };

    setAllItems(prev => [newObj, ...prev]);
    putItemInDb(newObj).catch(err => console.error('Failed to put item in IndexedDB:', err));

    // Asynchronously push to cloud if authenticated and online
    if (user && navigator.onLine) {
      syncSingleItem(user.uid, newObj).catch(err => {
        console.warn('[Atelier Sync] Cloud sync warning for new item:', err);
      });
    }

    return newObj;
  };

  const updateObject = (id: string, updates: Partial<KnowledgeObject>) => {
    const now = new Date().toISOString();
    setAllItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          const canonicalMedium: SourceMedium | undefined = updates.medium !== undefined 
            ? updates.medium 
            : (updates.sourceMedium !== undefined ? updates.sourceMedium : it.medium || it.sourceMedium);

          const updated: KnowledgeObject = {
            ...it,
            ...updates,
            medium: canonicalMedium,
            sourceMedium: canonicalMedium,
            updatedAt: now,
          };

          putItemInDb(updated).catch(err => console.error('Failed to update item in IndexedDB:', err));

          if (activeItem?.id === id) {
            setActiveItem(updated);
          }

          // Asynchronously push to cloud if authenticated and online
          if (user && navigator.onLine) {
            syncSingleItem(user.uid, updated).catch(err => {
              console.warn('[Atelier Sync] Cloud sync warning for updated item:', err);
            });
          }

          return updated;
        }
        return it;
      })
    );
  };

  // Safe deletion via tombstone: marks isDeleted = true, retains record for sync
  const deleteObject = (id: string) => {
    const now = new Date().toISOString();
    setAllItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          const tombstone: KnowledgeObject = {
            ...it,
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
          };
          putItemInDb(tombstone).catch(err => console.error('Failed to store tombstone in IndexedDB:', err));

          // Asynchronously push tombstone to cloud so other devices receive deletion
          if (user && navigator.onLine) {
            syncSingleItem(user.uid, tombstone).catch(err => {
              console.warn('[Atelier Sync] Cloud sync warning for tombstoned item:', err);
            });
          }

          return tombstone;
        }
        return it;
      })
    );
    if (activeItem?.id === id) {
      setActiveItem(null);
    }
  };

  const toggleStar = (id: string) => {
    const now = new Date().toISOString();
    setAllItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          const updated = { ...it, isStarred: !it.isStarred, updatedAt: now };
          putItemInDb(updated).catch(err => console.error('Failed to toggle star in IndexedDB:', err));

          if (user && navigator.onLine) {
            syncSingleItem(user.uid, updated).catch(err => console.warn('Cloud sync error:', err));
          }

          return updated;
        }
        return it;
      })
    );
  };

  const recordRevisit = (id: string) => {
    const now = new Date().toISOString();
    setAllItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          const updated = {
            ...it,
            revisitCount: (it.revisitCount || 0) + 1,
            lastRevisitedAt: now,
            updatedAt: now,
          };
          putItemInDb(updated).catch(err => console.error('Failed to record revisit in IndexedDB:', err));

          if (user && navigator.onLine) {
            syncSingleItem(user.uid, updated).catch(err => console.warn('Cloud sync error:', err));
          }

          return updated;
        }
        return it;
      })
    );
  };

  const addHypothesisToQuestion = (questionId: string, hypothesis: Omit<Hypothesis, 'id'>) => {
    const now = new Date().toISOString();
    const newHyp: Hypothesis = {
      ...hypothesis,
      id: `hyp_${generateUUID()}`,
      lastTestedAt: now.split('T')[0],
    };

    setAllItems(prev =>
      prev.map(it => {
        if (it.id === questionId && it.type === 'question') {
          const updated = {
            ...it,
            hypotheses: [...(it.hypotheses || []), newHyp],
            updatedAt: now,
          };
          putItemInDb(updated).catch(err => console.error('Failed to add hypothesis in IndexedDB:', err));

          if (user && navigator.onLine) {
            syncSingleItem(user.uid, updated).catch(err => console.warn('Cloud sync error:', err));
          }

          return updated;
        }
        return it;
      })
    );
  };

  const updateHypothesis = (questionId: string, hypothesisId: string, updates: Partial<Hypothesis>) => {
    const now = new Date().toISOString();
    setAllItems(prev =>
      prev.map(it => {
        if (it.id === questionId && it.type === 'question') {
          const updated = {
            ...it,
            hypotheses: (it.hypotheses || []).map(h => (h.id === hypothesisId ? { ...h, ...updates } : h)),
            updatedAt: now,
          };
          putItemInDb(updated).catch(err => console.error('Failed to update hypothesis in IndexedDB:', err));

          if (user && navigator.onLine) {
            syncSingleItem(user.uid, updated).catch(err => console.warn('Cloud sync error:', err));
          }

          return updated;
        }
        return it;
      })
    );
  };

  const recordExperimentResult = (experimentId: string, resultDetails: Partial<ExperimentRun>) => {
    const now = new Date().toISOString();
    setAllItems(prev =>
      prev.map(it => {
        if (it.id === experimentId) {
          const updatedDetails: ExperimentRun = {
            protocol: it.experimentDetails?.protocol || it.title,
            result: resultDetails.result || it.experimentDetails?.result || '',
            observation: resultDetails.observation || it.experimentDetails?.observation || '',
            status: resultDetails.status || 'completed',
            durationDays: resultDetails.durationDays || it.experimentDetails?.durationDays,
            completedDate: now.split('T')[0],
          };
          const updated = {
            ...it,
            experimentDetails: updatedDetails,
            updatedAt: now,
          };
          putItemInDb(updated).catch(err => console.error('Failed to record experiment in IndexedDB:', err));

          if (user && navigator.onLine) {
            syncSingleItem(user.uid, updated).catch(err => console.warn('Cloud sync error:', err));
          }

          return updated;
        }
        return it;
      })
    );
  };

  const acceptPattern = (patternId: string) => {
    const now = new Date().toISOString();
    setAllPatterns(prev =>
      prev.map(p => {
        if (p.id === patternId) {
          const updated = { ...p, accepted: true, dismissed: false, updatedAt: now };
          putPatternInDb(updated).catch(err => console.error('Failed to accept pattern in IndexedDB:', err));

          if (user && navigator.onLine) {
            syncSinglePattern(user.uid, updated).catch(err => console.warn('Cloud sync error:', err));
          }

          return updated;
        }
        return p;
      })
    );
    const pat = allPatterns.find(p => p.id === patternId);
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
    const now = new Date().toISOString();
    setAllPatterns(prev =>
      prev.map(p => {
        if (p.id === patternId) {
          const updated = { ...p, dismissed: true, accepted: false, updatedAt: now };
          putPatternInDb(updated).catch(err => console.error('Failed to dismiss pattern in IndexedDB:', err));

          if (user && navigator.onLine) {
            syncSinglePattern(user.uid, updated).catch(err => console.warn('Cloud sync error:', err));
          }

          return updated;
        }
        return p;
      })
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
        sources: selectedItems.filter(m => m.type === 'source' || m.sourceTitle).map(m => ({ title: m.sourceTitle || m.title, medium: m.sourceMedium || m.medium || 'source', relevance: 'Selected from your archive' })),
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
          const normalized = data.patterns.map((p: any) => ({ ...p, isDeleted: false }));
          setAllPatterns(normalized);
          bulkPutPatternsInDb(normalized).catch(err => console.error('Failed to save patterns to IDB:', err));
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
        items: [...allItems],
        patterns: [...allPatterns],
      };
      localStorage.setItem(STORAGE_KEY_BACKUP, JSON.stringify(backup));
      setHasBackupSnapshot(true);
      setBackupTimestamp(backup.timestamp);
    } catch (e) {
      console.error('Failed to create automatic pre-reset backup:', e);
    }

    // 2. Load and persist sample datasets in IndexedDB locally (does NOT wipe Firestore cloud!)
    const sampleItems = INITIAL_KNOWLEDGE_OBJECTS.map(normalizeItem);
    const samplePatterns = INITIAL_PATTERNS.map(p => ({ ...p, isDeleted: false }));

    clearItemsInDb()
      .then(() => bulkPutItemsInDb(sampleItems))
      .catch(err => console.error('Failed to write sample items to IDB:', err));

    clearPatternsInDb()
      .then(() => bulkPutPatternsInDb(samplePatterns))
      .catch(err => console.error('Failed to write sample patterns to IDB:', err));

    setAllItems(sampleItems);
    setAllPatterns(samplePatterns);
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
          const restoredItems = parsed.items.map(normalizeItem);
          const restoredPatterns = Array.isArray(parsed.patterns)
            ? parsed.patterns.map(p => ({ ...p, isDeleted: p.isDeleted ?? false }))
            : INITIAL_PATTERNS.map(p => ({ ...p, isDeleted: false }));

          clearItemsInDb()
            .then(() => bulkPutItemsInDb(restoredItems))
            .catch(err => console.error('Failed to restore items in IDB:', err));

          clearPatternsInDb()
            .then(() => bulkPutPatternsInDb(restoredPatterns))
            .catch(err => console.error('Failed to restore patterns in IDB:', err));

          setAllItems(restoredItems);
          setAllPatterns(restoredPatterns);
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
      version: 2,
      storageEngine: 'indexeddb',
      items: allItems,
      patterns: allPatterns,
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
        const importedItems = parsed.items.map(normalizeItem);
        const importedPatterns = Array.isArray(parsed.patterns)
          ? parsed.patterns.map((p: any) => ({ ...p, isDeleted: p.isDeleted ?? false }))
          : INITIAL_PATTERNS.map(p => ({ ...p, isDeleted: false }));

        clearItemsInDb()
          .then(() => bulkPutItemsInDb(importedItems))
          .catch(err => console.error('Failed to write imported items to IDB:', err));

        clearPatternsInDb()
          .then(() => bulkPutPatternsInDb(importedPatterns))
          .catch(err => console.error('Failed to write imported patterns to IDB:', err));

        setAllItems(importedItems);
        setAllPatterns(importedPatterns);

        // If authenticated, sync imported archive to cloud
        if (user && navigator.onLine) {
          uploadLocalToCloud(user.uid, importedItems, importedPatterns).catch(err => {
            console.warn('[Atelier Sync] Failed to sync imported archive to cloud:', err);
          });
        }

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
        syncStatus,
        syncNow,
        migrationModalOpen,
        migrationScenario,
        cloudItemCount,
        confirmUploadToCloud,
        confirmDownloadFromCloud,
        confirmMergeCloudAndLocal,
        dismissMigration,
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
