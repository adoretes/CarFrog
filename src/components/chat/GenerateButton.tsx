import { Sparkles, Square } from 'lucide-react'
import { useGenerateCard } from './useGenerateCard'

export function GenerateButton() {
  const { generate, loading, abort, mode } = useGenerateCard()

  if (mode !== 'brainstorm') return null

  return (
    <button
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap ${
        loading
          ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
          : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
      }`}
      onClick={() => (loading ? abort() : generate())}
    >
      {loading ? (
        <>
          <Square className="w-3 h-3 fill-current" />
          <span>停止生成</span>
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5" />
          <span>生成角色卡</span>
        </>
      )}
    </button>
  )
}
