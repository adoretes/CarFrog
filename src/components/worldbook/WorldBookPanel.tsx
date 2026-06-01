import { useCharaStore } from '../../store/charaStore'
import { EntryEditor } from './EntryEditor'
import { createDefaultWorldBookEntry } from '../../types'

export function WorldBookPanel() {
  const { card, setField } = useCharaStore()
  const wb = card.data.character_book ?? { name: card.data.name || null, entries: [] }

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">世界书</h3>
        <button
          className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
          onClick={addEntry}
        >
          + 添加条目
        </button>
      </div>

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
    </div>
  )
}
