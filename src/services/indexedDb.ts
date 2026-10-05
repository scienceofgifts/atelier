import { KnowledgeObject, ConnectionPattern, SourceMedium } from '../types/knowledge';
import { INITIAL_KNOWLEDGE_OBJECTS, INITIAL_PATTERNS } from '../data/seedData';

const DB_NAME = 'atelier_brain_db';
const DB_VERSION = 1;
const STORE_ITEMS = 'items';
const STORE_PATTERNS = 'patterns';
const STORE_META = 'meta';

const STORAGE_KEY_ITEMS = 'atelier_brain_items_v1';
const STORAGE_KEY_PATTERNS = 'atelier_brain_patterns_v1';
const STORAGE_KEY_MIGRATION_FLAG = 'atelier_migrated_to_idb_v1';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Generates a collision-resistant UUID v4.
 * Uses crypto.randomUUID() where supported by modern browsers, with a standard fallback.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Normalizes an item to ensure the canonical medium is preserved,
 * sourceMedium is mirrored for backward compatibility, and tombstone flags exist.
 */
export function normalizeItem(item: KnowledgeObject): KnowledgeObject {
  const canonicalMedium: SourceMedium | undefined = item.medium || item.sourceMedium;

  return {
    ...item,
    medium: canonicalMedium,
    sourceMedium: canonicalMedium,
    isDeleted: item.isDeleted ?? false,
    deletedAt: item.deletedAt,
    topics: Array.isArray(item.topics) ? item.topics : [],
    connectedObjectIds: Array.isArray(item.connectedObjectIds) ? item.connectedObjectIds : [],
  };
}

/**
 * Initializes and opens the IndexedDB database.
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Items store
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const itemStore = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
        itemStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        itemStore.createIndex('type', 'type', { unique: false });
        itemStore.createIndex('isDeleted', 'isDeleted', { unique: false });
      }

      // 2. Patterns store
      if (!db.objectStoreNames.contains(STORE_PATTERNS)) {
        db.createObjectStore(STORE_PATTERNS, { keyPath: 'id' });
      }

      // 3. Metadata store
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB database'));
    };
  });

  return dbPromise;
}

/**
 * Retrieves all knowledge objects from IndexedDB.
 */
export async function getAllItemsFromDb(): Promise<KnowledgeObject[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readonly');
    const store = tx.objectStore(STORE_ITEMS);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = (request.result || []) as KnowledgeObject[];
      resolve(results.map(normalizeItem));
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to fetch items from IndexedDB'));
    };
  });
}

/**
 * Puts or updates a single item in IndexedDB.
 */
export async function putItemInDb(item: KnowledgeObject): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);
    const normalized = normalizeItem(item);
    const request = store.put(normalized);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to put item in IndexedDB'));
  });
}

/**
 * Bulk writes items into IndexedDB using a single transaction.
 */
export async function bulkPutItemsInDb(items: KnowledgeObject[]): Promise<void> {
  if (items.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);

    for (const item of items) {
      store.put(normalizeItem(item));
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to bulk write items into IndexedDB'));
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted during bulk write'));
  });
}

/**
 * Permanently removes an item from IndexedDB (used only for hard cleanup or resets).
 */
export async function deleteItemFromDb(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to delete item from IndexedDB'));
  });
}

/**
 * Clears all items in IndexedDB.
 */
export async function clearItemsInDb(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to clear items from IndexedDB'));
  });
}

/**
 * Retrieves all connection patterns from IndexedDB.
 */
export async function getAllPatternsFromDb(): Promise<ConnectionPattern[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PATTERNS, 'readonly');
    const store = tx.objectStore(STORE_PATTERNS);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result || []) as ConnectionPattern[]);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to fetch patterns from IndexedDB'));
    };
  });
}

/**
 * Puts or updates a single pattern in IndexedDB.
 */
export async function putPatternInDb(pattern: ConnectionPattern): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PATTERNS, 'readwrite');
    const store = tx.objectStore(STORE_PATTERNS);
    const request = store.put(pattern);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to put pattern in IndexedDB'));
  });
}

/**
 * Bulk writes patterns into IndexedDB.
 */
export async function bulkPutPatternsInDb(patterns: ConnectionPattern[]): Promise<void> {
  if (patterns.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PATTERNS, 'readwrite');
    const store = tx.objectStore(STORE_PATTERNS);

    for (const pat of patterns) {
      store.put(pat);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to bulk write patterns into IndexedDB'));
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted during bulk pattern write'));
  });
}

