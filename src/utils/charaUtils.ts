import type { CharaAction, ApiMessage, ContentPart, ChatMessage } from '../types/actions'
import type { CharaCard, CharaCardData } from '../types'
import { createEmptyCharaCard } from '../types'
import { entriesToArray } from './wbUtils'

/** 从任意对象安全取字符串字段 */
function str(source: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = source?.[key]
  return typeof value === 'string' ? value : undefined
}

/** 从任意对象安全取字符串数组字段 */
function strArray(source: Record<string, unknown> | undefined, key: string): string[] | undefined {
  const value = source?.[key]
  if (!Array.isArray(value)) return undefined
  return value.filter((v): v is string => typeof v === 'string')
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** V1 平铺卡的特征字段（出现越多越可信） */
const V1_FLAT_KEYS = ['name', 'description', 'personality', 'first_mes', 'scenario', 'mes_example']

/**
 * 判断是否是本工具认识的卡片外层结构。
 *
 * V1 老卡（chub.ai 等）是**顶层平铺**的：`{ name, description, ... }`，
 * 没有 spec/data 包裹。这里把两种形状统一判定，避免导入路径各自散落 `spec && data` 判断。
 *
 * V1 判定要求至少命中 2 个特征字段：`{"name": "..."}` 这种随手写的 JSON
 * （模型在头脑风暴里很常见）不应被误判成角色卡而触发自动切换精修模式。
 */
export function normalizeCardInput(raw: unknown): Partial<CharaCard> | null {
  if (!isPlainObject(raw)) return null

  // V2 / V3：有 data 包裹（spec 可能缺失或拼错，尽量宽容）
  if (isPlainObject(raw.data)) {
    return raw as unknown as Partial<CharaCard>
  }

  const hits = V1_FLAT_KEYS.filter((k) => typeof raw[k] === 'string').length
  if (hits >= 2) {
    return { spec: 'chara_card_v2', spec_version: '2.0', data: raw as unknown as CharaCardData }
  }

  return null
}

/** 以字符串键读写任意对象（用于搬运扩展字段） */
function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {}
}

/**
 * 归一化角色卡：补全缺失字段，同时**保留** V2/V3 的扩展与 V3 独有字段。
 *
 * 刻意不做「白名单重建」——那会让 V3 的 nickname / assets /
 * group_only_greetings 等在导入即静默丢失。
 */
export function ensureCharaCard(raw: Partial<CharaCard> | null | undefined): CharaCard {
  const normalized = normalizeCardInput(raw) ?? {}
  const rawData = asRecord((normalized as { data?: unknown }).data)

  const empty = createEmptyCharaCard().data

  const data: CharaCardData = {
    name: str(rawData, 'name') ?? empty.name,
    description: str(rawData, 'description') ?? empty.description,
    personality: str(rawData, 'personality') ?? empty.personality,
    scenario: str(rawData, 'scenario') ?? empty.scenario,
    first_mes: str(rawData, 'first_mes') ?? empty.first_mes,
    mes_example: str(rawData, 'mes_example') ?? empty.mes_example,
    creator_notes: str(rawData, 'creator_notes') ?? empty.creator_notes,
    system_prompt: str(rawData, 'system_prompt') ?? empty.system_prompt,
    post_history_instructions:
      str(rawData, 'post_history_instructions') ?? empty.post_history_instructions,
    alternate_greetings: strArray(rawData, 'alternate_greetings') ?? [],
    tags: strArray(rawData, 'tags') ?? [],
    creator: str(rawData, 'creator') ?? empty.creator,
    character_version: str(rawData, 'character_version') ?? empty.character_version,
  }

  // 原样搬运未知/扩展字段（含 V3 独有字段与未来的第三方扩展）
  const KNOWN: (keyof CharaCardData)[] = [
    'name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example',
    'creator_notes', 'system_prompt', 'post_history_instructions',
    'alternate_greetings', 'tags', 'creator', 'character_version', 'character_book',
  ]
  for (const [key, value] of Object.entries(rawData)) {
    if (KNOWN.includes(key as keyof CharaCardData)) continue
    if (value === undefined) continue
    ;(data as unknown as Record<string, unknown>)[key] = value
  }

  if (rawData.character_book !== undefined && rawData.character_book !== null) {
    const cb = isPlainObject(rawData.character_book) ? rawData.character_book : {}
    data.character_book = {
      name: typeof cb.name === 'string' ? cb.name : null,
      entries: entriesToArray(cb.entries),
      ...(isPlainObject(cb.extensions) ? { extensions: cb.extensions } : {}),
    }
  }

  const rawSpec = (normalized as { spec?: unknown }).spec
  const spec = rawSpec === 'chara_card_v3' ? 'chara_card_v3' : 'chara_card_v2'
  const rawVersion = (normalized as { spec_version?: unknown }).spec_version
  const specVersion =
    typeof rawVersion === 'string' && rawVersion ? rawVersion : spec === 'chara_card_v3' ? '3.0' : '2.0'

  return { spec, spec_version: specVersion, data }
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

  const parsed = tryParseJson(raw)
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

/**
 * 从模型回复中提取角色卡 JSON。
 *
 * 宽容策略（模型经常不听话）：
 * - 优先取 ```json 围栏；没有围栏时退化为扫描第一个平衡的 {...} 块；
 * - 同时接受 V2/V3（有 data 包裹）与 V1（顶层平铺）。
 */
export function parseJsonFromText(text: string): CharaCard | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidates: string[] = []

  if (fenced) {
    candidates.push(fenced[1].trim())
  } else {
    // 无围栏：扫描平衡大括号，挑最外层对象
    const start = text.indexOf('{')
    if (start !== -1) {
      let depth = 0
      let inString = false
      let escaped = false
      for (let i = start; i < text.length; i++) {
        const ch = text[i]
        if (inString) {
          if (escaped) escaped = false
          else if (ch === '\\') escaped = true
          else if (ch === '"') inString = false
          continue
        }
        if (ch === '"') inString = true
        else if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) {
            candidates.push(text.slice(start, i + 1))
            break
          }
        }
      }
    }
  }

  for (const raw of candidates) {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue
    }
    const normalized = normalizeCardInput(parsed)
    if (normalized) return ensureCharaCard(normalized)
  }

  return null
}

