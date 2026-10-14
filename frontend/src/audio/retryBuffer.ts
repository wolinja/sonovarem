/**
 * IndexedDB retry buffer (P1-04 §3.3): each recording is stored under its client_turn_id before
 * upload and deleted on server ack, cancel, sign-out and account deletion. At most 3 pending.
 * Falls back to memory when IndexedDB is unavailable (private mode, some WebViews).
 */

import type { Mode, TurnKind } from "@/api/contract"

export interface PendingTurn {
  clientTurnId: string
  conversationId: string
  mode: Mode
  kind: TurnKind
  audio?: Blob
  text?: string
  menuItemId?: string
  tAudioEndClient?: number
  createdAt: number
}

const DB_NAME = "sonovarem"
const STORE = "pending-turns"
const MAX_PENDING = 3

let dbPromise: Promise<IDBDatabase | null> | undefined
const memory = new Map<string, PendingTurn>()

function open(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null)
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: "clientTurnId" })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const retryBuffer = {
  async list(): Promise<PendingTurn[]> {
    const db = await open()
    const all = db
      ? await tx<PendingTurn[]>(db, "readonly", (s) => s.getAll())
      : [...memory.values()]
    return all.sort((a, b) => a.createdAt - b.createdAt)
  },

  async put(turn: PendingTurn): Promise<void> {
    const pending = await retryBuffer.list()
    const overflow = pending.length - (MAX_PENDING - 1)
    for (const old of pending.slice(0, Math.max(0, overflow))) {
      await retryBuffer.remove(old.clientTurnId)
    }
    const db = await open()
    if (db) await tx(db, "readwrite", (s) => s.put(turn))
    else memory.set(turn.clientTurnId, turn)
  },

  async get(clientTurnId: string): Promise<PendingTurn | undefined> {
    const db = await open()
    if (!db) return memory.get(clientTurnId)
    return tx<PendingTurn | undefined>(db, "readonly", (s) =>
      s.get(clientTurnId),
    )
  },

  async remove(clientTurnId: string): Promise<void> {
    const db = await open()
    if (db) await tx(db, "readwrite", (s) => s.delete(clientTurnId))
    memory.delete(clientTurnId)
  },

  async clear(): Promise<void> {
    const db = await open()
    if (db) await tx(db, "readwrite", (s) => s.clear())
    memory.clear()
  },
}
