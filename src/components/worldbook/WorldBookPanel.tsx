import { useRef, useState } from 'react'
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
  const [importModal, setImportModal] = useState<{
    wb: WorldBook
    source: string
    sessionId: string | null
  } | null>(null)

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">世界书</h3>
        <div className="flex gap-1">
          <button
            className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            📥 导入
          </button>
          {wb.entries.length > 0 && (
            <button
              className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
              onClick={() => {
                setField('data.character_book', { ...wb, entries: [] })
                addMessage({ role: 'assistant', content: '🗑️ 已清除所有世界书条目' })
              }}
            >
              🗑️ 清除
            </button>
          )}
          <button
            className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
            onClick={addEntry}
          >
            + 添加条目
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

      <div>
        <label className="block text-xs text-gray-400 mb-0.5">世界书名称</label>
        <input
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
          value={wb.name || ''}
          onChange={(e) => setField('data.character_book.name', e.target.value || null)}
          placeholder="（可选）"
        />
      </div>

      {wb.entries.length === 0 && (
        <p className="text-xs text-gray-400 py-2">暂无世界书条目，可点击"添加条目"或通过 AI 聊天生成</p>
      )}

      <div className="space-y-2">
        {wb.entries.map((entry, i) => (
          <EntryEditor
            key={i}
            entry={entry}
            index={i}
            onChange={updateEntry}
            onRemove={removeEntry}
          />
        ))}
      </div>

      {importModal && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setImportModal(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-4">
            <p className="text-sm font-medium text-gray-800 mb-3">
              检测到{importModal.source}（{importModal.wb.entries.length} 条条目）
            </p>
            <p className="text-xs text-gray-500 mb-3">请选择导入方式：</p>
            <div className="flex gap-2">
              <button
                className="flex-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                onClick={() => doImport('replace')}
              >
                替换
              </button>
              <button
                className="flex-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                onClick={() => doImport('append')}
              >
                追加
              </button>
              <button
                className="flex-1 px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                onClick={() => setImportModal(null)}
              >
                取消
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
