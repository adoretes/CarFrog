import type { WorldBook, WorldBookEntry } from '../types'
import { createDefaultWorldBookEntry } from '../types'

function normalizeKey(key: unknown): string[] {
  if (Array.isArray(key)) return key as string[]
  if (typeof key === 'string') return key ? [key] : []
  return []
}

function normalizeWorldBookEntry(raw: Record<string, unknown>): WorldBookEntry {
  return createDefaultWorldBookEntry({
    keys: normalizeKey(raw.key ?? raw.keys),
    keysecondary: normalizeKey(raw.keysecondary),
    content: typeof raw.content === 'string' ? raw.content : '',
    comment: typeof raw.comment === 'string' ? raw.comment : undefined,
    constant: typeof raw.constant === 'boolean' ? raw.constant : undefined,
    selective: typeof raw.selective === 'boolean' ? raw.selective : undefined,
    selectiveLogic: typeof raw.selectiveLogic === 'number' ? raw.selectiveLogic : undefined,
    order: typeof raw.order === 'number' ? raw.order : undefined,
    position: typeof raw.position === 'string' || typeof raw.position === 'number' ? raw.position : undefined,
    depth: typeof raw.depth === 'number' ? raw.depth : undefined,
    sticky: typeof raw.sticky === 'number' ? raw.sticky : undefined,
    cooldown: typeof raw.cooldown === 'number' ? raw.cooldown : undefined,
    delay: typeof raw.delay === 'number' ? raw.delay : undefined,
    enabled: raw.disable !== undefined ? !raw.disable : undefined,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    id: typeof raw.uid === 'number' ? raw.uid : (typeof raw.id === 'number' ? raw.id : undefined),
    extensions: raw.extensions as Record<string, unknown> | undefined,
  })
}

function entriesObjectToArray(entries: Record<string, unknown>): WorldBookEntry[] {
  const keys = Object.keys(entries).sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b)
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return a.localeCompare(b)
  })
  return keys.map(k => normalizeWorldBookEntry(entries[k] as Record<string, unknown>))
}

export function entriesToArray(entries: unknown): WorldBookEntry[] {
  if (!entries) return []
  if (Array.isArray(entries)) {
    return entries.map(e => normalizeWorldBookEntry(e as Record<string, unknown>))
  }
  if (typeof entries === 'object') {
    return entriesObjectToArray(entries as Record<string, unknown>)
  }
  return []
}

export function parseWorldBookJson(text: string): { wb: WorldBook; source: string } | { error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: 'JSON 解析失败，请检查文件格式' }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { error: '无效的 JSON 格式' }
  }

  const obj = parsed as Record<string, unknown>

  if (obj.spec && obj.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>
    const cb = data.character_book as Record<string, unknown> | undefined
    if (cb && cb.entries) {
      return {
        wb: {
          name: typeof cb.name === 'string' ? cb.name : null,
          entries: entriesToArray(cb.entries),
          extensions: cb.extensions as Record<string, unknown> | undefined,
        },
        source: '角色卡',
      }
    }
    return { error: '角色卡中未找到世界书数据' }
  }

  if (obj.entries) {
    return {
      wb: {
        name: typeof obj.name === 'string' ? obj.name : null,
        entries: entriesToArray(obj.entries),
        extensions: obj.extensions as Record<string, unknown> | undefined,
      },
      source: obj.name ? `世界书「${obj.name}」` : '世界书',
    }
  }

  return { error: '无法识别的格式：未找到 entries 字段' }
}
