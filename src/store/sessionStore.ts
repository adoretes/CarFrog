import { create } from 'zustand'
import { useChatStore } from './chatStore'
import { useCharaStore } from './charaStore'
import {
  getAllMeta,
  getSessionData,
  putMeta,
  putSessionData,
  deleteSessionRecord,
  generateId,
} from '../utils/idb'
import { migrateLegacyData } from '../utils/migrate'
import { createEmptyCharaCard } from '../types'
import { ensureCharaCard } from '../utils/charaUtils'
import type { SessionData, SessionMeta } from '../types/session'

const ACTIVE_KEY = 'carfrog-active-session'
const SAVE_DEBOUNCE_MS = 250
export const TITLE_MAX_LEN = 30

interface SessionState {
  sessions: SessionMeta[]
  activeId: string | null
  hydrated: boolean
  init: () => Promise<void>
  createSession: () => Promise<void>
  switchSession: (id: string) => Promise<void>
  renameSession: (id: string, title: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  clearSessions: () => Promise<void>
}

function emptySessionData(): SessionData {
  return {
    messages: [],
    mode: 'brainstorm',
    card: createEmptyCharaCard(),
    avatar: null,
    pendingRegenerate: null,
  }
}

let suppressSave = false
let dirty = false

function applySessionToStores(data: SessionData): void {
  const mode = data.mode === 'generating' ? 'brainstorm' : data.mode
  suppressSave = true
  useChatStore.setState({
    messages: data.messages,
    mode,
    pendingRegenerate: data.pendingRegenerate,
  })
  useCharaStore.setState({
    card: ensureCharaCard(data.card),
    avatar: data.avatar,
  })
  suppressSave = false
}

function resetActiveStores(): void {
  suppressSave = true
  useChatStore.getState().resetChat()
  useCharaStore.getState().resetCard()
  suppressSave = false
}

let saveTimer: number | undefined
let switchToken = 0

async function persistActive(): Promise<void> {
  const { activeId, sessions, hydrated } = useSessionStore.getState()
  if (!hydrated || !activeId) return
  const meta = sessions.find((m) => m.id === activeId)
  if (!meta) return

  const chat = useChatStore.getState()
  const chara = useCharaStore.getState()
  const now = Date.now()
  const wasDirty = dirty
  dirty = false

  const firstUser = chat.messages.find((m) => m.role === 'user')
  const title = meta.title
    ? meta.title
    : firstUser
      ? firstUser.content.replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX_LEN)
      : ''

  const newMeta: SessionMeta = wasDirty
    ? { ...meta, title, updatedAt: now }
    : { ...meta, title }
  if (newMeta.title !== meta.title || newMeta.updatedAt !== meta.updatedAt) {
    useSessionStore.setState((state) => ({
      sessions: state.sessions.map((m) => (m.id === activeId ? newMeta : m)),
    }))
  }

  await Promise.all([
    putMeta(newMeta),
    putSessionData(activeId, {
      messages: chat.messages,
      mode: chat.mode,
      card: chara.card,
      avatar: chara.avatar,
      pendingRegenerate: chat.pendingRegenerate,
    }),
  ])
}

function scheduleSave(): void {
  const { hydrated, activeId } = useSessionStore.getState()
  if (!hydrated || !activeId) return
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer)
  }
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined
    void persistActive()
  }, SAVE_DEBOUNCE_MS)
}

export function flushSave(): Promise<void> {
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer)
    saveTimer = undefined
  }
  return persistActive()
}

useChatStore.subscribe((state, prev) => {
  if (suppressSave) return
  if (
    state.messages === prev.messages &&
    state.mode === prev.mode &&
    state.pendingRegenerate === prev.pendingRegenerate
  ) {
    return
  }
  dirty = true
  scheduleSave()
})

useCharaStore.subscribe((state, prev) => {
  if (suppressSave) return
  if (state.card === prev.card && state.avatar === prev.avatar) return
  dirty = true
  scheduleSave()
})

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    void flushSave()
  })
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeId: null,
  hydrated: false,

  init: async () => {
    await migrateLegacyData()
    let metas = (await getAllMeta()).sort((a, b) => b.updatedAt - a.updatedAt)

    let activeId = localStorage.getItem(ACTIVE_KEY)
    if (!activeId || !metas.some((m) => m.id === activeId)) {
      activeId = metas[0]?.id ?? null
    }

    if (activeId) {
      const data = await getSessionData(activeId)
      applySessionToStores(data ?? emptySessionData())
      localStorage.setItem(ACTIVE_KEY, activeId)
    } else {
      const id = generateId()
      const now = Date.now()
      const meta: SessionMeta = { id, title: '', createdAt: now, updatedAt: now }
      await putMeta(meta)
      await putSessionData(id, emptySessionData())
      metas = [meta]
      activeId = id
      localStorage.setItem(ACTIVE_KEY, id)
    }

    set({ sessions: metas, activeId, hydrated: true })
  },

  createSession: async () => {
    await flushSave()
    const id = generateId()
    const now = Date.now()
    const meta: SessionMeta = { id, title: '', createdAt: now, updatedAt: now }
    await putMeta(meta)
    await putSessionData(id, emptySessionData())
    resetActiveStores()
    set((state) => ({ sessions: [meta, ...state.sessions], activeId: id }))
    localStorage.setItem(ACTIVE_KEY, id)
  },

  switchSession: async (id) => {
    const { activeId, sessions } = get()
    if (id === activeId || !sessions.some((m) => m.id === id)) return
    const token = ++switchToken
    await flushSave()
    const data = await getSessionData(id)
    if (token !== switchToken) return
    applySessionToStores(data ?? emptySessionData())
    set({ activeId: id })
    localStorage.setItem(ACTIVE_KEY, id)
  },

  renameSession: async (id, title) => {
    const trimmed = title.trim().slice(0, TITLE_MAX_LEN)
    const sessions = get().sessions.map((m) =>
      m.id === id ? { ...m, title: trimmed } : m,
    )
    set({ sessions })
    const meta = sessions.find((m) => m.id === id)
    if (meta) {
      await putMeta(meta)
    }
  },

  deleteSession: async (id) => {
    ++switchToken
    await flushSave()
    await deleteSessionRecord(id)
    const sessions = get().sessions.filter((m) => m.id !== id)
    set({ sessions })

    if (get().activeId !== id) return

    let activeId: string
    if (sessions.length > 0) {
      activeId = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0].id
      const data = await getSessionData(activeId)
      applySessionToStores(data ?? emptySessionData())
    } else {
      activeId = generateId()
      const now = Date.now()
      const meta: SessionMeta = { id: activeId, title: '', createdAt: now, updatedAt: now }
      await putMeta(meta)
      await putSessionData(activeId, emptySessionData())
      resetActiveStores()
      sessions.unshift(meta)
    }

    set({ sessions, activeId })
    localStorage.setItem(ACTIVE_KEY, activeId)
  },

  clearSessions: async () => {
    ++switchToken
    await flushSave()
    const oldIds = get().sessions.map((s) => s.id)
    await Promise.all(oldIds.map((id) => deleteSessionRecord(id)))
    const id = generateId()
    const now = Date.now()
    const meta: SessionMeta = { id, title: '', createdAt: now, updatedAt: now }
    await putMeta(meta)
    await putSessionData(id, emptySessionData())
    resetActiveStores()
    set({ sessions: [meta], activeId: id })
    localStorage.setItem(ACTIVE_KEY, id)
  },
}))
