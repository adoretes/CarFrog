import { describe, it, expect, beforeEach } from 'vitest'
import { useCharaStore } from '../charaStore'
import { createEmptyCharaCard, type CharaCard } from '../../types'
import { parseActionsFromText } from '../../utils/charaUtils'
import type { CharaAction } from '../../types/actions'

function resetStore() {
  useCharaStore.setState({ card: createEmptyCharaCard(), avatar: null })
}

function cardWith(overrides: Partial<CharaCard['data']>): CharaCard {
  const base = createEmptyCharaCard()
  return { ...base, data: { ...base.data, ...overrides } }
}

describe('charaStore executeActions', () => {
  beforeEach(resetStore)

  it('set 修改顶层字段', () => {
    useCharaStore.getState().executeActions([
      { type: 'set', path: 'data.name', value: '新名字' },
    ])
    expect(useCharaStore.getState().card.data.name).toBe('新名字')
  })

  it('add 向数组追加元素', () => {
    useCharaStore.getState().executeActions([
      { type: 'add', path: 'data.tags', value: '猫娘' },
      { type: 'add', path: 'data.tags', value: '奇幻' },
    ])
    expect(useCharaStore.getState().card.data.tags).toEqual(['猫娘', '奇幻'])
  })

  it('remove 删除数组指定索引', () => {
    useCharaStore.getState().executeActions([
      { type: 'add', path: 'data.tags', value: 'a' },
      { type: 'add', path: 'data.tags', value: 'b' },
      { type: 'add', path: 'data.tags', value: 'c' },
      { type: 'remove', path: 'data.tags', index: 1 },
    ])
    expect(useCharaStore.getState().card.data.tags).toEqual(['a', 'c'])
  })

  it('set 带索引替换数组元素', () => {
    useCharaStore.getState().executeActions([
      { type: 'add', path: 'data.alternate_greetings', value: '旧问候' },
      { type: 'set', path: 'data.alternate_greetings', value: '新问候', index: 0 },
    ])
    expect(useCharaStore.getState().card.data.alternate_greetings).toEqual(['新问候'])
  })

  it('add 世界书条目时自动创建 character_book', () => {
    const entry = { keys: ['钥匙'], content: '内容' }
    useCharaStore.getState().executeActions([
      { type: 'add', path: 'data.character_book.entries', value: entry },
    ])
    const wb = useCharaStore.getState().card.data.character_book
    expect(wb).toBeDefined()
    expect(wb!.entries).toHaveLength(1)
    expect(wb!.entries[0].keys).toEqual(['钥匙'])
  })

  it('多条 action 顺序执行且结果累计', () => {
    useCharaStore.getState().executeActions([
      { type: 'set', path: 'data.name', value: '甲' },
      { type: 'set', path: 'data.description', value: '乙' },
      { type: 'add', path: 'data.tags', value: '丙' },
    ])
    const card = useCharaStore.getState().card
    expect(card.data.name).toBe('甲')
    expect(card.data.description).toBe('乙')
    expect(card.data.tags).toEqual(['丙'])
  })

  it('remove 越界索引不报错', () => {
    expect(() => {
      useCharaStore.getState().executeActions([
        { type: 'remove', path: 'data.tags', index: 99 },
      ])
    }).not.toThrow()
    expect(useCharaStore.getState().card.data.tags).toEqual([])
  })
})

