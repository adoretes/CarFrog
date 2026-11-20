import type { WorldBook, WorldBookEntry } from '../types'
import { createDefaultWorldBookEntry } from '../types'
import { isPlainObject } from './charaUtils'

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
  return keys.map(k => {
    const entry = normalizeWorldBookEntry(entries[k] as Record<string, unknown>)
    // SillyTavern 的对象型 entries 用对象键存 uid；条目本身没有 uid/id 时回退到键名，
    // 否则所有条目都会变成无 id，导出后彼此“重复”。
    if (entry.id === undefined && k.trim() !== '') {
      const n = Number(k)
      if (Number.isInteger(n)) return { ...entry, id: n }
    }
    return entry
  })
}

/**
 * 让世界书条目的 id 保持唯一。
 *
 * 规则：某个 id 第一次出现时保留，之后重复出现的条目（以及原本没有 id 的条目）
 * 会被分配一个全新的、从未用过的 id。这样无论是导入单个本身就含重复 id 的文件，
 * 还是把导入条目追加到已有条目之后，都不会再出现 id 冲突。
 */
export function ensureUniqueEntryIds(entries: WorldBookEntry[]): WorldBookEntry[] {
  let next = 0
  for (const entry of entries) {
    if (typeof entry.id === 'number' && Number.isFinite(entry.id)) {
      next = Math.max(next, Math.floor(entry.id) + 1)
    }
  }
  const seen = new Set<number>()
  return entries.map(entry => {
    if (typeof entry.id === 'number' && Number.isFinite(entry.id) && !seen.has(entry.id)) {
      seen.add(entry.id)
      return entry
    }
    const id = next++
    seen.add(id)
    return { ...entry, id }
  })
}

export function entriesToArray(entries: unknown): WorldBookEntry[] {
  if (!entries) return []
  if (Array.isArray(entries)) {
    return ensureUniqueEntryIds(
      entries.map(e => normalizeWorldBookEntry(e as Record<string, unknown>)),
    )
  }
  if (typeof entries === 'object') {
    return ensureUniqueEntryIds(entriesObjectToArray(entries as Record<string, unknown>))
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

  /** 从容器里取出 character_book 并转成 WorldBook；没有则返回 null */
  const extractBook = (container: Record<string, unknown>): WorldBook | null => {
    const cb = container.character_book
    if (!isPlainObject(cb) || !cb.entries) return null
    return {
      name: typeof cb.name === 'string' ? cb.name : null,
      entries: entriesToArray(cb.entries),
      extensions: isPlainObject(cb.extensions) ? cb.extensions : undefined,
    }
  }

  // V2 / V3：有 data 包裹
  if (isPlainObject(obj.data)) {
    const wb = extractBook(obj.data)
    if (wb) return { wb, source: '角色卡' }
    return { error: '角色卡中未找到世界书数据' }
  }

  // V1 平铺角色卡或「顶层 character_book」形式的独立世界书
  const wb = extractBook(obj)
  if (wb) {
    const named = typeof obj.name === 'string' && obj.name
    return { wb, source: named ? `世界书「${obj.name}」` : '世界书' }
  }

  if (obj.entries) {
    return {
      wb: {
        name: typeof obj.name === 'string' ? obj.name : null,
        entries: entriesToArray(obj.entries),
        extensions: isPlainObject(obj.extensions) ? obj.extensions : undefined,
      },
      source: typeof obj.name === 'string' && obj.name ? `世界书「${obj.name}」` : '世界书',
    }
  }

  return { error: '无法识别的格式：未找到 entries 字段' }
}
