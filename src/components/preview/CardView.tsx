import { useEffect, useState } from 'react'
import {
  User,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Info,
  Maximize2,
  X,
} from 'lucide-react'
import { useCharaStore } from '../../store/charaStore'

export function CardView() {
  const card = useCharaStore((s) => s.card)
  const avatar = useCharaStore((s) => s.avatar)
  const d = card.data
  const hasContent = d.name || d.description

  const [greetingIndex, setGreetingIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)
  const [viewMode, setViewMode] = useState<'tavern' | 'details'>('tavern')

  const allGreetings = [d.first_mes, ...d.alternate_greetings].filter(Boolean)

  useEffect(() => {
    if (!showLightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLightbox(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showLightbox])

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-center text-slate-400 select-none">
        <Sparkles className="w-8 h-8 mb-2 opacity-30 animate-pulse" />
        <p className="text-sm font-medium">暂无角色卡数据</p>
        <p className="text-xs text-slate-500 mt-1">在左侧与 AI 对话即可自动生成角色卡内容</p>
      </div>
    )
  }

  const currentGreeting = allGreetings[greetingIndex] || d.first_mes

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 模式切换 */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              viewMode === 'tavern'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
            onClick={() => setViewMode('tavern')}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            酒馆沉浸模拟
          </button>
          <button
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              viewMode === 'details'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
            onClick={() => setViewMode('details')}
          >
            <Info className="w-3.5 h-3.5" />
            详细属性卡
          </button>
        </div>

        {allGreetings.length > 1 && viewMode === 'tavern' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>问候语：{greetingIndex + 1} / {allGreetings.length}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                disabled={greetingIndex <= 0}
                onClick={() => setGreetingIndex((v) => Math.max(0, v - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                disabled={greetingIndex >= allGreetings.length - 1}
                onClick={() => setGreetingIndex((v) => Math.min(allGreetings.length - 1, v + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 头部立绘与基础卡片 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50/80 via-indigo-50/40 to-slate-50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-950 border border-brand-100/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="relative group flex-shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt={d.name || 'avatar'}
                onClick={() => setShowLightbox(true)}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-md cursor-zoom-in group-hover:scale-102 transition-all duration-150"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-brand-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-md">
                <User className="w-10 h-10 opacity-70" />
              </div>
            )}
            {avatar && (
              <div
                onClick={() => setShowLightbox(true)}
                className="absolute inset-0 rounded-2xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer pointer-events-none"
              >
                <Maximize2 className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 break-words mb-1.5">
              {d.name || '未命名角色'}
            </h2>

            {d.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {d.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-[11px] border border-slate-200/80 dark:border-slate-700 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {(d.description || d.personality) && (
          <div className="mt-3.5 space-y-3">
            {d.description && (
              <div className="space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  📝 设定与外貌描述
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                  {d.description}
                </p>
              </div>
            )}

            {d.personality && (
              <div className="space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  💗 性格特点
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                  {d.personality}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 酒馆沉浸视图 */}
      {viewMode === 'tavern' && (
        <div className="space-y-4">
          {/* 开场消息气泡 */}
          {currentGreeting ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  {d.name || '角色'} 的开场白
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {greetingIndex === 0 ? '首条消息 (first_mes)' : `分支问候语 #${greetingIndex}`}
                </span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed border-l-4 border-brand-500 font-serif border border-slate-200/60 dark:border-slate-800/80 shadow-2xs">
                {currentGreeting}
              </div>
            </div>
          ) : null}

          {/* 示例对话 */}
          {d.mes_example && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2.5">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>示例对话模拟</span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-mono border border-slate-200/60 dark:border-slate-800/80 shadow-2xs">
                {d.mes_example}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 详细属性详情 */}
      {viewMode === 'details' && (
        <div className="space-y-3">
          {!d.scenario && !(d.character_book?.entries && d.character_book.entries.length > 0) && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 select-none">
              <Info className="w-6 h-6 mb-2 opacity-40" />
              <p className="text-xs">暂无更多属性</p>
              <p className="text-[11px] text-slate-500 mt-1">
                设定与外貌描述、性格特点已显示在上方角色卡中
              </p>
            </div>
          )}

          {d.scenario && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                🌍 场景背景
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                {d.scenario}
              </p>
            </div>
          )}

          {d.character_book?.entries && d.character_book.entries.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  世界书 ({d.character_book.entries.length} 条)
                </span>
              </div>
              <div className="space-y-2">
                {d.character_book.entries.map((entry, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-medium text-amber-900 dark:text-amber-200">
                      <span>{entry.comment || `条目 #${i + 1}`}</span>
                      {entry.constant && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded">
                          常驻
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {entry.keys.map((k, ki) => (
                        <span
                          key={ki}
                          className="px-1.5 py-0.5 bg-white/80 dark:bg-slate-900 rounded text-[10px] text-amber-800 dark:text-amber-300"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-[11px]">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 头像灯箱大图 */}
      {showLightbox && avatar && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <button
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white transition-colors"
              onClick={() => setShowLightbox(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={avatar}
              alt={d.name || 'avatar'}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  )
}
