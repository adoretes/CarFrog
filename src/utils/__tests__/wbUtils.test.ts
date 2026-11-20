import { describe, it, expect } from 'vitest'
import { entriesToArray, ensureUniqueEntryIds, parseWorldBookJson } from '../wbUtils'

describe('entriesToArray', () => {
  it('数组型 entries 兼容 SillyTavern 旧键名', () => {
    const entries = [
      { key: ['苹果'], keysecondary: ['水果'], content: '一种水果', uid: 3, disable: true, order: 50 },
      { keys: ['香蕉'], content: '另一种水果', id: 7 },
    ]
    const result = entriesToArray(entries)
    expect(result).toHaveLength(2)
    expect(result[0].keys).toEqual(['苹果'])
    expect(result[0].keysecondary).toEqual(['水果'])
    expect(result[0].id).toBe(3)
    expect(result[0].enabled).toBe(false)
    expect(result[0].order).toBe(50)
    expect(result[1].keys).toEqual(['香蕉'])
    expect(result[1].id).toBe(7)
    expect(result[1].enabled).toBeUndefined()
  })

  it('字符串 key 归一化为单元素数组', () => {
    const [entry] = entriesToArray([{ key: '单人键', content: 'x' }])
    expect(entry.keys).toEqual(['单人键'])
  })

  it('对象型 entries 按数字键排序（2 在 10 前）', () => {
    const result = entriesToArray({
      '10': { key: ['第十'], content: 'c10' },
      '2': { key: ['第二'], content: 'c2' },
      '0': { key: ['第零'], content: 'c0' },
    })
    expect(result.map((e) => e.content)).toEqual(['c0', 'c2', 'c10'])
  })

  it('空值与非对象返回空数组', () => {
    expect(entriesToArray(undefined)).toEqual([])
    expect(entriesToArray(null)).toEqual([])
    expect(entriesToArray(42)).toEqual([])
    expect(entriesToArray('str')).toEqual([])
  })

  it('数组型 entries 中重复的 uid/id 会被重新分配为唯一 id', () => {
    const result = entriesToArray([
      { keys: ['a'], content: 'A', uid: 1 },
      { keys: ['b'], content: 'B', uid: 1 },
      { keys: ['c'], content: 'C', id: 1 },
    ])
    expect(result.map((e) => e.id)).toEqual([1, 2, 3])
  })

  it('对象型 entries 无 uid 时用对象键作为 id', () => {
    const result = entriesToArray({
      '5': { key: ['五'], content: 'c5' },
      '2': { key: ['二'], content: 'c2' },
    })
    expect(result.map((e) => e.id)).toEqual([2, 5])
  })
})

describe('ensureUniqueEntryIds', () => {
  it('保留首次出现的 id，重复 id 与无 id 条目重新分配', () => {
    const entries = [
      { keys: [], content: 'a', id: 0 },
      { keys: [], content: 'b', id: 0 },
      { keys: [], content: 'c' },
      { keys: [], content: 'd', id: 1 },
    ]
    const result = ensureUniqueEntryIds(entries)
    const ids = result.map((e) => e.id)
    expect(new Set(ids).size).toBe(entries.length)
    expect(result[0].id).toBe(0)
    expect(result[3].id).toBe(1)
    expect(result.map((e) => e.content)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('追加合并后已有与导入条目 id 不再冲突', () => {
    const existing = [
      { keys: [], content: '旧 0', id: 0 },
      { keys: [], content: '旧 1', id: 1 },
    ]
    const imported = [
      { keys: [], content: '新 0', id: 0 },
      { keys: [], content: '新 1', id: 1 },
    ]
    const merged = ensureUniqueEntryIds([...existing, ...imported])
    const ids = merged.map((e) => e.id)
    expect(new Set(ids).size).toBe(4)
    expect(merged[0].id).toBe(0)
    expect(merged[1].id).toBe(1)
    expect(merged[2].id).toBe(2)
    expect(merged[3].id).toBe(3)
  })

  it('空数组返回空数组', () => {
    expect(ensureUniqueEntryIds([])).toEqual([])
  })
})

describe('parseWorldBookJson', () => {
  it('解析独立世界书文件', () => {
    const text = JSON.stringify({
      name: '我的世界书',
      entries: { '0': { key: ['钥匙'], content: '内容' } },
    })
    const result = parseWorldBookJson(text)
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.wb.name).toBe('我的世界书')
    expect(result.wb.entries).toHaveLength(1)
    expect(result.source).toContain('我的世界书')
  })

  it('解析内嵌在角色卡中的 character_book', () => {
    const text = JSON.stringify({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: '角色',
        character_book: { entries: [{ keys: ['k'], content: 'v' }] },
      },
    })
    const result = parseWorldBookJson(text)
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.source).toBe('角色卡')
    expect(result.wb.entries[0].keys).toEqual(['k'])
  })

  it('非法 JSON 返回错误', () => {
    const result = parseWorldBookJson('{broken')
    expect('error' in result).toBe(true)
  })

  it('角色卡无世界书数据返回错误', () => {
    const text = JSON.stringify({ spec: 'chara_card_v2', spec_version: '2.0', data: { name: 'x' } })
    const result = parseWorldBookJson(text)
    expect('error' in result).toBe(true)
  })

  it('无 entries 字段返回错误', () => {
    const result = parseWorldBookJson('{"name": "nothing"}')
    expect('error' in result).toBe(true)
  })

  it('解析 V1 平铺角色卡中的 character_book（无 spec 包裹）', () => {
    const text = JSON.stringify({
      name: '老卡',
      description: 'd',
      character_book: { name: '书', entries: [{ keys: ['k'], content: 'v' }] },
    })
    const result = parseWorldBookJson(text)
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.wb.entries).toHaveLength(1)
    expect(result.wb.name).toBe('书')
  })

  it('解析 V3 角色卡中的 character_book', () => {
    const text = JSON.stringify({
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: 'V3',
        character_book: { entries: [{ keys: ['v3key'], content: 'v3 内容' }] },
      },
    })
    const result = parseWorldBookJson(text)
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.wb.entries[0].keys).toEqual(['v3key'])
    expect(result.source).toBe('角色卡')
  })

  it('解析顶层 character_book 形式的独立世界书', () => {
    const text = JSON.stringify({
      character_book: { name: '独立书', entries: [{ keys: ['a'], content: 'b' }] },
    })
    const result = parseWorldBookJson(text)
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.wb.entries).toHaveLength(1)
  })

  it('保留世界书条目的高级字段（sticky/cooldown/delay/selectiveLogic/depth）', () => {
    const entries = [
      {
        keys: ['k'],
        keysecondary: ['s'],
        content: 'c',
        sticky: 3,
        cooldown: 5,
        delay: 2,
        depth: 7,
        selective: true,
        selectiveLogic: 3,
      },
    ]
    const [entry] = entriesToArray(entries)
    expect(entry.sticky).toBe(3)
    expect(entry.cooldown).toBe(5)
    expect(entry.delay).toBe(2)
    expect(entry.depth).toBe(7)
    expect(entry.selective).toBe(true)
    expect(entry.selectiveLogic).toBe(3)
  })
})
