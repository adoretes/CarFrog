import { useState, useCallback } from 'react'
import { useChatStore } from '../../store/chatStore'
import { useCharaStore } from '../../store/charaStore'
import { sendChatMessageNonStream } from '../../api/aiChat'
import { parseJsonFromText, buildApiMessages } from '../../utils/charaUtils'

export function useGenerateCard() {
  const { mode, setMode, messages, apiConfig, addMessage, generatePrompt, uploadedFiles, excludePreviousMessages } = useChatStore()
  const setCard = useCharaStore((s) => s.setCard)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
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

    const generateMsg = buildApiMessages(messages, '请根据我们的讨论，生成完整的角色卡 JSON 和世界书条目。', uploadedFiles)

    const summary = generateMsg
      .map((m) => `${m.role === 'user' ? '用户' : 'AI'}：${typeof m.content === 'string' ? m.content : '[包含图片]'}`)
      .join('\n\n')

    const systemPrompt = `${generatePrompt}\n\n之前的讨论摘要：\n${summary}`

    try {
      const fullContent = await sendChatMessageNonStream(
        generateMsg,
        systemPrompt,
        apiConfig,
      )

      addMessage({ role: 'assistant', content: fullContent })

      const card = parseJsonFromText(fullContent)
      if (card) {
        setCard(card)
        excludePreviousMessages()
        addMessage({ role: 'assistant', content: '✅ 角色卡已生成！头脑风暴阶段的对话已折叠，不再参与精修上下文（精修时会自动注入当前角色卡数据）。' })
        setMode('refine')
      } else {
        addMessage({ role: 'assistant', content: '❌ 未能从回复中解析出角色卡 JSON，请重试。' })
        setMode('brainstorm')
      }
    } catch (err) {
      addMessage({
        role: 'assistant',
        content: `❌ 生成失败：${err instanceof Error ? err.message : '未知错误'}`,
      })
      setMode('brainstorm')
    } finally {
      setLoading(false)
    }
  }, [messages, apiConfig, generatePrompt, uploadedFiles, addMessage, setMode, setCard, excludePreviousMessages])

  return { generate, loading, mode }
}
