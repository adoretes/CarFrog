import { useState, useCallback } from 'react'
import {
  MessageSquare,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { ChatMessages } from '../chat/ChatMessages'
import { ChatInput } from '../chat/ChatInput'
import { GenerateButton } from '../chat/GenerateButton'
import { FileUpload, type FileItem } from '../chat/FileUpload'
import { SessionSidebar } from '../session/SessionSidebar'
import { useChatStore } from '../../store/chatStore'
import { useSessionStore } from '../../store/sessionStore'

let fileIdCounter = 0

export function LeftPanel() {
  const mode = useChatStore((s) => s.mode)
  const activeId = useSessionStore((s) => s.activeId)
  const activeTitle = useSessionStore((s) =>
    s.sessions.find((m) => m.id === s.activeId)?.title ?? '',
  )
  const [fileItems, setFileItems] = useState<FileItem[]>([])

  // 会话切换时清空附件列表
  const [prevActiveId, setPrevActiveId] = useState(activeId)
  if (prevActiveId !== activeId) {
    setPrevActiveId(activeId)
    setFileItems([])
  }

  const handleAddFile = useCallback((fileList: FileList) => {
    const file = fileList[0]
    if (!file) return
    const id = `file_${++fileIdCounter}`
    setFileItems((prev) => [...prev, { id, file }])
  }, [])

  const handleRemoveFile = useCallback((id: string) => {
    setFileItems((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleSendComplete = useCallback(() => {
    setFileItems([])
  }, [])

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800">
      {/* 浮层抽屉 */}
      <SessionSidebar />

      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* 阶段指示胶囊 */}
          {mode === 'brainstorm' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
              <MessageSquare className="w-3 h-3 text-amber-500" />
              头脑风暴
            </span>
          )}
          {mode === 'generating' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60 shadow-xs animate-pulse">
              <Sparkles className="w-3 h-3 text-brand-500" />
              生成中...
            </span>
          )}
          {mode === 'refine' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
              <Wrench className="w-3 h-3 text-emerald-500" />
              精修模式
            </span>
          )}

          <span className="truncate text-xs text-slate-400 dark:text-slate-500 font-medium max-w-[160px] sm:max-w-[240px]">
            {activeTitle || '新角色会话'}
          </span>
        </div>

        <GenerateButton />
      </div>

      {/* 聊天消息流 */}
      <ChatMessages />

      {/* 文件上传预览 */}
      <FileUpload
        files={fileItems}
        onAdd={handleAddFile}
        onRemove={handleRemoveFile}
      />

      {/* 输入框 */}
      <ChatInput files={fileItems} onSendComplete={handleSendComplete} />
    </div>
  )
}