describe('charaStore executeActions replace', () => {
  beforeEach(resetStore)

  it('默认只替换第一处命中并回报命中次数', () => {
    useCharaStore.getState().setCard(cardWith({ description: '她怕黑。她也怕黑。' }))
    const report = useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.description', find: '怕黑', replace: '不怕黑' },
    ])
    expect(useCharaStore.getState().card.data.description).toBe('她不怕黑。她也怕黑。')
    expect(report[0]).toMatchObject({ ok: true, occurrences: 2, replaced: 1 })
  })

  it('all: true 时替换全部命中', () => {
    useCharaStore.getState().setCard(cardWith({ description: '她怕黑。她也怕黑。' }))
    const report = useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.description', find: '怕黑', replace: '不怕黑', all: true },
    ])
    expect(useCharaStore.getState().card.data.description).toBe('她不怕黑。她也不怕黑。')
    expect(report[0]).toMatchObject({ ok: true, occurrences: 2, replaced: 2 })
  })

  it('replace 为空串时等价于删除片段', () => {
    useCharaStore.getState().setCard(cardWith({ description: '甲（小声）乙' }))
    useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.description', find: '（小声）', replace: '' },
    ])
    expect(useCharaStore.getState().card.data.description).toBe('甲乙')
  })

  it('支持 index 指向字符串数组元素', () => {
    useCharaStore.getState().setCard(cardWith({ alternate_greetings: ['早安', '晚安'] }))
    useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.alternate_greetings', index: 1, find: '晚安', replace: '夜深了' },
    ])
    expect(useCharaStore.getState().card.data.alternate_greetings).toEqual(['早安', '夜深了'])
  })

  it('可修改世界书条目内容（带下标路径）', () => {
    useCharaStore.getState().setCard(
      cardWith({
        character_book: {
          name: null,
          entries: [{ keys: ['钥匙'], content: '旧内容' }],
          extensions: {},
        },
      }),
    )
    useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.character_book.entries[0].content', find: '旧', replace: '新' },
    ])
    expect(useCharaStore.getState().card.data.character_book!.entries[0].content).toBe('新内容')
  })

  it('find 含换行也能命中', () => {
    useCharaStore.getState().setCard(cardWith({ description: '第一行\n第二行\n第三行' }))
    useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.description', find: '第一行\n第二行', replace: '合二为一' },
    ])
    expect(useCharaStore.getState().card.data.description).toBe('合二为一\n第三行')
  })

  it('未命中时报 not_found 且卡片不变', () => {
    useCharaStore.getState().setCard(cardWith({ description: '原文' }))
    const report = useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.description', find: '不存在的句子', replace: 'x' },
    ])
    expect(useCharaStore.getState().card.data.description).toBe('原文')
    expect(report[0]).toMatchObject({ ok: false, reason: 'not_found', occurrences: 0 })
  })

  it('find 为空串时报 empty_find', () => {
    useCharaStore.getState().setCard(cardWith({ description: '原文' }))
    const report = useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.description', find: '', replace: 'x' },
    ])
    expect(report[0]).toMatchObject({ ok: false, reason: 'empty_find' })
    expect(useCharaStore.getState().card.data.description).toBe('原文')
  })

  it('目标不是文本时报 not_string', () => {
    useCharaStore.getState().setCard(cardWith({ tags: ['猫娘'] }))
    const report = useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.tags', find: '猫', replace: '犬' },
    ])
    expect(report[0]).toMatchObject({ ok: false, reason: 'not_string' })
  })

  it('index 越界时报 bad_index', () => {
    useCharaStore.getState().setCard(cardWith({ tags: ['猫娘'] }))
    const report = useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.tags', index: 5, find: '猫', replace: '犬' },
    ])
    expect(report[0]).toMatchObject({ ok: false, reason: 'bad_index' })
  })

  it('count 与命中次数不符时整条不生效', () => {
    useCharaStore.getState().setCard(cardWith({ description: '甲甲' }))
    const report = useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.description', find: '甲', replace: '乙', count: 1 },
    ])
    expect(useCharaStore.getState().card.data.description).toBe('甲甲')
    expect(report[0]).toMatchObject({ ok: false, reason: 'count_mismatch', occurrences: 2 })
  })

  it('替换文本中的 $& / $\' 按字面插入（不受 String.replace 特殊模式影响）', () => {
    useCharaStore.getState().setCard(cardWith({ description: '价格 100 元' }))
    useCharaStore.getState().executeActions([
      { type: 'replace', path: 'data.description', find: '100', replace: "$&|$'|$1" },
    ])
    expect(useCharaStore.getState().card.data.description).toBe("价格 $&|$'|$1 元")
  })
})

