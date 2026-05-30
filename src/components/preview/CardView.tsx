import { useCharaStore } from '../../store/charaStore'

export function CardView() {
  const card = useCharaStore((s) => s.card)
  const d = card.data
  const hasContent = d.name || d.description

  if (!hasContent) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        暂无角色卡数据
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{d.name || '未命名角色'}</h1>

        {d.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
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

        {d.description && (
          <div className="mb-4">
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

      {d.character_book.entries.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📚 世界书（{d.character_book.entries.length} 条目）</h3>
          <div className="space-y-2">
            {d.character_book.entries.map((entry, i) => (
              <div key={i} className="bg-amber-50 rounded-lg p-3 border border-amber-200">
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
  )
}