export function cardToJsonString(card: CharaCard): string {
  return JSON.stringify(card, null, 2)
}

/** V3 独有字段：回填 V2 时需要剥离 */
const V3_ONLY_KEYS = [
  'nickname',
  'creator_notes_multilingual',
  'source',
  'group_only_greetings',
  'creation_date',
  'modification_date',
  'assets',
] as const

const V2_BACKFILL_NOTICE =
  'This character card is Character Card V3, but it is loaded as a Character Card V2. ' +
  'Please use a Character Card V3 compatible application to use this character card properly.'

/**
 * 生成 V3 卡片回填用的 V2 对象。
 *
 * V3 规范要求：写入 `ccv3` 块时，也应在 `chara` 块放一份 V2 回填，
 * 让不认识 V3 的前端仍能读到角色；并**应当**在 creator_notes 里说明这是回填降级。
 */
export function buildV2Backfill(card: CharaCard): CharaCard {
  const data: CharaCardData = { ...card.data }
  for (const key of V3_ONLY_KEYS) {
    delete (data as unknown as Record<string, unknown>)[key]
  }
  const note = data.creator_notes ? `${data.creator_notes}\n\n${V2_BACKFILL_NOTICE}` : V2_BACKFILL_NOTICE
  data.creator_notes = note

  return { spec: 'chara_card_v2', spec_version: '2.0', data }
}

/**
 * 组装写进 PNG 的载荷。
 *
 * - V2 卡：只写 `chara`，保持与旧版本一致的产物；
 * - V3 卡：写 `chara`（V2 回填）+ `ccv3`（完整 V3）。
 *   `chara` 放前面，使不认识 V3 的工具按「取第一个」的习惯拿到可用的降级卡。
 */
export function buildPngCardPayloads(card: CharaCard): { v2Json: string; v3Json?: string } {
  if (card.spec === 'chara_card_v3') {
    return {
      v2Json: cardToJsonString(buildV2Backfill(card)),
      v3Json: cardToJsonString({
        ...card,
        spec: 'chara_card_v3',
        spec_version: card.spec_version || '3.0',
      }),
    }
  }
  return { v2Json: cardToJsonString(card) }
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
将修改指令包裹在 <actions> 标签中，格式为 JSON 数组（整张卡只输出一个 <actions> 块）：

<actions>
[
  { "type": "replace", "path": "data.description", "find": "她怕黑", "replace": "她不怕黑" },
  { "type": "set", "path": "data.name", "value": "新值" },
  { "type": "add", "path": "data.tags", "value": "新标签" },
  { "type": "remove", "path": "data.tags", "index": 2 }
]
</actions>

### 支持的操作
1. replace：字段内局部替换（改一句、删一句、插入一小段都靠它，长文本首选）
   - "find"：必须逐字存在于当前字段中（从上面注入的卡片 JSON 里原样复制）
   - "replace"：替换文本；设为 "" 表示删除该片段
   - "all"：可选，默认 false（只替换第一处）；true 表示替换全部命中
   - "count"：可选，声明期望命中次数，实际不符时整条指令不生效（防止改错位置）
   - "index"：可选，path 指向字符串数组（如 data.alternate_greetings）时指定元素下标

2. patch：对同一字段按顺序执行多条编辑，任一 op 未命中则整条不生效（原子），适合一次改多处
   { "type": "patch", "path": "data.first_mes", "ops": [
     { "op": "replace", "find": "你好", "replace": "好久不见" },
     { "op": "delete", "find": "（笑）" },
     { "op": "insert", "find": "好久不见", "text": "，", "before": false }
   ] }
   - "replace" / "delete" 支持 "all"；"insert" 默认插在 "find" 之后，"before" 为 true 时插在之前
   - ops 的元素保持扁平（只有字符串/数字/布尔），不要嵌套

3. set：整段设置字段值。短字段或整段重写时使用；长文本请优先用 replace / patch，不要用 set 重发整段
4. add：向数组追加一个元素
5. remove：删除数组指定索引的元素

### 路径示例
- 普通字段：data.description、data.personality、data.scenario、data.first_mes、data.mes_example
- 字符串数组元素：path = "data.alternate_greetings"，配合 index = 1
- 世界书条目：data.character_book.entries[2].content、data.character_book.entries[0].keys

### 选择策略
- 只想改动长文本中的一小部分 → replace 或 patch（省 token，也不会因为重发整段而被截断）
- 同一字段要改多处 → 用一个 patch 保证要么全改、要么不改

### 重要：引号与换行
- value / find / replace / text 中的对话内容请使用中文引号“”或「」包裹，不要使用英文双引号
- find 中的换行必须写成 \\n（JSON 转义），不要写成真实换行
- find 未命中时卡片不会被改动，会收到失败反馈：请再从注入的卡片 JSON 中复制精确片段后重试

### 其他要求
- 在 <actions> 之外可以附上说明文字
- 只输出需要变更的部分，精炼准确
- 用中文与用户交流`

/**
 * 旧版默认精修提示词（仅支持 set / add / remove）。
 * 仅用于 persist 迁移比较：命中说明用户从未自定义过，可安全升级为新版。
 */
export const LEGACY_REFINE_PROMPT_V1 = `用户可以对角色卡任意字段或世界书条目提出修改要求。

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
