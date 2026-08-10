import type { SessionData, SessionMeta } from '../types/session'

const DB_NAME = 'carfrog-db'
const DB_VERSION = 1
const META_STORE = 'sessions'
const DATA_STORE = 'sessionData'

export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(DATA_STORE)) {
        db.createObjectStore(DATA_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb()
  }
  return dbPromise
}

export async function getAllMeta(): Promise<SessionMeta[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(META_STORE, 'readonly').objectStore(META_STORE).getAll()
    req.onsuccess = () => resolve((req.result as SessionMeta[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function getSessionData(id: string): Promise<SessionData | null> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(DATA_STORE, 'readonly').objectStore(DATA_STORE).get(id)
    req.onsuccess = () => resolve((req.result as SessionData | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function putMeta(meta: SessionMeta): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(META_STORE, 'readwrite').objectStore(META_STORE).put(meta)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function putSessionData(id: string, data: SessionData): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(DATA_STORE, 'readwrite').objectStore(DATA_STORE).put({ id, ...data })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function deleteSessionRecord(id: string): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, DATA_STORE], 'readwrite')
    tx.objectStore(META_STORE).delete(id)
    tx.objectStore(DATA_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
