import { useState } from 'react'
import { Tag, Plus, X } from 'lucide-react'
import { useCharaStore } from '../../store/charaStore'

export function TagEditor() {
  const { card, setField } = useCharaStore()
  const tags = card.data.tags
  const [input, setInput] = useState('')

  const addTag = () => {
    const tag = input.trim()
    if (tag && !tags.includes(tag)) {
      setField('data.tags', [...tags, tag])
    }
    setInput('')
  }

  const removeTag = (index: number) => {
    setField('data.tags', tags.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
        {tags.length === 0 && (
          <span className="text-xs text-slate-400">暂无标签，可在下方添加</span>
        )}
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 rounded-lg text-xs font-medium border border-brand-200/60 dark:border-brand-800/60 shadow-2xs"
          >
            <Tag className="w-3 h-3 opacity-60" />
            <span>{tag}</span>
            <button
              type="button"
              className="text-brand-400 hover:text-rose-500 rounded p-0.5 transition-colors"
              onClick={() => removeTag(i)}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all"
          placeholder="输入标签（例如：二次元、治愈、赛博朋克）按 Enter 添加"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
        />
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-xl transition-all shadow-sm flex-shrink-0"
          onClick={addTag}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加</span>
        </button>
      </div>
    </div>
  )
}
