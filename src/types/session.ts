import type { ChatMessage, ChatMode, PendingRegenerate } from './actions'
import type { CharaCard } from './charaCard'

export interface SessionMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface SessionData {
  messages: ChatMessage[]
  mode: ChatMode
  card: CharaCard
  avatar: string | null
  pendingRegenerate: PendingRegenerate | null
}
