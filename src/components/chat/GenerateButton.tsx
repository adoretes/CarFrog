import { useGenerateCard } from './useGenerateCard'

export function GenerateButton() {
  const { generate, loading, mode } = useGenerateCard()

  if (mode !== 'brainstorm') return null

  return (
    <button
      className={`text-xs px-3 py-1 rounded-full transition-colors ${
        loading
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-indigo-600 text-white hover:bg-indigo-700'
      }`}
      onClick={generate}
      disabled={loading}
    >
      {loading ? '⏳ 生成中...' : '✨ 生成角色卡'}
    </button>
  )
}
