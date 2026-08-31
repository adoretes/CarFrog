import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '../chatStore'
import { createEmptyCharaCard } from '../../types'

function resetStore() {
  useChatStore.setState({ messages: [], pendingRegenerate: null })
}

describe('chatStore attachCardSnapshot', () => {
  beforeEach(resetStore)

  it('将快照附加到最后一条 assistant 消息', () => {
    useChatStore.getState().addMessage({ role: 'user', content: '让问候语更活泼' })
    useChatStore.getState().addMessage({ role: 'assistant', content: 'ok' })
    useChatStore.getState().attachCardSnapshot(createEmptyCharaCard())
    const messages = useChatStore.getState().messages
    const last = messages[messages.length - 1]
    expect(last.role).toBe('assistant')
    expect(last.cardSnapshot).toBeDefined()
  })

  it('消息为空或最后一条为 user 时不产生副作用', () => {
    useChatStore.getState().attachCardSnapshot(createEmptyCharaCard())
    expect(useChatStore.getState().messages).toEqual([])

    useChatStore.getState().addMessage({ role: 'user', content: 'xxx' })
    useChatStore.getState().attachCardSnapshot(createEmptyCharaCard())
    expect(useChatStore.getState().messages.find((m) => m.role === 'user')?.cardSnapshot).toBeUndefined()
  })

  it('快照记录的是应用微调指令前的角色卡', () => {
    useChatStore.getState().addMessage({ role: 'user', content: '改名字' })
    useChatStore.getState().addMessage({ role: 'assistant', content: '<actions>ok</actions>' })
    useChatStore.getState().attachCardSnapshot(createEmptyCharaCard())

    const messages = useChatStore.getState().messages
    const snapshot = messages[messages.length - 1].cardSnapshot
    expect(snapshot).not.toBeNull()
  })
})
