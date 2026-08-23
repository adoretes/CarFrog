import { useGenerateCard } from './useGenerateCard'

export function GenerateButton() {
  const { generate, loading, abort, mode } = useGenerateCard()

  if (mode !== 'brainstorm') return null

  return (
    <button
      className={`text-xs px-3 py-1 rounded-full transition-colors ${
        loading
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-indigo-600 text-white hover:bg-indigo-700'
      }`}
      onClick={() => (loading ? abort() : generate())}
    >
      {loading ? '⏹ 停止生成' : '✨ 生成角色卡'}
    </button>
  )
}
