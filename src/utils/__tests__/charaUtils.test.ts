import { describe, it, expect } from 'vitest'
import {
  parseJsonFromText,
  parseActionsFromText,
  ensureCharaCard,
  normalizeCardInput,
  buildApiMessages,
  buildRefineSystemPrompt,
  buildPngCardPayloads,
  buildV2Backfill,
  DEFAULT_REFINE_PROMPT,
} from '../charaUtils'
import type { ChatMessage } from '../../types/actions'

function v2CardJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: '测试角色',
      description: '描述',
      personality: '性格',
      scenario: '场景',
      first_mes: '你好',
      ...overrides,
    },
  })
}

describe('parseJsonFromText', () => {
  it('解析 ```json 围栏中的 V2 卡片并补全默认字段', () => {
    const card = parseJsonFromText(`## 角色摘要\n某角色概述。\n\n## 角色卡\n\`\`\`json\n${v2CardJson()}\n\`\`\`\n完成！`)
    expect(card).not.toBeNull()
    expect(card!.data.name).toBe('测试角色')
    expect(card!.data.tags).toEqual([])
    expect(card!.data.alternate_greetings).toEqual([])
    expect(card!.spec).toBe('chara_card_v2')
  })

  it('围栏内 JSON 非法时返回 null', () => {
    expect(parseJsonFromText('```json\n{"spec": "chara_card_v2", nope}\n```')).toBeNull()
  })

  it('缺少 spec/data 的 JSON 返回 null', () => {
    expect(parseJsonFromText('```json\n{"foo": 1}\n```')).toBeNull()
  })

  it('无围栏的裸 JSON 也能解析（模型经常忘记加围栏）', () => {
    const card = parseJsonFromText(v2CardJson())
    expect(card).not.toBeNull()
    expect(card!.data.name).toBe('测试角色')
  })

  it('无围栏时能在前后夹带说明文字中提取出 JSON', () => {
    const text = `好的，这是你的角色卡：\n\n${v2CardJson()}\n\n希望你喜欢！`
    const card = parseJsonFromText(text)
    expect(card).not.toBeNull()
    expect(card!.data.name).toBe('测试角色')
  })

  it('围栏语言标记缺失（``` 而非 ```json）也能解析', () => {
    const card = parseJsonFromText('```\n' + v2CardJson() + '\n```')
    expect(card).not.toBeNull()
  })

  it('忽略 JSON 字符串内的花括号（不误判对象边界）', () => {
    const json = JSON.stringify({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: { name: '带}花括号{的名字', description: 'd' },
    })
    const card = parseJsonFromText(`说明文字 ${json} 结束`)
    expect(card).not.toBeNull()
    expect(card!.data.name).toBe('带}花括号{的名字')
  })

  it('解析 V1 平铺格式（chub.ai 老卡）', () => {
    const v1 = JSON.stringify({
      name: '老卡角色',
      description: '描述',
      personality: '性格',
      first_mes: '你好',
    })
    const card = parseJsonFromText('```json\n' + v1 + '\n```')
    expect(card).not.toBeNull()
    expect(card!.data.name).toBe('老卡角色')
    expect(card!.spec).toBe('chara_card_v2')
  })

  it('头脑风暴中的随手小 JSON 不被误判为角色卡', () => {
    // 只有 name 一个卡片字段 + 其他无关键
    expect(parseJsonFromText('好的，我记下了：{"name": "候选名", "score": 8}')).toBeNull()
  })
})

