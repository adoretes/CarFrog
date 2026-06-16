import { useEffect, useState } from 'react'
import { useCharaStore } from '../../store/charaStore'

export function CardView() {
  const card = useCharaStore((s) => s.card)
  const avatar = useCharaStore((s) => s.avatar)
  const d = card.data
  const hasContent = d.name || d.description
  const [showLarge, setShowLarge] = useState(false)

  useEffect(() => {
    if (!showLarge) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLarge(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showLarge])

  if (!hasContent) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        暂无角色卡数据
      </div>
    )
  }

  const showSide = showLarge && !!avatar

  return (
    <div className={`flex flex-col lg:flex-row gap-4 items-start ${showSide ? '' : 'justify-center'}`}>
      <div className={`flex-1 min-w-0 w-full max-w-2xl ${showSide ? '' : 'mx-auto'} space-y-3 sm:space-y-4`}>
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-indigo-100">
          <div className="flex items-start gap-3 sm:gap-4 mb-2">
            {avatar && (
              <img
                src={avatar}
                alt={d.name || 'avatar'}
                onClick={() => setShowLarge((v) => !v)}
                title={showSide ? '点击关闭大图' : '点击查看大图'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-white shadow-sm flex-shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 break-words">{d.name || '未命名角色'}</h1>
              {d.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {d.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-white/60 text-indigo-700 rounded-full text-xs border border-indigo-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {d.description && (
            <div className="mb-4 mt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">📝 描述</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{d.description}</p>
            </div>
          )}

          {d.personality && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">🎭 个性</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{d.personality}</p>
            </div>
          )}

          {d.scenario && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">🌍 场景</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{d.scenario}</p>
            </div>
          )}
        </div>

        {d.first_mes && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">💬 首条消息</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-l-4 border-indigo-400">
              {d.first_mes}
            </div>
          </div>
        )}

        {d.alternate_greetings.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">🔄 替代问候语（{d.alternate_greetings.length}）</h3>
            <div className="space-y-2">
              {d.alternate_greetings.map((g, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-l-4 border-amber-400">
                  {g}
                </div>
              ))}
            </div>
          </div>
        )}

        {d.mes_example && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📖 示例对话</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {d.mes_example}
            </div>
          </div>
        )}

        {(d.character_book?.entries.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📚 世界书（{d.character_book?.entries.length} 条目）</h3>
            <div className="space-y-2">
              {d.character_book?.entries.map((entry, i) => (
                <div key={i} className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <div className="text-xs font-medium text-amber-900 mb-1 flex items-center gap-1.5">
                    {entry.comment || `条目 #${i + 1}`}
                    {entry.constant && <span className="text-[10px] px-1 py-0.5 bg-indigo-200 text-indigo-700 rounded">常驻</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {entry.keys.map((k, j) => (
                      <span key={j} className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">
                        {k}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{entry.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSide && (
        <div className="flex-1 min-w-0 w-full lg:sticky lg:top-0 lg:self-start">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
              <div className="text-xs font-medium text-gray-600 truncate">
                {d.name || '头像预览'}
              </div>
              <button
                onClick={() => setShowLarge(false)}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors text-sm"
                title="关闭 (Esc)"
              >
                ✕
              </button>
            </div>
            <div className="bg-gray-50 flex items-center justify-center p-3">
              <img
                src={avatar}
                alt={d.name || 'avatar'}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
