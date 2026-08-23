import { describe, it, expect, beforeEach } from 'vitest'
import { useCharaStore } from '../charaStore'
import { createEmptyCharaCard } from '../../types'

function resetStore() {
  useCharaStore.setState({ card: createEmptyCharaCard(), avatar: null })
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