describe('parseActionsFromText', () => {
  it('解析完整的 actions JSON 数组', () => {
    const text = `好的，我来修改名称。\n<actions>\n[\n  { "type": "set", "path": "data.name", "value": "新名字" },\n  { "type": "add", "path": "data.tags", "value": "新标签" },\n  { "type": "remove", "path": "data.tags", "index": 2 }\n]\n</actions>`
    const actions = parseActionsFromText(text)
    expect(actions).toHaveLength(3)
    expect(actions[0]).toEqual({ type: 'set', path: 'data.name', value: '新名字' })
    expect(actions[2]).toEqual({ type: 'remove', path: 'data.tags', index: 2 })
  })

  it('数组被截断时逐对象抢救完整条目', () => {
    // 缺少闭合 ]，整体 JSON.parse 必然失败
    const text = `<actions>\n[\n  { "type": "set", "path": "data.name", "value": "A" },\n  { "type": "set", "path": "data.description", "value": "B" }\n</actions>`
    const actions = parseActionsFromText(text)
    expect(actions).toHaveLength(2)
    expect(actions[1].type).toBe('set')
  })

  it('数组完整解析成功时原样返回（不做 type 过滤）', () => {
    const text = `<actions>\n[\n  { "path": "data.name", "value": 1 },\n  { "type": "set", "path": "data.name", "value": 2 }\n]\n</actions>`
    expect(parseActionsFromText(text)).toHaveLength(2)
  })

  it('抢救路径中缺 type 字段的对象被过滤', () => {
    // 数组截断（无闭合 ]），走逐对象抢救路径，此时才过滤无效对象
    const text = `<actions>\n[\n  { "path": "data.name", "value": 1 },\n  { "type": "set", "path": "data.name", "value": 2 }\n</actions>`
    const actions = parseActionsFromText(text)
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('set')
  })

  it('无 actions 标签返回空数组', () => {
    expect(parseActionsFromText('没有指令的普通回复')).toEqual([])
  })

  it('解析 replace / patch 指令', () => {
    const text = `<actions>
[
  { "type": "replace", "path": "data.description", "find": "她怕黑", "replace": "她不怕黑", "all": true, "count": 2 },
  { "type": "patch", "path": "data.first_mes", "ops": [
    { "op": "delete", "find": "（笑）" },
    { "op": "insert", "find": "你好", "text": "，", "before": false }
  ] }
]
</actions>`
    const actions = parseActionsFromText(text)
    expect(actions).toHaveLength(2)
    expect(actions[0]).toMatchObject({ type: 'replace', find: '她怕黑', all: true, count: 2 })
    expect(actions[1]).toMatchObject({ type: 'patch', path: 'data.first_mes' })
    expect((actions[1] as { ops: unknown[] }).ops).toHaveLength(2)
  })

  it('数组被截断时仍能抢救出 patch 条目（ops 为扁平对象）', () => {
    const text = `<actions>
[
  { "type": "patch", "path": "data.first_mes", "ops": [ { "op": "delete", "find": "（笑）" } ] },
  { "type": "replace", "path": "data.name", "find": "甲", "replace": "乙" }
</actions>`
    const actions = parseActionsFromText(text)
    expect(actions).toHaveLength(2)
    expect(actions[0].type).toBe('patch')
  })
})

describe('DEFAULT_REFINE_PROMPT', () => {
  it('覆盖所有受支持的指令类型（新增动作时同步更新提示词）', () => {
    for (const keyword of [
      '"type": "set"',
      '"type": "replace"',
      '"type": "add"',
      '"type": "remove"',
      '"type": "patch"',
      '"op": "replace"',
      '"op": "delete"',
      '"op": "insert"',
      '"all"',
      '"count"',
      '"index"',
    ]) {
      expect(DEFAULT_REFINE_PROMPT).toContain(keyword)
    }
  })

  it('buildRefineSystemPrompt 注入卡片 JSON 与精修提示词', () => {
    const card = ensureCharaCard(JSON.parse(v2CardJson()))
    const prompt = buildRefineSystemPrompt(card, DEFAULT_REFINE_PROMPT)
    expect(prompt).toContain('测试角色')
    expect(prompt).toContain('"type": "replace"')
  })
})

describe('ensureCharaCard', () => {
  it('空对象补全为合法空卡', () => {
    const card = ensureCharaCard({})
    expect(card.spec).toBe('chara_card_v2')
    expect(card.data.name).toBe('')
    expect(card.data.character_book).toBeUndefined()
  })

  it('保留已有字段值', () => {
    const card = ensureCharaCard(JSON.parse(v2CardJson({ tags: ['猫娘'] })))
    expect(card.data.name).toBe('测试角色')
    expect(card.data.tags).toEqual(['猫娘'])
  })

  it('世界书 entries 归一化为数组（对象型 entries）', () => {
    const raw = JSON.parse(v2CardJson())
    raw.data.character_book = {
      name: '测试书',
      entries: {
        '0': { key: ['苹果'], content: '一种水果' },
        '1': { keys: ['香蕉'], content: '另一种水果' },
      },
    }
    const card = ensureCharaCard(raw)
    expect(card.data.character_book!.entries).toHaveLength(2)
    expect(card.data.character_book!.entries[0].keys).toEqual(['苹果'])
  })
})

