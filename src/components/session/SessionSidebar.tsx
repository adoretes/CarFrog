import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Edit3,
  Search,
  MessageSquare,
  X,
  Clock,
} from 'lucide-react'
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
  return title || '新角色会话'
}

export function SessionListBody({ onNavigate }: { onNavigate?: () => void }) {
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
    if (confirm('确定清空所有历史会话？此操作不可恢复。')) {
      void clearSessions()
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 select-none">
      {/* 顶部标题与操作栏 */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">历史会话</h3>
            <p className="text-[10px] text-slate-400">共 {sessions.length} 个角色创作记录</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {sessions.length > 0 && (
            <button
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              onClick={handleClearAll}
              title="清空所有会话"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-semibold transition-all shadow-sm shadow-brand-500/20"
            onClick={() => {
              void createSession()
              onNavigate?.()
            }}
            title="新建会话"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建</span>
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="p-3 pb-1.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all font-medium"
            placeholder="搜索会话名称..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 会话列表项 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" onScroll={handleScroll}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
            <Clock className="w-7 h-7 mx-auto mb-2 opacity-30" />
            <p className="font-medium">未找到相关会话</p>
            <p className="text-[10px] text-slate-400 mt-1">尝试输入其他关键词或新建会话</p>
          </div>
        ) : (
          <>
            <ul className="space-y-1.5">
              {visible.map((s) => {
                const isActive = s.id === activeId
                return (
                  <li key={s.id}>
                    {editingId === s.id ? (
                      <div className="p-1">
                        <input
                          autoFocus
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border-2 border-brand-500 rounded-xl focus:outline-none text-slate-800 dark:text-slate-100 font-semibold shadow-sm"
                          value={editText}
                          maxLength={TITLE_MAX_LEN}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onBlur={commitEdit}
                        />
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 border ${
                          isActive
                            ? 'bg-brand-50/80 dark:bg-brand-950/40 border-brand-300 dark:border-brand-800 text-brand-900 dark:text-brand-100 shadow-2xs'
                            : 'bg-slate-50/40 dark:bg-slate-850/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border-slate-200/60 dark:border-slate-800/80 text-slate-700 dark:text-slate-200'
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
                        {/* 左侧：激活指示条 + 会话标题 */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                              isActive
                                ? 'bg-brand-600 dark:bg-brand-400'
                                : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400'
                            }`}
                          />
                          <span
                            className={`truncate text-xs ${
                              isActive
                                ? 'font-bold text-brand-700 dark:text-brand-300'
                                : 'font-medium text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {displayTitle(s.title)}
                          </span>
                        </div>

                        {/* 右侧：平时显示时间，悬停时平滑替换为操作按钮 */}
                        <div className="relative flex items-center justify-end flex-shrink-0 h-6">
                          {/* 时间标签 */}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono transition-opacity group-hover:opacity-0 group-hover:pointer-events-none">
                            {timeLabel(s.updatedAt)}
                          </span>

                          {/* 悬停操作按钮组 */}
                          <div className="absolute right-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent">
                            <button
                              type="button"
                              className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors shadow-2xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEdit(s.id, s.title)
                              }}
                              title="重命名会话"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors shadow-2xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`确定删除会话「${displayTitle(s.title)}」？`)) {
                                  void deleteSession(s.id)
                                }
                              }}
                              title="删除会话"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {visible.length < filtered.length && (
              <button
                className="w-full mt-2 py-2 text-xs font-medium text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl transition-colors text-center"
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
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-150">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSessionListOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl z-10 border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-200">
            <SessionListBody onNavigate={() => setSessionListOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
