import { useCharaStore } from '../../store/charaStore'

export function AdvancedFields() {
  const { card, setField } = useCharaStore()
  const d = card.data

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">进阶设置</h3>

      <div>
        <label className="block text-xs text-gray-500 mb-1">示例对话</label>
        <textarea
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          rows={5}
          value={d.mes_example}
          onChange={(e) => setField('data.mes_example', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">系统提示</label>
        <textarea
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          rows={3}
          value={d.system_prompt}
          onChange={(e) => setField('data.system_prompt', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">历史后处理指令</label>
        <textarea
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          rows={3}
          value={d.post_history_instructions}
          onChange={(e) => setField('data.post_history_instructions', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">创作者注释</label>
        <textarea
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          rows={2}
          value={d.creator_notes}
          onChange={(e) => setField('data.creator_notes', e.target.value)}
        />
      </div>
    </div>
  )
}
