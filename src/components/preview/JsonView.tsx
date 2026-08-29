import { useState, useCallback } from 'react'
import { Copy, Check, Edit3, X, AlertCircle } from 'lucide-react'
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
      setError('JSON 格式不符合规范或存在语法错误，请检查后重试')
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
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">原始 JSON 规范</span>
          <span className="ml-2 text-[10px] text-slate-400 font-mono">SillyTavern V2 Spec</span>
        </div>
        <div className="flex items-center gap-1.5">
          {editing ? (
            <>
              <button
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl transition-all shadow-sm shadow-emerald-600/20"
                onClick={saveEditing}
              >
                <Check className="w-3.5 h-3.5" />
                <span>保存并应用</span>
              </button>
              <button
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                onClick={cancelEditing}
              >
                <X className="w-3.5 h-3.5" />
                <span>取消</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all border border-slate-200/60 dark:border-slate-700/60"
                onClick={startEditing}
              >
                <Edit3 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>在线编辑</span>
              </button>
              <button
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all border border-slate-200/60 dark:border-slate-700/60"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制' : '复制 JSON'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-2.5 shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {editing ? (
        <textarea
          className="w-full flex-1 min-h-0 bg-slate-900 text-emerald-300 border border-brand-500 rounded-2xl p-4 text-xs font-mono overflow-auto leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none shadow-inner"
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value)
            setError('')
          }}
        />
      ) : (
        <pre
          className="flex-1 min-h-0 bg-slate-900 dark:bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl p-4 text-xs font-mono overflow-auto leading-relaxed cursor-pointer hover:border-slate-700 transition-colors shadow-inner select-text"
          onClick={startEditing}
          title="点击即可进入在线编辑"
        >
          {json}
        </pre>
      )}
    </div>
  )
}
