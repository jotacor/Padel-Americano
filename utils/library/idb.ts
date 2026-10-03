// Minimal IndexedDB access (no dependency) for the saved-tournaments library.

const DB_NAME = 'padel-americano';
const DB_VERSION = 1;
export const META = 'library-meta'; // LibraryEntry by id (small: what the list needs)
export const DATA = 'library-data'; // full Tournament by id

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DATA)) db.createObjectStore(DATA);
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked by another tab'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
};

const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export const idbGetAll = async <T>(store: string): Promise<T[]> =>
  request((await openDb()).transaction(store).objectStore(store).getAll() as IDBRequest<T[]>);

export const idbGet = async <T>(store: string, key: string): Promise<T | undefined> =>
  request((await openDb()).transaction(store).objectStore(store).get(key) as IDBRequest<T | undefined>);

/** One read-write transaction over both stores (meta and data never get out of step) */
export const idbWrite = async (fn: (meta: IDBObjectStore, data: IDBObjectStore) => void): Promise<void> => {
  const tx = (await openDb()).transaction([META, DATA], 'readwrite');
  fn(tx.objectStore(META), tx.objectStore(DATA));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
};
