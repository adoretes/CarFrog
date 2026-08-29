import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Sparkles,
  Settings,
  Menu,
  Sun,
  Moon,
  MessageSquare,
  FileCode2,
} from 'lucide-react'
import { LeftPanel } from './components/layout/LeftPanel'
import { RightPanel } from './components/layout/RightPanel'
import { AvatarButton } from './components/export/AvatarButton'
import { ExportButton } from './components/export/ExportButton'
import { SettingsModal } from './components/settings/SettingsModal'
import { useSessionStore } from './store/sessionStore'
import { useUiStore, applyTheme } from './store/uiStore'
import { useChatStore } from './store/chatStore'
import { useCharaStore } from './store/charaStore'
import { importFromPng } from './components/export/PngExport'

export default function App() {
  const hydrated = useSessionStore((s) => s.hydrated)
  const createSession = useSessionStore((s) => s.createSession)
  const activeTitle = useSessionStore((s) =>
    s.sessions.find((m) => m.id === s.activeId)?.title ?? '',
  )
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const mobileView = useUiStore((s) => s.mobileView)
  const setMobileView = useUiStore((s) => s.setMobileView)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)
  const setSessionListOpen = useUiStore((s) => s.setSessionListOpen)
  const chatPanelWidth = useUiStore((s) => s.chatPanelWidth)
  const setChatPanelWidth = useUiStore((s) => s.setChatPanelWidth)

  const [isDragging, setIsDragging] = useState(false)
  const [isGlobalDraggingFile, setIsGlobalDraggingFile] = useState(false)
  const dragCounter = useRef(0)

  // 初始化应用主题
  useEffect(() => {
    applyTheme(theme)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (useUiStore.getState().theme === 'system') {
        applyTheme('system')
      }
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme])

  // 分栏拖拽处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const minWidth = 340
      const maxWidth = Math.min(900, window.innerWidth - 380)
      const newWidth = Math.max(minWidth, Math.min(maxWidth, moveEvent.clientX))
      setChatPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [setChatPanelWidth])

  // 全局拖拽文件导入处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current += 1
    if (e.dataTransfer.types.includes('Files')) {
      setIsGlobalDraggingFile(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsGlobalDraggingFile(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsGlobalDraggingFile(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const file = files[0]
    const resetChat = useChatStore.getState().resetChat
    const setCard = useCharaStore.getState().setCard
    const setAvatar = useCharaStore.getState().setAvatar
    const addMessage = useChatStore.getState().addMessage
    const setMode = useChatStore.getState().setMode

    if (file.name.endsWith('.json')) {
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        if (parsed?.spec && parsed?.data) {
          resetChat()
          setAvatar(null)
          setCard(parsed)
          addMessage({ role: 'assistant', content: `✅ 已成功拖拽导入角色卡：${parsed.data.name || '未命名'}` })
          setMode('refine')
        }
      } catch {
        addMessage({ role: 'assistant', content: '❌ 导入的 JSON 角色卡解析失败' })
      }
    } else if (file.type === 'image/png' || file.name.endsWith('.png')) {
      try {
        const imported = await importFromPng(file)
        if (imported) {
          resetChat()
          setCard(imported)
          const reader = new FileReader()
          reader.onload = () => {
            setAvatar(reader.result as string)
          }
          reader.readAsDataURL(file)
          addMessage({ role: 'assistant', content: `✅ 已成功拖拽导入 PNG 角色卡：${imported.data.name || '未命名'}` })
          setMode('refine')
        } else {
          addMessage({ role: 'assistant', content: '❌ 该 PNG 图片中未解析到 SillyTavern 角色卡数据' })
        }
      } catch {
        addMessage({ role: 'assistant', content: '❌ PNG 角色卡读取失败' })
      }
    }
  }

  if (!hydrated) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 text-sm gap-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span>加载创作空间中...</span>
      </div>
    )
  }

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <div
      className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-150 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 全局拖拽遮罩 */}
      {isGlobalDraggingFile && (
        <div className="fixed inset-0 z-50 bg-brand-600/20 dark:bg-brand-900/40 backdrop-blur-sm border-4 border-dashed border-brand-500 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-brand-200 dark:border-brand-800">
            <Sparkles className="w-6 h-6 text-brand-600 dark:text-brand-400 animate-pulse" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              松开鼠标即可导入角色卡（支持 .json 或包含数据的 .png）
            </span>
          </div>
        </div>
      )}

      {/* 顶栏 Header */}
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-20 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setSessionListOpen(true)}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="查看历史会话"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <img src="/icons/carfrog-icon-64.png" alt="" className="h-7 w-7 rounded-lg shadow-sm" />
            <span className="text-base font-bold bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400 bg-clip-text text-transparent">
              CarFrog
            </span>
          </div>

          {activeTitle && (
            <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[14rem] truncate font-medium">
                {activeTitle}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all whitespace-nowrap border border-slate-200/60 dark:border-slate-700/60 shadow-sm"
            onClick={() => void createSession()}
            title="新建会话"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">新建</span>
          </button>

          <AvatarButton />
          <ExportButton />

          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title={`当前主题：${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '系统跟随'}（点击切换）`}
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-brand-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="打开偏好设置与 API 配置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 移动端 Tab 切换 */}
      <div className="md:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            mobileView === 'chat'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
          onClick={() => setMobileView('chat')}
        >
          <MessageSquare className="w-4 h-4" />
          对话创作
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            mobileView === 'right'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
          onClick={() => setMobileView('right')}
        >
          <FileCode2 className="w-4 h-4" />
          角色卡详情
        </button>
      </div>

      {/* 主工作区（纯粹的 双栏工作台） */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* 左侧对话面板 */}
        <div
          className={`${
            mobileView === 'chat' ? 'flex' : 'hidden'
          } md:flex flex-shrink-0 h-full overflow-hidden`}
          style={{ width: window.innerWidth >= 768 ? `${chatPanelWidth}px` : '100%' }}
        >
          <LeftPanel />
        </div>

        {/* 桌面端拖拽分界线 */}
        <div
          className={`hidden md:flex items-center justify-center w-1.5 hover:w-2 hover:bg-brand-500/30 active:bg-brand-500 cursor-col-resize transition-all select-none z-10 ${
            isDragging ? 'bg-brand-500 w-2' : 'bg-slate-200/80 dark:bg-slate-800/80'
          }`}
          onMouseDown={handleMouseDown}
          title="左右拖拽调节对话与角色卡分栏宽度"
        />

        {/* 右侧角色卡面板 */}
        <div
          className={`${
            mobileView === 'right' ? 'flex' : 'hidden'
          } md:flex flex-1 min-w-0 h-full overflow-hidden`}
        >
          <RightPanel />
        </div>
      </main>

      {/* 设置中心弹窗 */}
      <SettingsModal />
    </div>
  )
}
