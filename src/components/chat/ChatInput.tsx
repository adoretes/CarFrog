import { useState, useCallback, useEffect, useRef } from 'react'
import { Send, Square } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useCharaStore } from '../../store/charaStore'
import { useSessionStore } from '../../store/sessionStore'
import { sendChatMessage } from '../../api/aiChat'
import { setActiveRequest, abortActiveRequest, isAbortError } from '../../api/requestControl'
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

const GENERATE_COMMAND_RE = /^(请|帮我|麻烦)?生成(角色卡|卡片|角色)?$/
const TEXTAREA_MAX_HEIGHT = 180

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
  const updateStreamingMessage = useChatStore((s) => s.updateStreamingMessage)
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
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { generate: generateCard } = useGenerateCard()

  const autoResize = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`
  }, [])

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

    const controller = new AbortController()
    setActiveRequest(controller)
    let receivedContent = ''

    try {
      addMessage({ role: 'assistant', content: '', streaming: true })
      const fullContent = await sendChatMessage(
        apiMsg,
        systemPrompt,
        apiConfig,
        (chunk) => {
          receivedContent = chunk
          if (useSessionStore.getState().activeId === sessionId) {
            useChatStore.getState().updateStreamingMessage(chunk)
          }
        },
        controller.signal,
      )

      if (useSessionStore.getState().activeId !== sessionId) return
      updateStreamingMessage(fullContent, true)

      if (mode === 'brainstorm') {
        const parsedCard = parseJsonFromText(fullContent)
        if (parsedCard) {
          const existingWb = card.data.character_book
          if (existingWb?.entries.length && !parsedCard.data.character_book?.entries.length) {
            parsedCard.data.character_book = existingWb
          }
          setCard(parsedCard)
          excludePreviousMessages()
          addMessage({ role: 'assistant', content: '✅ 已识别角色卡数据，头脑风暴阶段的对话已折叠，自动切换到精修模式。' })
          setMode('refine')
        }
      } else if (mode === 'refine') {
        const actions = parseActionsFromText(fullContent)
        if (actions.length > 0) {
          const snapshot = structuredClone(useCharaStore.getState().card)
          executeActions(actions)
          useChatStore.getState().attachCardSnapshot(snapshot)
        }
      }
    } catch (err) {
      if (useSessionStore.getState().activeId !== sessionId) return
      if (isAbortError(err)) {
        updateStreamingMessage(receivedContent ? `${receivedContent}\n\n⏹ _（已停止生成）_` : '⏹ _（已停止生成）_', true)
      } else {
        updateStreamingMessage(`❌ 请求失败：${err instanceof Error ? err.message : '未知错误'}`, true)
      }
    } finally {
      setActiveRequest(null)
      setLoading(false)
    }
  }, [messages, mode, apiConfig, brainstormPrompt, refinePrompt, card, files, addMessage, updateStreamingMessage, excludePreviousMessages, setCard, setMode, executeActions, onSendComplete])

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setText('')
    requestAnimationFrame(autoResize)
    if (mode === 'brainstorm' && GENERATE_COMMAND_RE.test(trimmed)) {
      const sessionId = useSessionStore.getState().activeId
      const fileData = await readFiles(files)
      if (useSessionStore.getState().activeId !== sessionId) return
      addMessage({ role: 'user', content: trimmed, files: fileData })
      onSendComplete()
      generateCard(fileData)
      return
    }
    doSend(trimmed)
  }, [text, loading, mode, doSend, addMessage, generateCard, files, onSendComplete, autoResize])

  useEffect(() => {
    if (pendingRegenerate && !loading) {
      const data = pendingRegenerate
      setPendingRegenerate(null)
      // 消费来自 ChatMessages 的"重新生成"事件（外部 store 触发的命令式调用）
      // eslint-disable-next-line react-hooks/set-state-in-effect
      doSend(data.content, data.files)
    }
  }, [pendingRegenerate, loading, doSend, setPendingRegenerate])

  useEffect(() => {
    if (!loading) inputRef.current?.focus()
  }, [loading])

  if (mode === 'generating') return null

  const isConfigReady = !!apiConfig.apiKey

  return (
    <div className="border-t border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs">
      <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/90 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all shadow-2xs">
        <textarea
          ref={inputRef}
          rows={1}
          className="flex-1 min-w-0 px-2.5 py-1.5 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none overflow-y-auto max-h-[180px] leading-relaxed"
          placeholder={
            !isConfigReady
              ? '请先在右上角「设置」中配置 API Key...'
              : mode === 'brainstorm'
                ? '描述你的角色设想，与 AI 探讨细节...'
                : '输入微调指令（如：让问候语更活泼点）...'
          }
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            autoResize()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={loading}
        />

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className={`flex items-center justify-center w-8 h-8 rounded-xl text-white transition-all shadow-sm active:scale-95 ${
              loading
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600 disabled:cursor-not-allowed'
            }`}
            onClick={() => (loading ? abortActiveRequest() : handleSend())}
            disabled={!loading && (!text.trim() || !apiConfig.apiKey)}
            title={loading ? '停止生成' : '发送消息 (Enter)'}
          >
            {loading ? (
              <Square className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-slate-400 select-none">
        <span>Enter 发送，Shift + Enter 换行</span>
        {mode === 'refine' && <span className="text-emerald-500">已激活精修指令模式</span>}
      </div>
    </div>
  )
}
