import { useMemo, useState } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { useUiStore } from '../../store/uiStore'

function timeLabel(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}天前`
  return new Date(ts).toLocaleDateString()
}

function SessionListBody({ onNavigate }: { onNavigate?: () => void }) {
  const sessions = useSessionStore((s) => s.sessions)
  const activeId = useSessionStore((s) => s.activeId)
  const createSession = useSessionStore((s) => s.createSession)
  const switchSession = useSessionStore((s) => s.switchSession)
  const renameSession = useSessionStore((s) => s.renameSession)
  const deleteSession = useSessionStore((s) => s.deleteSession)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const filtered = useMemo(() => {
    const list = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)
    const q = query.trim().toLowerCase()
    return q ? list.filter((m) => m.title.toLowerCase().includes(q)) : list
  }, [sessions, query])

  const startEdit = (id: string, title: string) => {
    setEditingId(id)
    setEditText(title)
  }

  const commitEdit = () => {
    if (editingId) {
      void renameSession(editingId, editText)
    }
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-600">会话</span>
        <button
          className="text-xs px-2 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          onClick={() => void createSession()}
          title="新建会话"
        >
          ＋ 新建
        </button>
      </div>

      <div className="px-2 pt-2 pb-1">
        <input
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="搜索会话..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">暂无会话</p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((s) => (
              <li key={s.id}>
                {editingId === s.id ? (
                  <input
                    autoFocus
                    className="w-full px-2 py-1 text-xs border border-indigo-400 rounded-md focus:outline-none"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={commitEdit}
                  />
                ) : (
                  <div
                    className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      s.id === activeId
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => {
                      void switchSession(s.id)
                      onNavigate?.()
                    }}
                  >
                    <span className="flex-1 min-w-0 truncate text-xs">
                      {s.title || '新会话'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {timeLabel(s.updatedAt)}
                    </span>
                    <button
                      className="hidden group-hover:inline-block text-gray-400 hover:text-indigo-600 text-xs px-0.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        startEdit(s.id, s.title)
                      }}
                      title="重命名"
                    >
                      ✎
                    </button>
                    <button
                      className="hidden group-hover:inline-block text-gray-400 hover:text-red-500 text-xs px-0.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`删除会话「${s.title || '新会话'}」？此操作不可恢复。`)) {
                          void deleteSession(s.id)
                        }
                      }}
                      title="删除"
                    >
                      ×
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function SessionSidebar() {
  const sessionListOpen = useUiStore((s) => s.sessionListOpen)
  const setSessionListOpen = useUiStore((s) => s.setSessionListOpen)

  return (
    <>
      {sessionListOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSessionListOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full bg-gray-50 shadow-xl">
            <SessionListBody
              onNavigate={() => setSessionListOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
