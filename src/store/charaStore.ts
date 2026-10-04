import { create } from 'zustand'
import { createEmptyCharaCard, type CharaCard, type WorldBook } from '../types'
import type {
  ActionFailReason,
  ActionReport,
  ActionReportItem,
  CharaAction,
  PatchAction,
  PatchOp,
  ReplaceAction,
} from '../types/actions'
import { ensureCharaCard } from '../utils/charaUtils'

interface ActionResult {
  card: CharaCard
  item: ActionReportItem
}

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    if (typeof current === 'object') {
      const arrMatch = key.match(/^(\w+)\[(\d+)\]$/)
      if (arrMatch) {
        current = (current as Record<string, unknown>)[arrMatch[1]]
        if (Array.isArray(current)) {
          current = current[parseInt(arrMatch[2])]
        } else {
          return undefined
        }
      } else {
        current = (current as Record<string, unknown>)[key]
      }
    } else {
      return undefined
    }
  }
  return current
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const arrMatch = key.match(/^(\w+)\[(\d+)\]$/)
    if (arrMatch) {
      const arr = current[arrMatch[1]]
      if (Array.isArray(arr)) {
        current = arr[parseInt(arrMatch[2])] as Record<string, unknown>
      } else {
        return
      }
    } else {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key] as Record<string, unknown>
    }
  }
  const lastKey = keys[keys.length - 1]
  const lastArrMatch = lastKey.match(/^(\w+)\[(\d+)\]$/)
  if (lastArrMatch) {
    const arr = current[lastArrMatch[1]]
    if (Array.isArray(arr)) {
      arr[parseInt(lastArrMatch[2])] = value
    }
  } else {
    current[lastKey] = value as never
  }
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle === '') return 0
  let count = 0
  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at === -1) return count
    count++
    from = at + needle.length
  }
}

/**
 * 字面量替换：刻意不用 String.prototype.replace(str, str)，
 * 否则 replacement 里的 `$&`、`$'`、`$1` 会被当成替换模式，静默篡改卡片内容。
 */
function replaceLiteral(
  haystack: string,
  needle: string,
  replacement: string,
  all: boolean,
): { text: string; replaced: number } {
  const parts: string[] = []
  let from = 0
  let replaced = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at === -1) break
    parts.push(haystack.slice(from, at), replacement)
    from = at + needle.length
    replaced++
    if (!all) break
  }
  if (replaced === 0) return { text: haystack, replaced: 0 }
  parts.push(haystack.slice(from))
  return { text: parts.join(''), replaced }
}

/** 文本型指令只接受字符串/数字/布尔，其他（含缺失）视为非法 */
function coerceText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

type TargetResult = { ok: true; value: string } | { ok: false; reason: ActionFailReason }

function resolveStringTarget(card: CharaCard, path: string, index?: number): TargetResult {
  const node = getNestedValue(card, path)

  if (index === undefined) {
    return typeof node === 'string' ? { ok: true, value: node } : { ok: false, reason: 'not_string' }
  }
  if (!Array.isArray(node)) return { ok: false, reason: 'bad_index' }
  if (!Number.isInteger(index) || index < 0 || index >= node.length) {
    return { ok: false, reason: 'bad_index' }
  }
  const element = node[index]
  return typeof element === 'string' ? { ok: true, value: element } : { ok: false, reason: 'not_string' }
}

function writeStringTarget(card: CharaCard, path: string, index: number | undefined, value: string): void {
  if (index === undefined) {
    setNestedValue(card as unknown as Record<string, unknown>, path, value)
    return
  }
  const arr = getNestedValue(card, path)
  if (Array.isArray(arr)) arr[index] = value
}

