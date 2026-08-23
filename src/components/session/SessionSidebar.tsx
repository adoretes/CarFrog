import { useEffect, useMemo, useState } from 'react'
import { useSessionStore, TITLE_MAX_LEN } from '../../store/sessionStore'
import { useUiStore } from '../../store/uiStore'

const PAGE_SIZE = 50

function timeLabel(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}天前`
  return new Date(ts).toLocaleDateString()
}

function displayTitle(title: string): string {
  return title || '新会话'
}

function SessionListBody({ onNavigate }: { onNavigate?: () => void }) {
  const sessions = useSessionStore((s) => s.sessions)
  const activeId = useSessionStore((s) => s.activeId)
  const createSession = useSessionStore((s) => s.createSession)
  const switchSession = useSessionStore((s) => s.switchSession)
  const renameSession = useSessionStore((s) => s.renameSession)
  const deleteSession = useSessionStore((s) => s.deleteSession)
  const clearSessions = useSessionStore((s) => s.clearSessions)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const list = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)
    const q = query.trim().toLowerCase()
    return q
      ? list.filter((m) => displayTitle(m.title).toLowerCase().includes(q))
      : list
  }, [sessions, query])

  // 搜索词变化时重置分页：在渲染期间检测变化并重置，避免 effect 级联渲染
  const [prevQuery, setPrevQuery] = useState('')
  if (prevQuery !== query) {
    setPrevQuery(query)
    setVisibleCount(PAGE_SIZE)
  }

  const visible = filtered.slice(0, visibleCount)

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length))
    }
  }

  const handleClearAll = () => {
    if (confirm('确定清空所有会话？此操作不可恢复。')) {
      void clearSessions()
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-600">会话</span>
        <div className="flex items-center gap-1">
          <button
            className="text-xs px-2 py-1 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={handleClearAll}
            title="清空所有会话"
            aria-label="清空所有会话"
          >
            🗑
          </button>
          <button
            className="text-xs px-2 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            onClick={() => void createSession()}
            title="新建会话"
          >
            ＋ 新建
          </button>
        </div>
      </div>

      <div className="px-2 pt-2 pb-1">
        <input
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="搜索会话..."
          aria-label="搜索会话"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1" onScroll={handleScroll}>
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">暂无会话</p>
        ) : (
          <>
            <ul className="space-y-1">
              {visible.map((s) => (
                <li key={s.id}>
                  {editingId === s.id ? (
                    <input
                      autoFocus
                      className="w-full px-2 py-1 text-xs border border-indigo-400 rounded-md focus:outline-none"
                      value={editText}
                      maxLength={TITLE_MAX_LEN}
                      aria-label="重命名会话"
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={commitEdit}
                    />
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`打开会话：${displayTitle(s.title)}`}
                      className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                        s.id === activeId
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => {
                        void switchSession(s.id)
                        onNavigate?.()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          void switchSession(s.id)
                          onNavigate?.()
                        }
                      }}
                    >
                      <span className="flex-1 min-w-0 truncate text-xs">
                        {displayTitle(s.title)}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {timeLabel(s.updatedAt)}
                      </span>
                      <button
                        className="hidden group-hover:inline-block max-md:inline-block text-gray-400 hover:text-indigo-600 text-xs px-0.5"
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit(s.id, s.title)
                        }}
                        title="重命名"
                        aria-label={`重命名会话：${displayTitle(s.title)}`}
                      >
                        ✎
                      </button>
                      <button
                        className="hidden group-hover:inline-block max-md:inline-block text-gray-400 hover:text-red-500 text-xs px-0.5"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`删除会话「${displayTitle(s.title)}」？此操作不可恢复。`)) {
                            void deleteSession(s.id)
                          }
                        }}
                        title="删除"
                        aria-label={`删除会话：${displayTitle(s.title)}`}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {visible.length < filtered.length && (
              <button
                className="w-full mt-2 py-1 text-xs text-gray-400 hover:text-indigo-600 rounded-md transition-colors"
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              >
                加载更多（还有 {filtered.length - visible.length} 个）
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function SessionSidebar() {
  const sessionListOpen = useUiStore((s) => s.sessionListOpen)
  const setSessionListOpen = useUiStore((s) => s.setSessionListOpen)

  useEffect(() => {
    if (!sessionListOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSessionListOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sessionListOpen, setSessionListOpen])

  return (
    <>
      {sessionListOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSessionListOpen(false)}
            aria-label="关闭会话列表"
          />
          <div
            className="relative w-72 max-w-[80vw] h-full bg-gray-50 shadow-xl"
            role="dialog"
            aria-label="会话列表"
          >
            <SessionListBody
              onNavigate={() => setSessionListOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
