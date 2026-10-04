import type { CharaCard } from './charaCard'

export type ActionType = 'set' | 'add' | 'remove' | 'replace' | 'patch'

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

/** 字段（或字符串数组元素）内的字面量替换，用于只改动长文本的一小段 */
export interface ReplaceAction {
  type: 'replace'
  path: string
  /** 必须逐字存在于目标字符串中；空串非法 */
  find: string
  /** 替换文本，允许为空串（等价删除该片段） */
  replace: string
  /** path 指向字符串数组时，目标为第 index 个元素 */
  index?: number
  /** 默认 false：仅替换第一处命中；true：替换全部命中 */
  all?: boolean
  /** 期望命中次数，实际不符时整条指令不生效（防误伤） */
  count?: number
}

export type PatchOpType = 'replace' | 'insert' | 'delete'

/** patch 内的单步编辑；保持扁平结构（不能有三级嵌套对象） */
export interface PatchOp {
  op: PatchOpType
  find: string
  /** op=replace 时的替换文本 */
  replace?: string
  /** op=insert 时插入的文本 */
  text?: string
  /** op=insert：插到 find 之前（默认之后） */
  before?: boolean
  /** op=replace / delete：命中多处时是否全部处理（默认仅第一处） */
  all?: boolean
}

/** 对同一目标按顺序执行多条编辑，任一 op 失败则整条不生效（原子） */
export interface PatchAction {
  type: 'patch'
  path: string
  index?: number
  ops: PatchOp[]
}

export type CharaAction = SetAction | AddAction | RemoveAction | ReplaceAction | PatchAction

export type ActionFailReason =
  | 'unknown_type'
  | 'bad_path'
  | 'not_string'
  | 'empty_find'
  | 'not_found'
  | 'count_mismatch'
  | 'bad_index'
  | 'invalid_ops'

/** 单条精修指令的应用结果，用于在聊天里反馈成功/失败 */
export interface ActionReportItem {
  type: string
  path: string
  index?: number
  ok: boolean
  reason?: ActionFailReason
  /** find 在目标文本中出现的次数 */
  occurrences?: number
  /** 实际替换/删除的次数 */
  replaced?: number
  /** patch 中失败 op 的下标 */
  failedOp?: number
}

export type ActionReport = ActionReportItem[]

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
  /** 流式输出中：ChatMessages 对该消息用纯文本渲染，避免逐 token 全量 Markdown 重解析 */
  streaming?: boolean
  /** 精修指令应用前的角色卡快照，用于「回滚」按钮还原卡片 */
  cardSnapshot?: CharaCard
  /** 本次回复中逐条精修指令的应用结果 */
  actionReport?: ActionReport
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
