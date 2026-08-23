import { useState, useCallback } from 'react'
import { useChatStore } from '../../store/chatStore'
import { useCharaStore } from '../../store/charaStore'
import { useSessionStore } from '../../store/sessionStore'
import { sendChatMessageNonStream } from '../../api/aiChat'
import { setActiveRequest, abortActiveRequest, isAbortError } from '../../api/requestControl'
import { parseJsonFromText, buildApiMessages } from '../../utils/charaUtils'

export function useGenerateCard() {
  const setMode = useChatStore((s) => s.setMode)
  const setCard = useCharaStore((s) => s.setCard)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async (currentFiles: { name: string; content: string; type: string }[] = []) => {
    // 用 getState 取调用时刻的最新消息：handleSend 关键词分支里
    // 刚 addMessage 的用户消息和附件必须进入生成上下文
    const { messages, apiConfig, generatePrompt, addMessage, excludePreviousMessages } = useChatStore.getState()

    if (messages.length === 0) {
      addMessage({ role: 'assistant', content: '请先在聊天中讨论角色设定，再点击生成。' })
      return
    }

    if (!apiConfig.apiKey) {
      addMessage({ role: 'assistant', content: '请先在 API 配置中填写 API Key。' })
      return
    }

    setLoading(true)
    setMode('generating')
    const sessionId = useSessionStore.getState().activeId
    const controller = new AbortController()
    setActiveRequest(controller)

    const generateMsg = buildApiMessages(messages, '请根据我们的讨论，生成完整的角色卡 JSON 和世界书条目。', currentFiles)

    const summary = generateMsg
      .map((m) => `${m.role === 'user' ? '用户' : 'AI'}：${typeof m.content === 'string' ? m.content : '[包含图片]'}`)
      .join('\n\n')

    const systemPrompt = `${generatePrompt}\n\n之前的讨论摘要：\n${summary}`

    try {
      const fullContent = await sendChatMessageNonStream(
        generateMsg,
        systemPrompt,
        apiConfig,
        controller.signal,
      )

      if (useSessionStore.getState().activeId !== sessionId) return

      addMessage({ role: 'assistant', content: fullContent })

      const card = parseJsonFromText(fullContent)
      if (card) {
        const existingWb = useCharaStore.getState().card.data.character_book
        if (existingWb?.entries.length && !card.data.character_book?.entries.length) {
          card.data.character_book = existingWb
        }
        setCard(card)
        excludePreviousMessages()
        addMessage({ role: 'assistant', content: '✅ 角色卡已生成！头脑风暴阶段的对话已折叠，不再参与精修上下文（精修时会自动注入当前角色卡数据）。' })
        setMode('refine')
      } else {
        addMessage({ role: 'assistant', content: '❌ 未能从回复中解析出角色卡 JSON，请重试。' })
        setMode('brainstorm')
      }
    } catch (err) {
      if (useSessionStore.getState().activeId !== sessionId) return
      if (isAbortError(err)) {
        addMessage({ role: 'assistant', content: '⏹ 已取消生成，可继续头脑风暴讨论。' })
      } else {
        addMessage({
          role: 'assistant',
          content: `❌ 生成失败：${err instanceof Error ? err.message : '未知错误'}`,
        })
      }
      setMode('brainstorm')
    } finally {
      setActiveRequest(null)
      setLoading(false)
    }
  }, [setMode, setCard])

  return { generate, loading, abort: abortActiveRequest, mode: useChatStore((s) => s.mode) }
}
