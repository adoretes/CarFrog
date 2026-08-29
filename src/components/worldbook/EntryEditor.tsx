import { useState } from 'react'
import {
  ChevronRight,
  Trash2,
  Tag,
  Plus,
  X,
  Bookmark,
} from 'lucide-react'
import type { WorldBookEntry } from '../../types'

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
    <div className={`border rounded-xl transition-all ${
      entry.enabled !== false
        ? 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700 shadow-2xs'
        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/50 dark:border-slate-800 opacity-60'
    }`}>
      {/* 头部摘要栏 */}
      <div className="flex items-center justify-between p-3 gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left min-w-0 flex-1 group"
        >
          <ChevronRight
            className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-150 flex-shrink-0 ${
              expanded ? 'rotate-90' : ''
            }`}
          />
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {entry.comment || `条目 #${index + 1}`}
            </span>
            {entry.constant && (
              <span className="px-1.5 py-0.5 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 rounded-md text-[10px] font-medium border border-brand-200/60 dark:border-brand-800/60">
                常驻
              </span>
            )}
            {entry.keys.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {entry.keys.slice(0, 3).map((k, ki) => (
                  <span
                    key={ki}
                    className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded text-[10px] border border-amber-200/50 dark:border-amber-800/50"
                  >
                    {k}
                  </span>
                ))}
                {entry.keys.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{entry.keys.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className={`p-1.5 rounded-lg transition-colors text-xs ${
              entry.constant
                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            onClick={() => update({ constant: !entry.constant })}
            title={entry.constant ? '取消常驻' : '设为常驻'}
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            onClick={() => onRemove(index)}
            title="删除条目"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 展开内容 */}
      <div className={`px-3 pb-3 space-y-3 ${expanded ? 'block' : 'hidden'}`}>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            条目备注 / 标题 (Comment)
          </label>
          <input
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
            placeholder="例如：世界观地理背景 / 某武器设定"
            value={entry.comment || ''}
            onChange={(e) => update({ comment: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            触发关键词 (Keys)
          </label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {entry.keys.map((k, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 rounded-lg text-xs border border-amber-200/60 dark:border-amber-800/60"
              >
                <Tag className="w-2.5 h-2.5 opacity-50" />
                <span>{k}</span>
                <button
                  type="button"
                  className="text-amber-400 hover:text-rose-500"
                  onClick={() => {
                    const newKeys = entry.keys.filter((_, j) => j !== i)
                    update({ keys: newKeys })
                  }}
                >
                  <X className="w-3 h-3" />
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
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            条目内容 (Content)
          </label>
          <textarea
            className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-100 leading-relaxed resize-y"
            rows={5}
            placeholder="当对话中提及上述关键词时将注入本设定..."
            value={entry.content}
            onChange={(e) => update({ content: e.target.value })}
          />
        </div>

        {/* 高级参数折叠 */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <label className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
            <input
              type="checkbox"
              className="rounded text-brand-600 focus:ring-brand-500"
              checked={entry.enabled !== false}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            <span className="text-[11px] text-slate-600 dark:text-slate-300">启用该条目</span>
          </label>

          <label className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
            <input
              type="checkbox"
              className="rounded text-brand-600 focus:ring-brand-500"
              checked={entry.constant || false}
              onChange={(e) => update({ constant: e.target.checked })}
            />
            <span className="text-[11px] text-slate-600 dark:text-slate-300">始终常驻</span>
          </label>

          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">插入位置</label>
            <select
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
              value={typeof entry.position === 'number' ? entry.position.toString() : (entry.position || 'before_char')}
              onChange={(e) => update({ position: e.target.value })}
            >
              <option value="before_char">角色定义前</option>
              <option value="after_char">角色定义后</option>
              <option value="0">0 (顶层)</option>
              <option value="1">1</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">优先级 (Order)</label>
            <input
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
              type="number"
              value={entry.order ?? 100}
              onChange={(e) => update({ order: parseInt(e.target.value) || 100 })}
            />
          </div>
        </div>
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
    <div className="flex gap-1.5">
      <input
        className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
        placeholder="输入关键词后回车添加..."
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
        type="button"
        className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-medium rounded-lg transition-all"
        onClick={handleAdd}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
