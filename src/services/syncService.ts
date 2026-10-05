import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  writeBatch, 
  onSnapshot, 
  query, 
  limit,
  Unsubscribe 
} from 'firebase/firestore';
import { getDbInstance, isConfigured } from './firebase';
import { KnowledgeObject, ConnectionPattern } from '../types/knowledge';
import { normalizeItem } from './indexedDb';

export type SyncStatus = 'offline' | 'idle' | 'syncing' | 'synced' | 'pending' | 'error';

/**
 * Sanitizes an object for Firestore by deeply removing any `undefined` values.
 * Firestore strictly rejects documents containing `undefined` properties.
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Wraps a promise with a timeout to prevent indefinite hanging.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000, operationName: string = 'Operation'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs / 1000}s.`)), timeoutMs)
    ),
  ]);
}

/**
 * Checks if the user's Firestore cloud collection contains any knowledge items.
 */
export async function checkCloudDataStatus(userId: string): Promise<{ hasCloudData: boolean; cloudItemCount: number; error?: string }> {
  const db = getDbInstance();
  if (!isConfigured() || !db || !userId) {
    return { hasCloudData: false, cloudItemCount: 0 };
  }

  try {
    const itemsRef = collection(db, 'users', userId, 'items');
    const snap = await withTimeout(getDocs(query(itemsRef, limit(1))), 8000, 'Check cloud items query');
    if (snap.empty) {
      return { hasCloudData: false, cloudItemCount: 0 };
    }
    // Fetch count
    const fullSnap = await withTimeout(getDocs(itemsRef), 8000, 'Fetch cloud items count');
    return { hasCloudData: true, cloudItemCount: fullSnap.size };
  } catch (error: any) {
    console.warn('[Atelier Sync] Error checking cloud data status:', error?.message || error);
    return { hasCloudData: false, cloudItemCount: 0, error: error?.message || String(error) };
  }
}

/**
 * Fetches all knowledge objects from the user's Firestore items subcollection.
 */
export async function fetchCloudItems(userId: string): Promise<KnowledgeObject[]> {
  const db = getDbInstance();
  if (!isConfigured() || !db || !userId) return [];

  try {
    const itemsRef = collection(db, 'users', userId, 'items');
    const snap = await withTimeout(getDocs(itemsRef), 10000, 'Fetch cloud items');
    const items: KnowledgeObject[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data() as KnowledgeObject;
      items.push(normalizeItem(data));
    });
    return items;
  } catch (error) {
    console.error('[Atelier Sync] Failed to fetch cloud items:', error);
    throw error;
  }
}

/**
 * Fetches all connection patterns from the user's Firestore patterns subcollection.
 */
export async function fetchCloudPatterns(userId: string): Promise<ConnectionPattern[]> {
  const db = getDbInstance();
  if (!isConfigured() || !db || !userId) return [];

  try {
    const patternsRef = collection(db, 'users', userId, 'patterns');
    const snap = await withTimeout(getDocs(patternsRef), 10000, 'Fetch cloud patterns');
    const patterns: ConnectionPattern[] = [];
    snap.forEach(docSnap => {
      patterns.push(docSnap.data() as ConnectionPattern);
    });
    return patterns;
  } catch (error) {
    console.error('[Atelier Sync] Failed to fetch cloud patterns:', error);
    return [];
  }
}

/**
 * Uploads a collection of local items and patterns to Firestore using chunked batch writes.
 * Respects Firestore's 500 operations per batch limit and sanitizes all undefined fields.
 */
export async function uploadLocalToCloud(
  userId: string,
  items: KnowledgeObject[],
  patterns: ConnectionPattern[]
): Promise<void> {
  const db = getDbInstance();
  if (!isConfigured() || !db || !userId) {
    throw new Error('Firebase Firestore is not initialized or user is not authenticated.');
  }

  const CHUNK_SIZE = 400;

  // 1. Batch upload items
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const normalized = normalizeItem(item);
      const sanitized = sanitizeForFirestore(normalized);
      const docRef = doc(db, 'users', userId, 'items', item.id);
      batch.set(docRef, sanitized, { merge: true });
    }

    await withTimeout(batch.commit(), 12000, 'Upload items batch');
  }

  // 2. Batch upload patterns
  if (patterns.length > 0) {
    for (let i = 0; i < patterns.length; i += CHUNK_SIZE) {
      const chunk = patterns.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const pat of chunk) {
        const sanitizedPat = sanitizeForFirestore(pat);
        const docRef = doc(db, 'users', userId, 'patterns', pat.id);
        batch.set(docRef, sanitizedPat, { merge: true });
      }

      await withTimeout(batch.commit(), 12000, 'Upload patterns batch');
    }
  }

  // 3. Set sync metadata
  try {
    const metaRef = doc(db, 'users', userId, 'meta', 'syncInfo');
    await withTimeout(
      setDoc(metaRef, sanitizeForFirestore({
        lastSyncedAt: new Date().toISOString(),
        itemCount: items.length,
        patternCount: patterns.length,
        version: 1,
      }), { merge: true }),
      8000,
      'Update sync metadata'
    );
  } catch (err) {
    console.warn('[Atelier Sync] Failed to update syncInfo meta doc:', err);
  }
}