/**
 * Clears all patterns in IndexedDB.
 */
export async function clearPatternsInDb(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PATTERNS, 'readwrite');
    const store = tx.objectStore(STORE_PATTERNS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to clear patterns in IndexedDB'));
  });
}

/**
 * Sets a metadata key-value record in IndexedDB.
 */
export async function setMetaInDb(key: string, value: any): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readwrite');
    const store = tx.objectStore(STORE_META);
    const request = store.put({ key, value, updatedAt: new Date().toISOString() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to set meta in IndexedDB'));
  });
}

/**
 * Safe, defensive migration from localStorage to IndexedDB.
 *
 * Requirements:
 * 1. Automatically migrates on first run.
 * 2. Does NOT delete localStorage data until migration is verified.
 * 3. If migration fails, preserves original localStorage data.
 * 4. Normalizes source mediums and marks isDeleted: false if unset.
 */
export async function migrateFromLocalStorage(): Promise<{
  items: KnowledgeObject[];
  patterns: ConnectionPattern[];
  migrated: boolean;
}> {
  try {
    await openDatabase();

    // 1. Check if IndexedDB already has records
    const existingIdbItems = await getAllItemsFromDb();
    const existingIdbPatterns = await getAllPatternsFromDb();

    if (existingIdbItems.length > 0) {
      return {
        items: existingIdbItems,
        patterns: existingIdbPatterns.length > 0 ? existingIdbPatterns : INITIAL_PATTERNS,
        migrated: false,
      };
    }

    // 2. IndexedDB is empty, check localStorage
    const storedItemsJson = localStorage.getItem(STORAGE_KEY_ITEMS);
    const storedPatternsJson = localStorage.getItem(STORAGE_KEY_PATTERNS);

    let itemsToMigrate: KnowledgeObject[] = [];
    let patternsToMigrate: ConnectionPattern[] = [];
    let source = 'seedData';

    if (storedItemsJson) {
      try {
        const parsed = JSON.parse(storedItemsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          itemsToMigrate = parsed;
          source = 'localStorage';
        }
      } catch (e) {
        console.warn('Failed to parse localStorage items during migration:', e);
      }
    }

    if (storedPatternsJson) {
      try {
        const parsed = JSON.parse(storedPatternsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          patternsToMigrate = parsed;
        }
      } catch (e) {
        console.warn('Failed to parse localStorage patterns during migration:', e);
      }
    }

    // If no existing data in localStorage, use seed datasets
    if (itemsToMigrate.length === 0) {
      itemsToMigrate = INITIAL_KNOWLEDGE_OBJECTS;
    }
    if (patternsToMigrate.length === 0) {
      patternsToMigrate = INITIAL_PATTERNS;
    }

    // Normalize all items (canonical medium, isDeleted flags)
    const normalizedItems = itemsToMigrate.map(normalizeItem);
    const normalizedPatterns = patternsToMigrate.map(p => ({
      ...p,
      isDeleted: p.isDeleted ?? false,
    }));

    // 3. Write into IndexedDB
    await bulkPutItemsInDb(normalizedItems);
    await bulkPutPatternsInDb(normalizedPatterns);

    // 4. Verify data was successfully written
    const verifiedItems = await getAllItemsFromDb();
    if (verifiedItems.length >= normalizedItems.length) {
      // Record migration completion metadata
      await setMetaInDb('migration_info', {
        migratedAt: new Date().toISOString(),
        source,
        itemCount: verifiedItems.length,
        version: 1,
      });

      // Mark migration flag in localStorage without deleting raw items immediately
      // This preserves the original data while indicating migration has succeeded
      localStorage.setItem(STORAGE_KEY_MIGRATION_FLAG, new Date().toISOString());

      return {
        items: verifiedItems,
        patterns: normalizedPatterns,
        migrated: true,
      };
    } else {
      throw new Error(`Verification mismatch: expected ${normalizedItems.length} items, found ${verifiedItems.length}`);
    }
  } catch (error) {
    console.error('IndexedDB migration encountered an error; preserving localStorage:', error);

    // Fallback in-memory read from localStorage or seedData
    let fallbackItems = INITIAL_KNOWLEDGE_OBJECTS;
    let fallbackPatterns = INITIAL_PATTERNS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          fallbackItems = parsed;
        }
      }
    } catch {}

    return {
      items: fallbackItems.map(normalizeItem),
      patterns: fallbackPatterns,
      migrated: false,
    };
  }
}
