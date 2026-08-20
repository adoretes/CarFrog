import { useState, useCallback, useEffect, useRef } from 'react'
import { useChatStore } from '../../store/chatStore'
import { useCharaStore } from '../../store/charaStore'
import { useSessionStore } from '../../store/sessionStore'
import { sendChatMessage } from '../../api/aiChat'
import {
  parseActionsFromText,
  parseJsonFromText,
  buildApiMessages,
  buildRefineSystemPrompt,
} from '../../utils/charaUtils'
import { readFileAsText, readFileAsDataUrl } from '../../utils/fileUtils'
import { useGenerateCard } from './useGenerateCard'
import type { FileItem } from './FileUpload'
import type { UploadedFile } from '../../types/actions'

interface ChatInputProps {
  files: FileItem[]
  onSendComplete: () => void
}

async function readFiles(files: FileItem[]) {
  const result: { name: string; content: string; type: string }[] = []
  for (const f of files) {
    if (f.file.type.startsWith('image/')) {
      const dataUrl = await readFileAsDataUrl(f.file)
      result.push({ name: f.file.name, content: dataUrl, type: 'image' })
    } else {
      const text = await readFileAsText(f.file)
      result.push({ name: f.file.name, content: text, type: 'text' })
    }
  }
  return result
}

export function ChatInput({ files, onSendComplete }: ChatInputProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const addMessage = useChatStore((s) => s.addMessage)
  const messages = useChatStore((s) => s.messages)
  const mode = useChatStore((s) => s.mode)
  const setMode = useChatStore((s) => s.setMode)
  const excludePreviousMessages = useChatStore((s) => s.excludePreviousMessages)
  const apiConfig = useChatStore((s) => s.apiConfig)
  const brainstormPrompt = useChatStore((s) => s.brainstormPrompt)
  const refinePrompt = useChatStore((s) => s.refinePrompt)
  const pendingRegenerate = useChatStore((s) => s.pendingRegenerate)
  const setPendingRegenerate = useChatStore((s) => s.setPendingRegenerate)
  const card = useCharaStore((s) => s.card)
  const setCard = useCharaStore((s) => s.setCard)
  const executeActions = useCharaStore((s) => s.executeActions)
  const inputRef = useRef<HTMLInputElement>(null)
  const { generate: generateCard } = useGenerateCard()

  const doSend = useCallback(async (content: string, regenerateFiles?: UploadedFile[]) => {
    const sessionId = useSessionStore.getState().activeId
    setLoading(true)

    const fileData = regenerateFiles ?? (await readFiles(files))
    if (useSessionStore.getState().activeId !== sessionId) {
      setLoading(false)
      return
    }
    addMessage({ role: 'user', content, files: fileData })
    onSendComplete()

    const apiMsg = buildApiMessages(messages, content, fileData)
    const systemPrompt =
      mode === 'brainstorm'
        ? brainstormPrompt
        : buildRefineSystemPrompt(card, refinePrompt)

    try {
      let currentContent = ''
      const fullContent = await sendChatMessage(
        apiMsg,
        systemPrompt,
        apiConfig,
        (chunk) => {
          currentContent = chunk
        },
      )

      if (useSessionStore.getState().activeId !== sessionId) return

      addMessage({ role: 'assistant', content: fullContent })

      if (mode === 'brainstorm') {
        const parsedCard = parseJsonFromText(fullContent)
        if (parsedCard) {
          const existingWb = card.data.character_book
          if (existingWb?.entries.length && !parsedCard.data.character_book?.entries.length) {
            parsedCard.data.character_book = existingWb
          }
          setCard(parsedCard)
          excludePreviousMessages()
          addMessage({ role: 'assistant', content: '✅ 已识别角色卡数据，头脑风暴阶段的对话已折叠（不再参与精修上下文），自动切换到精修模式。' })
          setMode('refine')
        }
      } else if (mode === 'refine') {
        const actions = parseActionsFromText(fullContent)
        if (actions.length > 0) {
          executeActions(actions)
        }
      }
    } catch (err) {
      if (useSessionStore.getState().activeId !== sessionId) return
      addMessage({
        role: 'assistant',
        content: `❌ 请求失败：${err instanceof Error ? err.message : '未知错误'}`,
      })
    } finally {
      setLoading(false)
    }
  }, [messages, mode, apiConfig, brainstormPrompt, refinePrompt, card, files, addMessage, setCard, setMode, executeActions, onSendComplete])

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setText('')
    if (mode === 'brainstorm' && trimmed.includes('生成')) {
      const sessionId = useSessionStore.getState().activeId
      const fileData = await readFiles(files)
      if (useSessionStore.getState().activeId !== sessionId) return
      addMessage({ role: 'user', content: trimmed, files: fileData })
      onSendComplete()
      generateCard([])
      return
    }
    doSend(trimmed)
  }, [text, loading, mode, doSend, addMessage, generateCard, files, onSendComplete])

  useEffect(() => {
    if (pendingRegenerate && !loading) {
      const data = pendingRegenerate
      setPendingRegenerate(null)
      doSend(data.content, data.files)
    }
  }, [pendingRegenerate, loading, doSend, setPendingRegenerate])

  useEffect(() => {
    if (!loading) inputRef.current?.focus()
  }, [loading])

  if (mode === 'generating') return null

  return (
    <div className="border-t border-gray-200 p-2 sm:p-3">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          placeholder={
            mode === 'brainstorm'
              ? '描述你想要的角色...'
              : '输入修改要求...'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={loading}
        />
        <button
          className="px-3 sm:px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap flex-shrink-0"
          onClick={handleSend}
          disabled={loading || !text.trim() || !apiConfig.apiKey}
        >
          {loading ? '...' : '发送'}
        </button>
      </div>
    </div>
  )
}
