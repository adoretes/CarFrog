import { useState, useCallback, useEffect } from 'react'
import { ChatMessages } from '../chat/ChatMessages'
import { ChatInput } from '../chat/ChatInput'
import { PromptConfig } from '../chat/PromptConfig'
import { GenerateButton } from '../chat/GenerateButton'
import { FileUpload, type FileItem } from '../chat/FileUpload'
import { SessionSidebar } from '../session/SessionSidebar'
import { useChatStore } from '../../store/chatStore'
import { useSessionStore } from '../../store/sessionStore'
import { useUiStore } from '../../store/uiStore'

let fileIdCounter = 0

export function LeftPanel() {
  const mode = useChatStore((s) => s.mode)
  const activeId = useSessionStore((s) => s.activeId)
  const setSessionListOpen = useUiStore((s) => s.setSessionListOpen)
  const activeTitle = useSessionStore((s) =>
    s.sessions.find((m) => m.id === s.activeId)?.title ?? '',
  )
  const [fileItems, setFileItems] = useState<FileItem[]>([])

  useEffect(() => {
    setFileItems([])
  }, [activeId])

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
    <div className="flex h-full w-full min-w-0">
      <SessionSidebar />
      <div className="flex flex-col flex-1 min-w-0 bg-white md:border-r md:border-gray-200">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-600 min-w-0">
            <button
              className="p-1 -ml-1 text-gray-500 hover:text-gray-700 rounded-lg transition-colors flex-shrink-0"
              onClick={() => setSessionListOpen(true)}
              title="会话列表"
              aria-label="打开会话列表"
            >
              ☰
            </button>
            {mode === 'brainstorm' && '💬 头脑风暴'}
            {mode === 'generating' && '✨ 生成中...'}
            {mode === 'refine' && '🔧 精修模式'}
            <span className="truncate max-w-[9rem] sm:max-w-[14rem] text-xs text-gray-400">
              {activeTitle || '新会话'}
            </span>
          </span>
          <GenerateButton />
        </div>

        <PromptConfig />

        <ChatMessages />

        <FileUpload
          files={fileItems}
          onAdd={handleAddFile}
          onRemove={handleRemoveFile}
        />

        <ChatInput files={fileItems} onSendComplete={handleSendComplete} />
      </div>
    </div>
  )
}
