export type ActionType = 'set' | 'add' | 'remove'

export interface SetAction {
  type: 'set'
  path: string
  value: unknown
  index?: number
}

export interface AddAction {
  type: 'add'
  path: string
  value: unknown
}

export interface RemoveAction {
  type: 'remove'
  path: string
  index: number
}

export type CharaAction = SetAction | AddAction | RemoveAction

export type ChatMode = 'brainstorm' | 'generating' | 'refine'

export interface UploadedFile {
  name: string
  content: string
  type: string
}

export interface PendingRegenerate {
  content: string
  files: UploadedFile[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  excluded?: boolean
  files?: UploadedFile[]
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' }
}

export interface ApiMessage {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface ApiConfig {
  baseUrl: string
  apiKey: string
  model: string
}
