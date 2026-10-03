const DB_NAME = 'bbs-erp-resource-cache'
const STORE_NAME = 'resources'

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const database = await openDatabase()
  if (!database) return null
  return new Promise((resolve) => {
    try {
      const request = run(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function saveLocal(key: string | null, data: unknown): Promise<void> {
  if (!key) return
  await withStore('readwrite', (store) => store.put(JSON.stringify(data), key))
}

export async function getLocal<T = unknown>(key: string | null): Promise<T | null> {
  if (!key) return null
  const stored = await withStore<string | undefined>('readonly', (store) => store.get(key))
  if (!stored) return null
  try {
    return JSON.parse(stored) as T
  } catch {
    return null
  }
}

export async function deleteLocal(key: string | null): Promise<void> {
  if (!key) return
  await withStore('readwrite', (store) => store.delete(key))
}
