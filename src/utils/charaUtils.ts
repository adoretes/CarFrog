import type { CharaAction, ApiMessage, ContentPart, ChatMessage } from '../types/actions'
import type { CharaCard } from '../types'
import { createEmptyCharaCard } from '../types'

export function ensureCharaCard(raw: Partial<CharaCard>): CharaCard {
  const d = createEmptyCharaCard()
  const data: CharaCard['data'] = {
    name: raw.data?.name ?? d.data.name,
    description: raw.data?.description ?? d.data.description,
    personality: raw.data?.personality ?? d.data.personality,
    scenario: raw.data?.scenario ?? d.data.scenario,
    first_mes: raw.data?.first_mes ?? d.data.first_mes,
    mes_example: raw.data?.mes_example ?? d.data.mes_example,
    creator_notes: raw.data?.creator_notes ?? d.data.creator_notes,
    system_prompt: raw.data?.system_prompt ?? d.data.system_prompt,
    post_history_instructions: raw.data?.post_history_instructions ?? d.data.post_history_instructions,
    alternate_greetings: Array.isArray(raw.data?.alternate_greetings) ? raw.data!.alternate_greetings : [],
    tags: Array.isArray(raw.data?.tags) ? raw.data!.tags : [],
    creator: raw.data?.creator ?? d.data.creator,
    character_version: raw.data?.character_version ?? d.data.character_version,
  }

  if (raw.data?.character_book) {
    data.character_book = {
      name: raw.data.character_book.name ?? null,
      entries: Array.isArray(raw.data.character_book.entries) ? raw.data.character_book.entries : [],
      extensions: raw.data.character_book.extensions ?? {},
    }
  }

  return {
    spec: (raw.spec as CharaCard['spec']) || d.spec,
    spec_version: (raw.spec_version as CharaCard['spec_version']) || d.spec_version,
    data,
  }
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function parseActionsFromText(text: string): CharaAction[] {
  const match = text.match(/<actions>([\s\S]*?)<\/actions>/)
  if (!match) return []

  const raw = match[1].trim()

  let parsed = tryParseJson(raw)
  if (Array.isArray(parsed)) return parsed as CharaAction[]

  const objRegex = /\{(?:[^{}]|(?:\{[^{}]*\}))*?\}/g
  const candidates: CharaAction[] = []
  let objMatch: RegExpExecArray | null
  while ((objMatch = objRegex.exec(raw)) !== null) {
    const obj = tryParseJson(objMatch[0])
    if (obj && typeof obj === 'object' && 'type' in (obj as Record<string, unknown>)) {
      candidates.push(obj as CharaAction)
    }
  }
  if (candidates.length > 0) return candidates

  return []
}

export function parseJsonFromText(text: string): CharaCard | null {
  const match = text.match(/```json\s*([\s\S]*?)```/)
  if (!match) return null

  const raw = match[1].trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (parsed && typeof parsed === 'object' && 'spec' in (parsed as Record<string, unknown>) && 'data' in (parsed as Record<string, unknown>)) {
    return ensureCharaCard(parsed as Partial<CharaCard>)
  }
  return null
}

export function cardToJsonString(card: CharaCard): string {
  return JSON.stringify(card, null, 2)
}

const V2_SPEC_TEMPLATE = `{
  "spec": "chara_card_v2",
  "spec_version": "2.0",
  "data": {
    "name": "角色名称（必填）",
    "description": "外貌、特征等物理描述（必填）",
    "personality": "个性特征（必填）",
    "scenario": "场景设定（必填）",
    "first_mes": "首条消息（必填，角色的第一句话）",
    "mes_example": "示例对话（可选）",
    "creator_notes": "",
    "system_prompt": "",
    "post_history_instructions": "",
    "alternate_greetings": ["替代问候语1", "替代问候语2"],
    "tags": ["标签1", "标签2"],
    "creator": "",
    "character_version": "1.0"
  }
}`

export const DEFAULT_BRAINSTORM_PROMPT = `你是一个角色设计助手。用户想创建一个 SillyTavern 角色卡。

当前阶段：**头脑风暴 — 只讨论，不生成 JSON，也不生成世界书**。

你的任务：
- 主动引导用户构思角色，建议 2-3 轮讨论即可确定大致方向
- 探讨内容包括：角色名称、外貌、性格、背景故事、场景设定、说话风格
- 世界书的设定留到后续阶段再处理，现阶段不要涉及
- 讨论差不多时提醒用户点击「✨ 生成角色卡」按钮进入生成阶段
- 绝对不要输出任何 JSON 数据
- 用中文与用户交流`

export const DEFAULT_GENERATE_PROMPT = `你是一个角色卡生成助手。根据之前的讨论，生成完整的 SillyTavern V2 角色卡。

## V2 规范（必须严格遵守）

\`\`\`json
${V2_SPEC_TEMPLATE}
\`\`\`

### 字段说明
- name（必填）：角色名称
- description（必填）：角色外貌、特征等物理描述
- personality（必填）：角色个性、行为倾向、价值观
- scenario（必填）：当前场景或情境上下文
- first_mes（必填）：角色在对话开始时的第一条消息
- mes_example（可选）：示例对话，用于引导角色语言风格
- alternate_greetings（可选）：替代开场问候语列表
- tags（可选）：角色分类标签
- creator（默认留空）：创作者名称，留空为 ""
- character_version（默认1.0）：角色版本号，默认为 "1.0"
- creator_notes、system_prompt、post_history_instructions：**必须留空**，设为 ""

### 输出结构（必须严格遵守）
依次输出两部分：

1. **角色摘要**：使用 \`## 角色摘要\` 作为标题，用简洁中文段落概述：角色名、核心定位、性格关键词、外貌亮点、场景设定、说话风格。这段摘要将作为后续精修阶段的上下文锚点，请确保信息准确凝练（150-300字）。

2. **角色卡 JSON**：使用 \`## 角色卡\` 作为标题，将完整 JSON 包裹在 \`\`\`json 代码块中。

### 注意
1. JSON 中的对话内容请使用中文引号“”或「」包裹，不要使用英文双引号
2. 永远不要生成 world book 条目，后续会在精修阶段添加
3. 必须先输出角色摘要，再输出角色卡 JSON
4. 用中文与用户交流`

export const DEFAULT_REFINE_PROMPT = `用户可以对角色卡任意字段或世界书条目提出修改要求。

## 输出规则

### 格式要求
将修改指令包裹在 <actions> 标签中，格式为 JSON 数组：

<actions>
[
  { "type": "set", "path": "data.name", "value": "新值" },
  { "type": "add", "path": "data.tags", "value": "新标签" },
  { "type": "remove", "path": "data.tags", "index": 2 }
]
</actions>

### 支持的操作
- set：设置字段值，path 指向任意字段
- add：向数组追加元素
- remove：删除数组指定索引的元素

### 重要：引号使用规则
value 中的对话内容请使用中文引号“”或「」包裹，不要使用英文双引号。
例如：
{ "type": "set", "path": "data.description", "value": "她对你说“你好”，然后笑了笑" }

### 其他要求
- 在 <actions> 之外可以附上说明文字
- 只输出需要变更的部分，精炼准确
- 用中文与用户交流`

function messageToApiMessage(m: ChatMessage): ApiMessage {
  if (!m.files || m.files.length === 0) {
    return { role: m.role, content: m.content }
  }
  const parts: ContentPart[] = [{ type: 'text', text: m.content }]
  for (const f of m.files) {
    if (f.type === 'image') {
      parts.push({ type: 'image_url', image_url: { url: f.content, detail: 'low' } })
    } else {
      parts.push({ type: 'text', text: `[上传文件: ${f.name}]\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\`` })
    }
  }
  return { role: m.role, content: parts }
}

export function buildApiMessages(
  messages: ChatMessage[],
  userText: string,
  currentFiles: { name: string; content: string; type: string }[],
): ApiMessage[] {
  const history = messages.filter((m) => !m.excluded).map(messageToApiMessage)

  if (currentFiles.length === 0) {
    return [...history, { role: 'user', content: userText }]
  }

  const parts: ContentPart[] = [{ type: 'text', text: userText }]
  for (const f of currentFiles) {
    if (f.type === 'image') {
      parts.push({ type: 'image_url', image_url: { url: f.content, detail: 'low' } })
    } else {
      parts.push({ type: 'text', text: `[上传文件: ${f.name}]\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\`` })
    }
  }

  return [...history, { role: 'user', content: parts }]
}

export function buildRefineSystemPrompt(card: CharaCard, customPrompt: string): string {
  const cardJson = JSON.stringify(card, null, 2)
  return `你是一个角色卡精修助手。当前角色卡数据：
${cardJson}

${customPrompt || DEFAULT_REFINE_PROMPT}

注意：value 中的对话内容使用“”或「」包裹，不要用英文双引号。`
}