describe('normalizeCardInput', () => {
  it('识别 V2（有 data 包裹）', () => {
    const result = normalizeCardInput(JSON.parse(v2CardJson()))
    expect(result).not.toBeNull()
    expect(result!.data!.name).toBe('测试角色')
  })

  it('识别 V1 平铺格式', () => {
    const result = normalizeCardInput({ name: '平铺', description: 'd' })
    expect(result).not.toBeNull()
    expect(result!.data!.name).toBe('平铺')
  })

  it('识别 V3', () => {
    const result = normalizeCardInput({
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: { name: 'V3' },
    })
    expect(result).not.toBeNull()
    expect(result!.spec).toBe('chara_card_v3')
  })

  it('拒绝无关 JSON（避免把任意对象当卡片）', () => {
    expect(normalizeCardInput({ foo: 1, bar: 2 })).toBeNull()
    expect(normalizeCardInput(null)).toBeNull()
    expect(normalizeCardInput([])).toBeNull()
    expect(normalizeCardInput('字符串')).toBeNull()
  })

  it('只有单个特征字段的对象不判为卡片（防头脑风暴中的随手 JSON 误触发）', () => {
    // 模型在讨论阶段经常输出这种小对象，不应被当成角色卡而自动进入精修模式
    expect(normalizeCardInput({ name: '某个想法' })).toBeNull()
    expect(normalizeCardInput({ description: '一段描述' })).toBeNull()
    expect(normalizeCardInput({ note: 'x', name: '仅一个卡片字段' })).toBeNull()
  })

  it('命中 2 个及以上特征字段才判为 V1 卡片', () => {
    expect(normalizeCardInput({ name: 'x', description: 'y' })).not.toBeNull()
  })
})

describe('V1 平铺卡导入（回归：原先完全无法导入）', () => {
  it('顶层平铺字段被搬进 data', () => {
    const card = ensureCharaCard({
      name: '老卡',
      description: '描述',
      personality: '性格',
      first_mes: '开场白',
      tags: ['老标签'],
    } as never)
    expect(card.spec).toBe('chara_card_v2')
    expect(card.data.name).toBe('老卡')
    expect(card.data.description).toBe('描述')
    expect(card.data.personality).toBe('性格')
    expect(card.data.first_mes).toBe('开场白')
    expect(card.data.tags).toEqual(['老标签'])
  })

  it('V1 卡里的 character_book 也能被归一化', () => {
    const card = ensureCharaCard({
      name: '老卡',
      description: '描述',
      character_book: { name: '书', entries: [{ keys: ['k'], content: 'v' }] },
    } as never)
    expect(card.data.character_book!.entries).toHaveLength(1)
    expect(card.data.character_book!.entries[0].keys).toEqual(['k'])
  })
})

