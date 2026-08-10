import { getAllMeta, generateId, putMeta, putSessionData } from './idb'
import { createEmptyCharaCard } from '../types'
import { ensureCharaCard } from './charaUtils'
import type { ApiConfig, ChatMessage, ChatMode } from '../types/actions'
import type { CharaCard } from '../types'

const LEGACY_CHAT_KEY = 'carfrog-chat'
const LEGACY_CHARA_KEY = 'carfrog-chara'
const SETTINGS_KEY = 'carfrog-settings'
const MIGRATED_FLAG = 'carfrog-migrated-v2'

interface LegacyChat {
  messages?: ChatMessage[]
  mode?: ChatMode
  apiConfig?: ApiConfig
  brainstormPrompt?: string
  generatePrompt?: string
  refinePrompt?: string
}

interface LegacyChara {
  card?: CharaCard
  avatar?: string | null
}

function pickTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user')
  return first ? first.content.replace(/\s+/g, ' ').trim().slice(0, 30) : ''
}

export async function migrateLegacyData(): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return
    const metas = await getAllMeta()
    const chatRaw = localStorage.getItem(LEGACY_CHAT_KEY)
    if (metas.length > 0 || !chatRaw) {
      localStorage.setItem(MIGRATED_FLAG, '1')
      return
    }
    const chat: LegacyChat = JSON.parse(chatRaw)
    if (!chat.messages?.length) {
      localStorage.setItem(MIGRATED_FLAG, '1')
      return
    }

    let chara: LegacyChara = {}
    const charaRaw = localStorage.getItem(LEGACY_CHARA_KEY)
    if (charaRaw) {
      try {
        chara = JSON.parse(charaRaw)
      } catch {
        chara = {}
      }
    }

    const id = generateId()
    const now = Date.now()
    await putMeta({ id, title: pickTitle(chat.messages), createdAt: now, updatedAt: now })
    await putSessionData(id, {
      messages: chat.messages,
      mode: chat.mode ?? 'brainstorm',
      card: ensureCharaCard(chara.card ?? createEmptyCharaCard()),
      avatar: chara.avatar ?? null,
      pendingRegenerate: null,
    })

    if (!localStorage.getItem(SETTINGS_KEY)) {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          state: {
            apiConfig: chat.apiConfig,
            brainstormPrompt: chat.brainstormPrompt,
            generatePrompt: chat.generatePrompt,
            refinePrompt: chat.refinePrompt,
          },
          version: 0,
        }),
      )
    }

    localStorage.setItem(MIGRATED_FLAG, '1')
  } catch {
    // 迁移失败不阻塞启动，保持旧数据原样
  }
}
