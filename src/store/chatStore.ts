import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, ChatMode, ApiConfig, PendingRegenerate } from '../types/actions'
import type { CharaCard } from '../types'
import {
  DEFAULT_BRAINSTORM_PROMPT,
  DEFAULT_GENERATE_PROMPT,
  DEFAULT_REFINE_PROMPT,
} from '../utils/charaUtils'

interface ChatState {
  messages: ChatMessage[]
  mode: ChatMode
  apiConfig: ApiConfig
  brainstormPrompt: string
  generatePrompt: string
  refinePrompt: string
  pendingRegenerate: PendingRegenerate | null
  addMessage: (msg: ChatMessage) => void
  setMessages: (msgs: ChatMessage[]) => void
  updateStreamingMessage: (content: string, done?: boolean) => void
  attachCardSnapshot: (snapshot: CharaCard) => void
  removeMessage: (index: number) => void
  excludePreviousMessages: () => void
  setMode: (mode: ChatMode) => void
  setApiConfig: (config: Partial<ApiConfig>) => void
  setBrainstormPrompt: (prompt: string) => void
  setGeneratePrompt: (prompt: string) => void
  setRefinePrompt: (prompt: string) => void
  setPendingRegenerate: (data: PendingRegenerate | null) => void
  resetChat: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      mode: 'brainstorm',
      apiConfig: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o',
      },
      brainstormPrompt: DEFAULT_BRAINSTORM_PROMPT,
      generatePrompt: DEFAULT_GENERATE_PROMPT,
      refinePrompt: DEFAULT_REFINE_PROMPT,
      pendingRegenerate: null,

      addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

      setMessages: (messages) => set({ messages }),

      updateStreamingMessage: (content, done = false) =>
        set((state) => {
          const messages = [...state.messages]
          const last = messages.length - 1
          if (last >= 0 && messages[last].role === 'assistant') {
            messages[last] = { ...messages[last], content, streaming: !done }
          }
          return { messages }
        }),

      attachCardSnapshot: (snapshot) =>
        set((state) => {
          const messages = [...state.messages]
          const last = messages.length - 1
          if (last >= 0 && messages[last].role === 'assistant') {
            messages[last] = { ...messages[last], cardSnapshot: snapshot }
          }
          return { messages }
        }),

      removeMessage: (index) =>
        set((state) => ({
          messages: state.messages.filter((_, i) => i !== index),
        })),

      excludePreviousMessages: () =>
        set((state) => ({
          messages: state.messages.map((m, i) =>
            i === state.messages.length - 1 ? m : { ...m, excluded: true },
          ),
        })),

      setMode: (mode) => set({ mode }),

      setApiConfig: (config) =>
        set((state) => ({ apiConfig: { ...state.apiConfig, ...config } })),

      setBrainstormPrompt: (brainstormPrompt) => set({ brainstormPrompt }),
      setGeneratePrompt: (generatePrompt) => set({ generatePrompt }),
      setRefinePrompt: (refinePrompt) => set({ refinePrompt }),

      setPendingRegenerate: (pendingRegenerate) => set({ pendingRegenerate }),

      resetChat: () =>
        set({
          messages: [],
          mode: 'brainstorm',
          pendingRegenerate: null,
        }),
    }),
    {
      name: 'carfrog-settings',
      partialize: (state) => ({
        apiConfig: state.apiConfig,
        brainstormPrompt: state.brainstormPrompt,
        generatePrompt: state.generatePrompt,
        refinePrompt: state.refinePrompt,
      }),
    },
  ),
)