describe('charaStore executeActions patch', () => {
  beforeEach(resetStore)

  it('按顺序执行 replace / delete / insert', () => {
    useCharaStore.getState().setCard(cardWith({ first_mes: '你好（笑）' }))
    const report = useCharaStore.getState().executeActions([
      {
        type: 'patch',
        path: 'data.first_mes',
        ops: [
          { op: 'replace', find: '你好', replace: '好久不见' },
          { op: 'delete', find: '（笑）' },
          { op: 'insert', find: '好久不见', text: '，' },
        ],
      },
    ])
    expect(useCharaStore.getState().card.data.first_mes).toBe('好久不见，')
    expect(report[0]).toMatchObject({ ok: true, replaced: 3 })
  })

  it('insert + before 插到 find 之前', () => {
    useCharaStore.getState().setCard(cardWith({ scenario: '雨夜' }))
    useCharaStore.getState().executeActions([
      { type: 'patch', path: 'data.scenario', ops: [{ op: 'insert', find: '雨夜', text: '十年前，', before: true }] },
    ])
    expect(useCharaStore.getState().card.data.scenario).toBe('十年前，雨夜')
  })

  it('任一 op 未命中则整条 patch 不生效（原子）', () => {
    useCharaStore.getState().setCard(cardWith({ first_mes: 'abc' }))
    const report = useCharaStore.getState().executeActions([
      {
        type: 'patch',
        path: 'data.first_mes',
        ops: [
          { op: 'replace', find: 'a', replace: 'A' },
          { op: 'replace', find: 'zzz', replace: 'X' },
        ],
      },
    ])
    expect(useCharaStore.getState().card.data.first_mes).toBe('abc')
    expect(report[0]).toMatchObject({ ok: false, reason: 'not_found', failedOp: 1 })
  })

  it('ops 缺失或为空时报 invalid_ops', () => {
    useCharaStore.getState().setCard(cardWith({ first_mes: 'abc' }))
    const report = useCharaStore.getState().executeActions([
      { type: 'patch', path: 'data.first_mes', ops: [] },
    ])
    expect(useCharaStore.getState().card.data.first_mes).toBe('abc')
    expect(report[0]).toMatchObject({ ok: false, reason: 'invalid_ops' })
  })

  it('未知 op 时报 invalid_ops 且卡片不变', () => {
    useCharaStore.getState().setCard(cardWith({ first_mes: 'abc' }))
    const report = useCharaStore.getState().executeActions([
      {
        type: 'patch',
        path: 'data.first_mes',
        ops: [{ op: 'append', find: 'a', text: 'X' } as unknown as { op: 'insert'; find: string }],
      },
    ])
    expect(useCharaStore.getState().card.data.first_mes).toBe('abc')
    expect(report[0]).toMatchObject({ ok: false, reason: 'invalid_ops', failedOp: 0 })
  })
})

describe('charaStore executeActions 其它', () => {
  beforeEach(resetStore)

  it('未知指令类型报 unknown_type 且卡片不变', () => {
    useCharaStore.getState().setCard(cardWith({ name: '甲' }))
    const report = useCharaStore.getState().executeActions([
      { type: 'update', path: 'data.name', value: '乙' } as unknown as CharaAction,
    ])
    expect(useCharaStore.getState().card.data.name).toBe('甲')
    expect(report).toHaveLength(1)
    expect(report[0]).toMatchObject({ ok: false, reason: 'unknown_type', type: 'update' })
  })

  it('set 与 replace 混排时按顺序执行', () => {
    useCharaStore.getState().executeActions([
      { type: 'set', path: 'data.description', value: '甲' },
      { type: 'replace', path: 'data.description', find: '甲', replace: '乙' },
    ])
    expect(useCharaStore.getState().card.data.description).toBe('乙')
  })

  it('端到端：从 AI 回复文本解析 apply 到 replace 生效', () => {
    useCharaStore.getState().setCard(cardWith({ description: '她怕黑，夜里总点灯。' }))
    const aiText = `好的，我把这句改掉。\n<actions>\n[\n  { "type": "replace", "path": "data.description", "find": "她怕黑", "replace": "她不怕黑" }\n]\n</actions>`
    const actions = parseActionsFromText(aiText)
    const report = useCharaStore.getState().executeActions(actions)
    expect(useCharaStore.getState().card.data.description).toBe('她不怕黑，夜里总点灯。')
    expect(report[0].ok).toBe(true)
  })
})

describe('charaStore setField / loadFromJson / resetCard', () => {
  beforeEach(resetStore)

  it('setField 写入嵌套路径', () => {
    useCharaStore.getState().setField('data.first_mes', '第一句话')
    expect(useCharaStore.getState().card.data.first_mes).toBe('第一句话')
  })

  it('loadFromJson 解析合法卡片', () => {
    const json = JSON.stringify({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: { name: '导入角色', description: 'd', personality: 'p', scenario: 's', first_mes: 'f' },
    })
    expect(useCharaStore.getState().loadFromJson(json)).toBe(true)
    expect(useCharaStore.getState().card.data.name).toBe('导入角色')
  })

  it('loadFromJson 拒绝非法输入', () => {
    expect(useCharaStore.getState().loadFromJson('not json')).toBe(false)
    expect(useCharaStore.getState().loadFromJson('{"foo":1}')).toBe(false)
  })

  it('resetCard 恢复空卡并清空头像', () => {
    useCharaStore.getState().setField('data.name', '某角色')
    useCharaStore.getState().setAvatar('data:image/png;base64,xx')
    useCharaStore.getState().resetCard()
    expect(useCharaStore.getState().card.data.name).toBe('')
    expect(useCharaStore.getState().avatar).toBeNull()
  })
})