describe('V3 字段透传（回归：原先被白名单静默丢弃）', () => {
  const v3Raw = () => ({
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: 'V3角色',
      description: 'd',
      nickname: '小V',
      group_only_greetings: ['群聊专用问候'],
      creator_notes_multilingual: { zh: '中文注', en: 'english note' },
      source: ['chub'],
      creation_date: 1700000000,
      modification_date: 1700000001,
      assets: [{ type: 'icon', uri: 'ccdefault:', name: 'main', ext: 'png' }],
      extensions: { talkativeness: '0.5' },
    },
  })

  it('保留 nickname / group_only_greetings / assets / 多语言注释等 V3 独有字段', () => {
    const card = ensureCharaCard(v3Raw() as never)
    expect(card.spec).toBe('chara_card_v3')
    expect(card.spec_version).toBe('3.0')
    expect(card.data.nickname).toBe('小V')
    expect(card.data.group_only_greetings).toEqual(['群聊专用问候'])
    expect(card.data.assets).toEqual([{ type: 'icon', uri: 'ccdefault:', name: 'main', ext: 'png' }])
    expect(card.data.creator_notes_multilingual).toEqual({ zh: '中文注', en: 'english note' })
    expect(card.data.source).toEqual(['chub'])
    expect(card.data.creation_date).toBe(1700000000)
    expect(card.data.modification_date).toBe(1700000001)
  })

  it('保留 extensions 扩展槽', () => {
    const card = ensureCharaCard(v3Raw() as never)
    expect(card.data.extensions).toEqual({ talkativeness: '0.5' })
  })

  it('保留未知的第三方扩展字段', () => {
    const card = ensureCharaCard({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: { name: 'x', some_future_field: { a: 1 } },
    } as never)
    expect((card.data as unknown as Record<string, unknown>).some_future_field).toEqual({ a: 1 })
  })

  it('V3 导出时产生 chara(V2回填) + ccv3 两份载荷', () => {
    const card = ensureCharaCard(v3Raw() as never)
    const { v2Json, v3Json } = buildPngCardPayloads(card)

    expect(v3Json).toBeDefined()
    const v3 = JSON.parse(v3Json!)
    expect(v3.spec).toBe('chara_card_v3')
    expect(v3.data.nickname).toBe('小V')
    expect(v3.data.assets).toHaveLength(1)

    const v2 = JSON.parse(v2Json)
    expect(v2.spec).toBe('chara_card_v2')
    expect(v2.spec_version).toBe('2.0')
    // V2 回填必须剥离 V3 独有字段
    expect(v2.data.nickname).toBeUndefined()
    expect(v2.data.assets).toBeUndefined()
    expect(v2.data.group_only_greetings).toBeUndefined()
    // 核心字段保留
    expect(v2.data.name).toBe('V3角色')
  })

  it('V2 回填在 creator_notes 里注明降级（符合 V3 规范建议）', () => {
    const card = ensureCharaCard(v3Raw() as never)
    const backfill = buildV2Backfill(card)
    expect(backfill.data.creator_notes).toContain('Character Card V3')
  })

  it('V2 卡导出时不产生 ccv3 载荷（保持旧产物形态）', () => {
    const card = ensureCharaCard(JSON.parse(v2CardJson()))
    const payloads = buildPngCardPayloads(card)
    expect(payloads.v3Json).toBeUndefined()
    expect(JSON.parse(payloads.v2Json).spec).toBe('chara_card_v2')
  })

  it('V3 卡导入导出往返后不丢字段', () => {
    const card = ensureCharaCard(v3Raw() as never)
    const { v3Json } = buildPngCardPayloads(card)
    const roundTripped = ensureCharaCard(JSON.parse(v3Json!) as never)

    expect(roundTripped.data.nickname).toBe('小V')
    expect(roundTripped.data.assets).toEqual(card.data.assets)
    expect(roundTripped.data.group_only_greetings).toEqual(['群聊专用问候'])
    expect(roundTripped.data.creator_notes_multilingual).toEqual(card.data.creator_notes_multilingual)
    expect(roundTripped.spec).toBe('chara_card_v3')
  })
})

describe('buildApiMessages', () => {
  const history: ChatMessage[] = [
    { role: 'user', content: '讨论一下角色' },
    { role: 'assistant', content: '好的' },
    { role: 'user', content: '已折叠的旧消息', excluded: true },
    { role: 'assistant', content: '已折叠的旧回复', excluded: true },
  ]

  it('过滤 excluded 消息并追加当前输入', () => {
    const result = buildApiMessages(history, '新的想法', [])
    expect(result).toHaveLength(3)
    expect(result.map((m) => m.content)).toEqual(['讨论一下角色', '好的', '新的想法'])
    expect(result[2].role).toBe('user')
  })

  it('附件转为多模态 content parts', () => {
    const result = buildApiMessages(history, '看看这张图', [
      { name: 'pic.png', content: 'data:image/png;base64,xxx', type: 'image' },
      { name: 'note.txt', content: '文本内容', type: 'text' },
    ])
    const last = result[result.length - 1]
    expect(Array.isArray(last.content)).toBe(true)
    const parts = last.content as { type: string; text?: string; image_url?: { url: string } }[]
    expect(parts[0]).toEqual({ type: 'text', text: '看看这张图' })
    expect(parts[1].type).toBe('image_url')
    expect(parts[1].image_url!.url).toBe('data:image/png;base64,xxx')
    expect(parts[2].type).toBe('text')
    expect(parts[2].text).toContain('note.txt')
    expect(parts[2].text).toContain('文本内容')
  })

  it('长文本附件截断到 3000 字符', () => {
    const long = 'a'.repeat(5000)
    const result = buildApiMessages([], '附上长文', [{ name: 'big.txt', content: long, type: 'text' }])
    const parts = result[0].content as { type: string; text: string }[]
    expect(parts[1].text.includes('a'.repeat(3000))).toBe(true)
    expect(parts[1].text.includes('a'.repeat(3100))).toBe(false)
  })
})
