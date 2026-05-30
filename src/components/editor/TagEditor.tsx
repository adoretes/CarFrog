import { useState } from 'react'
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
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">标签</h3>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs"
          >
            {tag}
            <button
              className="text-indigo-400 hover:text-red-500"
              onClick={() => removeTag(i)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="输入标签后回车"
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
          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          onClick={addTag}
        >
          添加
        </button>
      </div>
    </div>
  )
}