/**
 * Asynchronously synchronizes a single item to Firestore.
 */
export async function syncSingleItem(userId: string, item: KnowledgeObject): Promise<void> {
  const db = getDbInstance();
  if (!isConfigured() || !db || !userId) return;

  try {
    const docRef = doc(db, 'users', userId, 'items', item.id);
    const sanitized = sanitizeForFirestore(normalizeItem(item));
    await withTimeout(setDoc(docRef, sanitized, { merge: true }), 8000, 'Sync single item');
  } catch (error) {
    console.error(`[Atelier Sync] Failed to sync item ${item.id}:`, error);
    throw error;
  }
}

/**
 * Asynchronously synchronizes a single connection pattern to Firestore.
 */
export async function syncSinglePattern(userId: string, pattern: ConnectionPattern): Promise<void> {
  const db = getDbInstance();
  if (!isConfigured() || !db || !userId) return;

  try {
    const docRef = doc(db, 'users', userId, 'patterns', pattern.id);
    const sanitized = sanitizeForFirestore(pattern);
    await withTimeout(setDoc(docRef, sanitized, { merge: true }), 8000, 'Sync single pattern');
  } catch (error) {
    console.error(`[Atelier Sync] Failed to sync pattern ${pattern.id}:`, error);
    throw error;
  }
}

/**
 * Merges local and remote items using Last-Write-Wins based on updatedAt.
 * Respects tombstones (isDeleted).
 */
export function reconcileItems(localItems: KnowledgeObject[], remoteItems: KnowledgeObject[]): {
  mergedItems: KnowledgeObject[];
  hasLocalChangesToPush: boolean;
} {
  const map = new Map<string, KnowledgeObject>();
  let hasLocalChangesToPush = false;

  // Seed with local items
  for (const item of localItems) {
    map.set(item.id, item);
  }

  // Merge remote items
  for (const remote of remoteItems) {
    const local = map.get(remote.id);

    if (!local) {
      // Item only exists on remote
      map.set(remote.id, remote);
    } else {
      // Both exist: compare timestamps
      const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
      const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();

      if (remoteTime > localTime) {
        // Remote is newer, take remote
        map.set(remote.id, remote);
      } else if (localTime > remoteTime) {
        // Local is newer, keep local and mark that we have changes to push
        hasLocalChangesToPush = true;
      }
    }
  }

  const mergedItems = Array.from(map.values()).sort((a, b) => {
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });

  return { mergedItems, hasLocalChangesToPush };
}

/**
 * Merges local and remote patterns.
 */
export function reconcilePatterns(localPatterns: ConnectionPattern[], remotePatterns: ConnectionPattern[]): ConnectionPattern[] {
  const map = new Map<string, ConnectionPattern>();
  for (const p of localPatterns) map.set(p.id, p);
  for (const r of remotePatterns) {
    if (!map.has(r.id)) {
      map.set(r.id, r);
    } else {
      const local = map.get(r.id)!;
      // Accept remote if accepted/dismissed differs
      map.set(r.id, {
        ...local,
        accepted: r.accepted ?? local.accepted,
        dismissed: r.dismissed ?? local.dismissed,
        isDeleted: r.isDeleted ?? local.isDeleted,
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Sets up real-time Firestore listeners for items and patterns.
 * Invokes onRemoteChange when changes arrive from other devices.
 */
export function setupRealtimeListeners(
  userId: string,
  onRemoteChange: (remoteItems: KnowledgeObject[], remotePatterns: ConnectionPattern[]) => void
): () => void {
  const db = getDbInstance();
  if (!isConfigured() || !db || !userId) {
    return () => {};
  }

  const unsubscribers: Unsubscribe[] = [];
  let currentRemoteItems: KnowledgeObject[] = [];
  let currentRemotePatterns: ConnectionPattern[] = [];

  try {
    const itemsRef = collection(db, 'users', userId, 'items');
    const itemsUnsub = onSnapshot(itemsRef, snapshot => {
      const items: KnowledgeObject[] = [];
      snapshot.forEach(docSnap => {
        items.push(normalizeItem(docSnap.data() as KnowledgeObject));
      });
      currentRemoteItems = items;
      onRemoteChange(currentRemoteItems, currentRemotePatterns);
    }, err => {
      console.warn('[Atelier Sync] Items listener warning:', err);
    });

    unsubscribers.push(itemsUnsub);

    const patternsRef = collection(db, 'users', userId, 'patterns');
    const patternsUnsub = onSnapshot(patternsRef, snapshot => {
      const patterns: ConnectionPattern[] = [];
      snapshot.forEach(docSnap => {
        patterns.push(docSnap.data() as ConnectionPattern);
      });
      currentRemotePatterns = patterns;
      onRemoteChange(currentRemoteItems, currentRemotePatterns);
    }, err => {
      console.warn('[Atelier Sync] Patterns listener warning:', err);
    });

    unsubscribers.push(patternsUnsub);
  } catch (err) {
    console.error('[Atelier Sync] Failed to setup realtime listeners:', err);
  }

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}
