// Tiny IndexedDB wrapper for the offline outbox.
// Stores writes that happen while offline so they can be synced later.

const DB_NAME = "lifestack-offline";
const DB_VERSION = 1;
const STORE = "outbox";

export type OutboxKind = "planner_block" | "workout_log" | "meal_log";

export type OutboxItem = {
  id?: number;
  kind: OutboxKind;
  user_id: string;
  payload: any;
  created_at: number;
  synced: boolean;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("synced", "synced");
        store.createIndex("kind", "kind");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(item: Omit<OutboxItem, "id" | "created_at" | "synced">) {
  const db = await openDb();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add({ ...item, created_at: Date.now(), synced: false });
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getPending(): Promise<OutboxItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as OutboxItem[]).filter((i) => !i.synced));
    req.onerror = () => reject(req.error);
  });
}

export async function markSynced(id: number) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.synced = true;
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteSynced() {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.getAllKeys();
    req.onsuccess = async () => {
      const keys = req.result as number[];
      for (const k of keys) {
        const item = await new Promise<any>((res) => {
          const r = store.get(k);
          r.onsuccess = () => res(r.result);
        });
        if (item?.synced) store.delete(k);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

// Lightweight cached-profile store (single key) for offline profile view
const CACHE_KEY = "lifestack:cached-profile";
export function cacheProfile(profile: any) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(profile)); } catch {}
}
export function readCachedProfile(): any | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}