import { useState } from 'react'
import type { WorldBookEntry } from '../../types'
import { createDefaultWorldBookEntry } from '../../types'

interface EntryEditorProps {
  entry: WorldBookEntry
  index: number
  onChange: (index: number, entry: WorldBookEntry) => void
  onRemove: (index: number) => void
}

export function EntryEditor({ entry, index, onChange, onRemove }: EntryEditorProps) {
  const [expanded, setExpanded] = useState(false)

  const update = (partial: Partial<WorldBookEntry>) => {
    onChange(index, { ...entry, ...partial })
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">
          条目 #{index + 1}
        </span>
        <div className="flex gap-1">
          <button
            className="text-xs px-2 py-0.5 text-gray-500 hover:bg-gray-100 rounded"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '收起' : '展开'}
          </button>
          <button
            className="text-xs px-2 py-0.5 text-red-500 hover:bg-red-50 rounded"
            onClick={() => onRemove(index)}
          >
            删除
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-xs text-gray-400 mb-0.5">关键词</label>
          <div className="flex flex-wrap gap-1 mb-1">
            {entry.keys.map((k, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                {k}
                <button
                  className="text-amber-400 hover:text-red-500"
                  onClick={() => {
                    const newKeys = entry.keys.filter((_, j) => j !== i)
                    update({ keys: newKeys })
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <KeyInput
            onAdd={(key) => {
              if (!entry.keys.includes(key)) {
                update({ keys: [...entry.keys, key] })
              }
            }}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-0.5">内容</label>
          <textarea
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
            rows={expanded ? 6 : 2}
            value={entry.content}
            onChange={(e) => update({ content: e.target.value })}
          />
        </div>

        {expanded && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">启用</label>
              <input
                type="checkbox"
                checked={entry.enabled !== false}
                onChange={(e) => update({ enabled: e.target.checked })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">始终激活</label>
              <input
                type="checkbox"
                checked={entry.constant || false}
                onChange={(e) => update({ constant: e.target.checked })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">顺序</label>
              <input
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                type="number"
                value={entry.order ?? 100}
                onChange={(e) => update({ order: parseInt(e.target.value) || 100 })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">深度</label>
              <input
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                type="number"
                value={entry.depth ?? 4}
                onChange={(e) => update({ depth: parseInt(e.target.value) || 4 })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">位置</label>
              <select
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                value={typeof entry.position === 'number' ? entry.position.toString() : (entry.position || 'before_char')}
                onChange={(e) => update({ position: e.target.value })}
              >
                <option value="before_char">角色定义前</option>
                <option value="after_char">角色定义后</option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">选择逻辑</label>
              <select
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                value={entry.selectiveLogic ?? 0}
                onChange={(e) => update({ selectiveLogic: parseInt(e.target.value) })}
              >
                <option value={0}>AND_ANY</option>
                <option value={1}>AND_ALL</option>
                <option value={2}>NOT_ANY</option>
                <option value={3}>NOT_ALL</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KeyInput({ onAdd }: { onAdd: (key: string) => void }) {
  const [value, setValue] = useState('')

  const handleAdd = () => {
    const trimmed = value.trim()
    if (trimmed) {
      onAdd(trimmed)
      setValue('')
    }
  }

  return (
    <div className="flex gap-1">
      <input
        className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
        placeholder="添加关键词"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleAdd()
          }
        }}
      />
      <button
        className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
        onClick={handleAdd}
      >
        +
      </button>
    </div>
  )
}