function executeSet(state: CharaCard, path: string, value: unknown, index?: number): ActionResult {
  const base = { type: 'set', path, index }
  const newCard = structuredClone(state)
  if (index !== undefined) {
    const arr = getNestedValue(newCard, path)
    if (!Array.isArray(arr) || !Number.isInteger(index) || index < 0 || index >= arr.length) {
      return { card: state, item: { ...base, ok: false, reason: 'bad_index' } }
    }
    arr[index] = value
  } else {
    setNestedValue(newCard as unknown as Record<string, unknown>, path, value)
  }
  return { card: newCard, item: { ...base, ok: true } }
}

function ensureWorldBook(card: CharaCard): WorldBook {
  if (!card.data.character_book) {
    card.data.character_book = { name: card.data.name || null, entries: [], extensions: {} }
  } else if (!('name' in card.data.character_book)) {
    card.data.character_book.name = card.data.name || null
  }
  return card.data.character_book
}

function executeAdd(state: CharaCard, path: string, value: unknown): ActionResult {
  const base = { type: 'add', path }
  const newCard = structuredClone(state)
  if (path === 'data.character_book.entries') {
    ensureWorldBook(newCard).entries.push(value as never)
    return { card: newCard, item: { ...base, ok: true } }
  }
  const arr = getNestedValue(newCard, path)
  if (!Array.isArray(arr)) {
    return { card: state, item: { ...base, ok: false, reason: 'bad_path' } }
  }
  arr.push(value)
  return { card: newCard, item: { ...base, ok: true } }
}

function executeRemove(state: CharaCard, path: string, index: number): ActionResult {
  const base = { type: 'remove', path, index }
  const newCard = structuredClone(state)
  const arr = getNestedValue(newCard, path)
  if (!Array.isArray(arr) || !Number.isInteger(index) || index < 0 || index >= arr.length) {
    return { card: state, item: { ...base, ok: false, reason: 'bad_index' } }
  }
  arr.splice(index, 1)
  return { card: newCard, item: { ...base, ok: true } }
}

function executeReplace(state: CharaCard, action: ReplaceAction): ActionResult {
  const base = { type: 'replace', path: action.path, index: action.index }
  if (typeof action.find !== 'string' || action.find === '') {
    return { card: state, item: { ...base, ok: false, reason: 'empty_find' } }
  }
  const replacement = coerceText(action.replace)
  if (replacement === null) {
    return { card: state, item: { ...base, ok: false, reason: 'invalid_ops' } }
  }

  const newCard = structuredClone(state)
  const target = resolveStringTarget(newCard, action.path, action.index)
  if (!target.ok) return { card: state, item: { ...base, ok: false, reason: target.reason } }

  const occurrences = countOccurrences(target.value, action.find)
  if (occurrences === 0) {
    return { card: state, item: { ...base, ok: false, reason: 'not_found', occurrences: 0 } }
  }
  if (typeof action.count === 'number' && action.count !== occurrences) {
    return { card: state, item: { ...base, ok: false, reason: 'count_mismatch', occurrences } }
  }

  const { text, replaced } = replaceLiteral(target.value, action.find, replacement, action.all === true)
  writeStringTarget(newCard, action.path, action.index, text)
  return { card: newCard, item: { ...base, ok: true, occurrences, replaced } }
}

function executePatch(state: CharaCard, action: PatchAction): ActionResult {
  const base = { type: 'patch', path: action.path, index: action.index }
  const ops = Array.isArray(action.ops) ? action.ops : []
  if (ops.length === 0) {
    return { card: state, item: { ...base, ok: false, reason: 'invalid_ops' } }
  }

  const newCard = structuredClone(state)
  const target = resolveStringTarget(newCard, action.path, action.index)
  if (!target.ok) return { card: state, item: { ...base, ok: false, reason: target.reason } }

  let text = target.value
  let replaced = 0
  let ambiguous = 0

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i] as PatchOp
    const fail = (reason: ActionFailReason): ActionResult => ({
      card: state,
      item: { ...base, ok: false, reason, replaced, failedOp: i, occurrences: ambiguous },
    })

    if (!op || typeof op.find !== 'string' || op.find === '') return fail('empty_find')
    const found = countOccurrences(text, op.find)
    if (found === 0) return fail('not_found')

    if (op.op === 'replace' || op.op === 'delete') {
      const all = op.all === true
      const replacement = op.op === 'delete' ? '' : coerceText(op.replace)
      if (replacement === null) return fail('invalid_ops')
      if (!all && found > 1) ambiguous = found
      const result = replaceLiteral(text, op.find, replacement, all)
      text = result.text
      replaced += result.replaced
    } else if (op.op === 'insert') {
      const inserted = coerceText(op.text)
      if (inserted === null) return fail('invalid_ops')
      if (found > 1) ambiguous = found
      const at = text.indexOf(op.find)
      const position = op.before === true ? at : at + op.find.length
      text = text.slice(0, position) + inserted + text.slice(position)
      replaced++
    } else {
      return fail('invalid_ops')
    }
  }

  writeStringTarget(newCard, action.path, action.index, text)
  return { card: newCard, item: { ...base, ok: true, occurrences: ambiguous, replaced } }
}

