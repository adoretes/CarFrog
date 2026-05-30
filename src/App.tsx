import { LeftPanel } from './components/layout/LeftPanel'
import { RightPanel } from './components/layout/RightPanel'
import { ExportButton } from './components/export/ExportButton'
import { useCharaStore } from './store/charaStore'
import { useChatStore } from './store/chatStore'

export default function App() {
  const resetCard = useCharaStore((s) => s.resetCard)
  const resetChat = useChatStore((s) => s.resetChat)

  const handleNew = () => {
    if (confirm('确认新建？当前未导出的数据将丢失。')) {
      resetCard()
      resetChat()
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-indigo-700">🐸 CarFrog</h1>
          <span className="text-xs text-gray-400">角色卡生成器</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={handleNew}
          >
            ✨ 新建
          </button>
          <ExportButton />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-[40%] min-w-[360px] max-w-[480px] flex-shrink-0">
          <LeftPanel />
        </div>
        <div className="flex-1 min-w-0">
          <RightPanel />
        </div>
      </main>
    </div>
  )
}
