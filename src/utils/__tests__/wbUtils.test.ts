import { describe, it, expect } from 'vitest'
import { entriesToArray, parseWorldBookJson } from '../wbUtils'

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
})