function applyActions(state: CharaCard, actions: CharaAction[]): { card: CharaCard; report: ActionReport } {
  let card = state
  const report: ActionReport = []

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'set': {
          const result = executeSet(card, action.path, action.value, action.index)
          card = result.card
          report.push(result.item)
          break
        }
        case 'add': {
          const result = executeAdd(card, action.path, action.value)
          card = result.card
          report.push(result.item)
          break
        }
        case 'remove': {
          const result = executeRemove(card, action.path, action.index)
          card = result.card
          report.push(result.item)
          break
        }
        case 'replace': {
          const result = executeReplace(card, action)
          card = result.card
          report.push(result.item)
          break
        }
        case 'patch': {
          const result = executePatch(card, action)
          card = result.card
          report.push(result.item)
          break
        }
        default: {
          const raw = action as unknown as { type?: unknown; path?: unknown }
          report.push({
            type: raw.type === undefined ? '' : String(raw.type),
            path: typeof raw.path === 'string' ? raw.path : '',
            ok: false,
            reason: 'unknown_type',
          })
        }
      }
    } catch {
      // 单条指令异常不阻断同批次其它指令，也不改动卡片
      const raw = action as unknown as { type?: unknown; path?: unknown }
      report.push({
        type: raw.type === undefined ? '' : String(raw.type),
        path: typeof raw.path === 'string' ? raw.path : '',
        ok: false,
        reason: 'unknown_type',
      })
    }
  }

  return { card, report }
}

interface CharaState {
  card: CharaCard
  avatar: string | null
  setCard: (card: CharaCard) => void
  setField: (path: string, value: unknown) => void
  /** 应用精修指令，返回逐条结果（用于聊天里的成功/失败反馈） */
  executeActions: (actions: CharaAction[]) => ActionReport
  loadFromJson: (json: string) => boolean
  resetCard: () => void
  setAvatar: (dataUrl: string | null) => void
}

export const useCharaStore = create<CharaState>((set) => ({
      card: createEmptyCharaCard(),
      avatar: null,

      setCard: (card) => set({ card: ensureCharaCard(card) }),

      setAvatar: (dataUrl) => set({ avatar: dataUrl }),

      setField: (path, value) =>
        set((state) => {
          const newCard = structuredClone(state.card)
          if (path === 'data.character_book.entries') {
            ensureWorldBook(newCard)
          }
          setNestedValue(newCard as unknown as Record<string, unknown>, path, value)
          return { card: newCard }
        }),

      executeActions: (actions) => {
        let report: ActionReport = []
        set((state) => {
          const result = applyActions(state.card, actions)
          report = result.report
          return { card: result.card }
        })
        return report
      },

      loadFromJson: (json) => {
        try {
          const parsed = JSON.parse(json)
          if (parsed.spec && parsed.data) {
            set({ card: ensureCharaCard(parsed) })
            return true
          }
          return false
        } catch {
          return false
        }
      },

      resetCard: () => set({ card: createEmptyCharaCard(), avatar: null }),
    })
)
