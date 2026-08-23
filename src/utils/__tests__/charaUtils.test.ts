import { describe, it, expect } from 'vitest'
import {
  parseJsonFromText,
  parseActionsFromText,
  ensureCharaCard,
  buildApiMessages,
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

  it('无围栏的裸 JSON 返回 null（当前实现只认围栏）', () => {
    expect(parseJsonFromText(v2CardJson())).toBeNull()
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
