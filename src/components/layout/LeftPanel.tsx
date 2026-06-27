import { useState, useCallback } from 'react'
import { ChatMessages } from '../chat/ChatMessages'
import { ChatInput } from '../chat/ChatInput'
import { PromptConfig } from '../chat/PromptConfig'
import { GenerateButton } from '../chat/GenerateButton'
import { FileUpload, type FileItem } from '../chat/FileUpload'
import { useChatStore } from '../../store/chatStore'

let fileIdCounter = 0

export function LeftPanel() {
  const mode = useChatStore((s) => s.mode)
  const [fileItems, setFileItems] = useState<FileItem[]>([])

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
    <div className="flex flex-col h-full w-full min-w-0 bg-white md:border-r md:border-gray-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <span className="text-sm font-medium text-gray-600">
          {mode === 'brainstorm' && '💬 头脑风暴'}
          {mode === 'generating' && '✨ 生成中...'}
          {mode === 'refine' && '🔧 精修模式'}
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
  )
}
