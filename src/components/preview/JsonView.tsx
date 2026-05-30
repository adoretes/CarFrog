import { useState, useCallback } from 'react'
import { useCharaStore } from '../../store/charaStore'
import { cardToJsonString } from '../../utils/charaUtils'

export function JsonView() {
  const { card, loadFromJson } = useCharaStore()
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const json = cardToJsonString(card)

  const startEditing = useCallback(() => {
    setEditText(json)
    setError('')
    setEditing(true)
  }, [json])

  const cancelEditing = useCallback(() => {
    setEditing(false)
    setError('')
  }, [])

  const saveEditing = useCallback(() => {
    const success = loadFromJson(editText)
    if (success) {
      setEditing(false)
      setError('')
    } else {
      setError('JSON 格式错误，请检查后重试')
    }
  }, [editText, loadFromJson])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = json
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">原始 JSON</h3>
        <div className="flex gap-1">
          {editing ? (
            <>
              <button
                className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                onClick={saveEditing}
              >
                ✓ 保存
              </button>
              <button
                className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                onClick={cancelEditing}
              >
                ✕ 取消
              </button>
            </>
          ) : (
            <>
              <button
                className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                onClick={startEditing}
              >
                ✏️ 编辑
              </button>
              <button
                className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                onClick={handleCopy}
              >
                {copied ? '✅ 已复制' : '📋 复制'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-1">
          {error}
        </div>
      )}

      {editing ? (
        <textarea
          className="w-full border border-indigo-300 rounded-lg p-4 text-xs font-mono overflow-auto min-h-[60vh] leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value)
            setError('')
          }}
        />
      ) : (
        <pre
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono overflow-auto max-h-[70vh] leading-relaxed cursor-pointer hover:border-gray-300 transition-colors"
          onClick={startEditing}
          title="点击编辑"
        >
          {json}
        </pre>
      )}
    </div>
  )
}
