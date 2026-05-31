import { LeftPanel } from './components/layout/LeftPanel'
import { RightPanel } from './components/layout/RightPanel'
import { ExportButton } from './components/export/ExportButton'
import { useCharaStore } from './store/charaStore'
import { useChatStore } from './store/chatStore'
import { useUiStore } from './store/uiStore'

export default function App() {
  const resetCard = useCharaStore((s) => s.resetCard)
  const resetChat = useChatStore((s) => s.resetChat)
  const mobileView = useUiStore((s) => s.mobileView)
  const setMobileView = useUiStore((s) => s.setMobileView)

  const handleNew = () => {
    if (confirm('确认新建？当前未导出的数据将丢失。')) {
      resetCard()
      resetChat()
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-indigo-700 whitespace-nowrap">🐸 CarFrog</h1>
          <span className="hidden sm:inline text-xs text-gray-400">角色卡生成器</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            onClick={handleNew}
          >
            ✨ <span className="hidden sm:inline">新建</span>
          </button>
          <ExportButton />
        </div>
      </header>

      <div className="md:hidden flex border-b border-gray-200 bg-gray-50">
        <button
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            mobileView === 'chat'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setMobileView('chat')}
        >
          💬 对话
        </button>
        <button
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            mobileView === 'right'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setMobileView('right')}
        >
          📝 角色卡
        </button>
      </div>

      <main className="flex-1 flex overflow-hidden">
        <div
          className={`${
            mobileView === 'chat' ? 'flex' : 'hidden'
          } md:flex w-full md:w-[40%] md:min-w-[360px] md:max-w-[480px] flex-shrink-0`}
        >
          <LeftPanel />
        </div>
        <div
          className={`${
            mobileView === 'right' ? 'flex' : 'hidden'
          } md:flex flex-1 min-w-0`}
        >
          <RightPanel />
        </div>
      </main>
    </div>
  )
}
