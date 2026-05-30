import { useCharaStore } from '../../store/charaStore'

export function BasicFields() {
  const { card, setField } = useCharaStore()
  const d = card.data

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">基本信息</h3>

      <div>
        <label className="block text-xs text-gray-500 mb-1">角色名称</label>
        <input
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={d.name}
          onChange={(e) => setField('data.name', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">描述（外貌、特征等）</label>
        <textarea
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          rows={6}
          value={d.description}
          onChange={(e) => setField('data.description', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">个性</label>
        <textarea
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          rows={4}
          value={d.personality}
          onChange={(e) => setField('data.personality', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">场景设定</label>
        <textarea
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          rows={3}
          value={d.scenario}
          onChange={(e) => setField('data.scenario', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">首条消息</label>
        <textarea
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          rows={4}
          value={d.first_mes}
          onChange={(e) => setField('data.first_mes', e.target.value)}
        />
      </div>
    </div>
  )
}
