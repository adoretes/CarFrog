import { useCharaStore } from '../../store/charaStore'

export function GreetingEditor() {
  const { card, setField } = useCharaStore()
  const greetings = card.data.alternate_greetings

  const addGreeting = () => {
    setField('data.alternate_greetings', [...greetings, ''])
  }

  const removeGreeting = (index: number) => {
    const updated = greetings.filter((_, i) => i !== index)
    setField('data.alternate_greetings', updated)
  }

  const updateGreeting = (index: number, value: string) => {
    const updated = greetings.map((g, i) => (i === index ? value : g))
    setField('data.alternate_greetings', updated)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">替代问候语</h3>
        <button
          className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
          onClick={addGreeting}
        >
          + 添加
        </button>
      </div>
      {greetings.length === 0 && (
        <p className="text-xs text-gray-400">暂无替代问候语</p>
      )}
      {greetings.map((g, i) => (
        <div key={i} className="flex gap-2 items-start">
          <textarea
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
            rows={2}
            value={g}
            onChange={(e) => updateGreeting(i, e.target.value)}
          />
          <button
            className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
            onClick={() => removeGreeting(i)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
