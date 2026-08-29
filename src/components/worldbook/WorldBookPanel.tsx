import { useRef, useState, useMemo } from 'react'
import {
  Plus,
  Trash2,
  FolderInput,
  Search,
  BookMarked,
  Sparkles,
} from 'lucide-react'
import { useCharaStore } from '../../store/charaStore'
import { useChatStore } from '../../store/chatStore'
import { useSessionStore } from '../../store/sessionStore'
import { EntryEditor } from './EntryEditor'
import { createDefaultWorldBookEntry } from '../../types'
import { parseWorldBookJson } from '../../utils/wbUtils'
import type { WorldBook } from '../../types'

export function WorldBookPanel() {
  const { card, setField } = useCharaStore()
  const addMessage = useChatStore((s) => s.addMessage)
  const wb = card.data.character_book ?? { name: card.data.name || null, entries: [] }
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filterText, setFilterText] = useState('')
  const [importModal, setImportModal] = useState<{
    wb: WorldBook
    source: string
    sessionId: string | null
  } | null>(null)

  const filteredEntries = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return wb.entries.map((entry, index) => ({ entry, index }))
    return wb.entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => {
        const comment = (entry.comment || '').toLowerCase()
        const keys = entry.keys.join(' ').toLowerCase()
        const content = entry.content.toLowerCase()
        return comment.includes(q) || keys.includes(q) || content.includes(q)
      })
  }, [wb.entries, filterText])

  const addEntry = () => {
    const newEntry = createDefaultWorldBookEntry()
    setField('data.character_book', { ...wb, entries: [...wb.entries, newEntry] })
  }

  const updateEntry = (index: number, entry: typeof wb.entries[0]) => {
    const updated = wb.entries.map((e, i) => (i === index ? entry : e))
    setField('data.character_book', { ...wb, entries: updated })
  }

  const removeEntry = (index: number) => {
    setField('data.character_book', { ...wb, entries: wb.entries.filter((_, i) => i !== index) })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sessionId = useSessionStore.getState().activeId
    try {
      const text = await file.text()
      if (useSessionStore.getState().activeId !== sessionId) return
      const result = parseWorldBookJson(text)
      if ('error' in result) {
        addMessage({ role: 'assistant', content: `❌ 世界书导入失败：${result.error}` })
      } else {
        setImportModal({ wb: result.wb, source: result.source ?? '文件', sessionId })
      }
    } catch {
      if (useSessionStore.getState().activeId !== sessionId) return
      addMessage({ role: 'assistant', content: '❌ 文件读取失败' })
    }
    e.target.value = ''
  }

  const doImport = (mode: 'replace' | 'append') => {
    if (!importModal) return
    if (useSessionStore.getState().activeId !== importModal.sessionId) {
      setImportModal(null)
      return
    }
    const imported = importModal.wb
    if (mode === 'replace') {
      setField('data.character_book', imported)
      addMessage({ role: 'assistant', content: `✅ 已替换为${importModal.source}（${imported.entries.length} 条条目）` })
    } else {
      const existing = card.data.character_book ?? { name: card.data.name || null, entries: [] }
      setField('data.character_book', {
        ...existing,
        entries: [...existing.entries, ...imported.entries],
      })
      addMessage({ role: 'assistant', content: `✅ 已追加 ${imported.entries.length} 条条目到世界书` })
    }
    setImportModal(null)
  }

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            共 {wb.entries.length} 个条目（已激活 {wb.entries.filter((e) => e.enabled !== false).length}）
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700/60"
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderInput className="w-3.5 h-3.5 text-amber-500" />
            <span>导入世界书</span>
          </button>
          {wb.entries.length > 0 && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
              onClick={() => {
                if (confirm('确定清空所有世界书条目？')) {
                  setField('data.character_book', { ...wb, entries: [] })
                  addMessage({ role: 'assistant', content: '🗑️ 已清除所有世界书条目' })
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空</span>
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium px-3 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg transition-all shadow-sm shadow-amber-500/20"
            onClick={addEntry}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加条目</span>
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            世界书名称 (Character Book Name)
          </label>
          <input
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            value={wb.name || ''}
            onChange={(e) => setField('data.character_book.name', e.target.value || null)}
            placeholder="（可选）如：提瓦特设定集"
          />
        </div>
        {wb.entries.length > 2 && (
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              过滤条目
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                placeholder="搜索条目标题或关键词..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {wb.entries.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
          <BookMarked className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">暂无世界书设定条目</p>
          <p className="text-[11px] text-slate-400">点击「添加条目」或直接在对话中让 AI 补充世界观百科设定</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-400">
          未找到与「{filterText}」匹配的条目
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredEntries.map(({ entry, index }) => (
            <EntryEditor
              key={index}
              entry={entry}
              index={index}
              onChange={updateEntry}
              onRemove={removeEntry}
            />
          ))}
        </div>
      )}

      {/* 导入确认模态框 */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-2.5 text-brand-600 dark:text-brand-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                导入世界书数据
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              检测到来自 <span className="font-semibold text-slate-800 dark:text-slate-100">{importModal.source}</span> 的世界书，共包含 <span className="font-semibold text-brand-600 dark:text-brand-400">{importModal.wb.entries.length}</span> 条设定条目。请选择操作方式：
            </p>
            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl transition-all shadow-sm"
                onClick={() => doImport('replace')}
              >
                替换现有
              </button>
              <button
                className="flex-1 py-2 text-xs font-medium bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-xl transition-all shadow-sm"
                onClick={() => doImport('append')}
              >
                追加合并
              </button>
              <button
                className="px-3 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl transition-all"
                onClick={() => setImportModal(null)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
