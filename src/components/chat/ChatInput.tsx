import { useState, useCallback, useEffect, useRef } from 'react'
import { useChatStore } from '../../store/chatStore'
import { useCharaStore } from '../../store/charaStore'
import { sendChatMessage } from '../../api/aiChat'
import {
  parseActionsFromText,
  parseJsonFromText,
  buildApiMessages,
  buildRefineSystemPrompt,
} from '../../utils/charaUtils'

export function ChatInput() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const addMessage = useChatStore((s) => s.addMessage)
  const messages = useChatStore((s) => s.messages)
  const mode = useChatStore((s) => s.mode)
  const setMode = useChatStore((s) => s.setMode)
  const apiConfig = useChatStore((s) => s.apiConfig)
  const brainstormPrompt = useChatStore((s) => s.brainstormPrompt)
  const refinePrompt = useChatStore((s) => s.refinePrompt)
  const uploadedFiles = useChatStore((s) => s.uploadedFiles)
  const pendingRegenerate = useChatStore((s) => s.pendingRegenerate)
  const setPendingRegenerate = useChatStore((s) => s.setPendingRegenerate)
  const card = useCharaStore((s) => s.card)
  const setCard = useCharaStore((s) => s.setCard)
  const executeActions = useCharaStore((s) => s.executeActions)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSend = useCallback(async (content: string) => {
    setLoading(true)
    addMessage({ role: 'user', content })

    const apiMsg = buildApiMessages(messages, content, uploadedFiles)
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

      addMessage({ role: 'assistant', content: fullContent })

      if (mode === 'brainstorm') {
        const parsedCard = parseJsonFromText(fullContent)
        if (parsedCard) {
          setCard(parsedCard)
          addMessage({ role: 'assistant', content: '✅ 已识别角色卡数据，自动切换到精修模式。' })
          setMode('refine')
        }
      } else if (mode === 'refine') {
        const actions = parseActionsFromText(fullContent)
        if (actions.length > 0) {
          executeActions(actions)
        }
      }
    } catch (err) {
      addMessage({
        role: 'assistant',
        content: `❌ 请求失败：${err instanceof Error ? err.message : '未知错误'}`,
      })
    } finally {
      setLoading(false)
    }
  }, [messages, mode, apiConfig, brainstormPrompt, refinePrompt, uploadedFiles, card, addMessage, setCard, setMode, executeActions])

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setText('')
    doSend(trimmed)
  }, [text, loading, doSend])

  useEffect(() => {
    if (pendingRegenerate && !loading) {
      const text = pendingRegenerate
      setPendingRegenerate(null)
      doSend(text)
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
