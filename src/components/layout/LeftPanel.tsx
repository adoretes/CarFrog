import { ChatMessages } from '../chat/ChatMessages'
import { ChatInput } from '../chat/ChatInput'
import { PromptConfig } from '../chat/PromptConfig'
import { GenerateButton } from '../chat/GenerateButton'
import { FileUpload } from '../chat/FileUpload'
import { useChatStore } from '../../store/chatStore'

export function LeftPanel() {
  const mode = useChatStore((s) => s.mode)

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
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

      <FileUpload />

      <ChatInput />
    </div>
  )
}
