import { describe, it, expect } from 'vitest'
import {
  embedJsonIntoPng,
  extractJsonFromPng,
  findIendOffset,
  isPngFile,
} from '../pngUtils'

function chunkBytes(type: string, data: number[] = []): number[] {
  const typeBytes = Array.from(new TextEncoder().encode(type))
  const len = data.length
  return [
    (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff,
    ...typeBytes,
    ...data,
    0, 0, 0, 0, // 读写路径均不校验 CRC，置零即可
  ]
}

/** 拼接字节并返回独立的 ArrayBuffer（避免 Uint8Array.buffer 的 ArrayBufferLike 类型） */
function concatBytes(parts: number[][]): ArrayBuffer {
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const buffer = new ArrayBuffer(total)
  const out = new Uint8Array(buffer)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return buffer
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function minimalPng(): ArrayBuffer {
  return concatBytes([
    PNG_SIG,
    chunkBytes('IHDR', new Array(13).fill(0)),
    chunkBytes('IDAT', [1, 2, 3, 4]),
    chunkBytes('IEND'),
  ])
}

function base64Utf8(text: string): number[] {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return Array.from(new TextEncoder().encode(btoa(binary)))
}

/** 构造 iTXt 块：keyword\0 compFlag compMethod langTag\0 translatedKeyword\0 text */
function itxtChunk(keyword: string, text: string): number[] {
  const kw = Array.from(new TextEncoder().encode(keyword))
  return chunkBytes('iTXt', [...kw, 0, 0, 0, 0, 0, ...base64Utf8(text)])
}

function pngWithChunks(middle: number[][]): ArrayBuffer {
  return concatBytes([
    PNG_SIG,
    chunkBytes('IHDR', new Array(13).fill(0)),
    ...middle,
    chunkBytes('IDAT', [1, 2, 3, 4]),
    chunkBytes('IEND'),
  ])
}

/** 统计某个文本关键字的块数量 */
function countTextChunks(buffer: ArrayBuffer, keyword: string): number {
  const view = new Uint8Array(buffer)
  const dv = new DataView(buffer)
  const decoder = new TextDecoder()
  let i = 8
  let count = 0
  while (i + 8 <= view.length) {
    const length = dv.getUint32(i)
    const type = decoder.decode(view.slice(i + 4, i + 8))
    if (type === 'IEND') break
    if (type === 'tEXt' || type === 'iTXt') {
      const end = view.indexOf(0, i + 8)
      if (end > 0 && end < i + 8 + length && decoder.decode(view.slice(i + 8, end)) === keyword) {
        count++
      }
    }
    i += 12 + length
  }
  return count
}

const V2_JSON = JSON.stringify({
  spec: 'chara_card_v2',
  spec_version: '2.0',
  data: { name: '青蛙🐸', description: '含中文与 emoji 的卡片' },
})

describe('embedJsonIntoPng / extractJsonFromPng', () => {
  it('嵌入后可完整读回（含中文与 emoji）', () => {
    const embedded = embedJsonIntoPng(minimalPng(), V2_JSON)
    expect(extractJsonFromPng(embedded)).toBe(V2_JSON)
  })

  it('同时嵌入 v2/v3 时优先返回 ccv3 (v3) 数据（符合 V3 规范）', () => {
    const v3Json = JSON.stringify({
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: { name: 'v3 card' },
    })
    const embedded = embedJsonIntoPng(minimalPng(), V2_JSON, v3Json)
    expect(extractJsonFromPng(embedded)).toBe(v3Json)
  })

  it('只有 chara 块时退回读取 v2 数据', () => {
    const embedded = embedJsonIntoPng(minimalPng(), V2_JSON)
    expect(extractJsonFromPng(embedded)).toBe(V2_JSON)
  })

  it('嵌入后的 PNG 仍是合法 PNG 且 IEND 保持在末尾', () => {
    const embedded = embedJsonIntoPng(minimalPng(), V2_JSON)
    expect(isPngFile(embedded)).toBe(true)

    const view = new Uint8Array(embedded)
    const iendOffset = findIendOffset(embedded)
    expect(iendOffset).toBeGreaterThan(0)
    expect(new TextDecoder().decode(view.slice(iendOffset + 4, iendOffset + 8))).toBe('IEND')
    // IEND 之后不应再有数据
    expect(iendOffset + 12).toBe(view.length)
  })

  it('无卡片的 PNG 返回 null', () => {
    expect(extractJsonFromPng(minimalPng())).toBeNull()
  })
})

describe('重新导出（回归：旧卡片数据不得残留）', () => {
  it('对已含卡片的 PNG 再次导出，读到的是新数据而非旧数据', () => {
    const oldJson = JSON.stringify({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: { name: 'OLD-NAME' },
    })
    const newJson = JSON.stringify({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: { name: 'NEW-NAME' },
    })

    const first = embedJsonIntoPng(minimalPng(), oldJson)
    const reExported = embedJsonIntoPng(first, newJson)

    expect(JSON.parse(extractJsonFromPng(reExported)!).data.name).toBe('NEW-NAME')
  })

  it('重复导出不会堆积 chara 块', () => {
    const once = embedJsonIntoPng(minimalPng(), V2_JSON)
    const twice = embedJsonIntoPng(once, V2_JSON)
    const thrice = embedJsonIntoPng(twice, V2_JSON)

    expect(countTextChunks(thrice, 'chara')).toBe(1)
  })

  it('重复导出时旧 ccv3 块也会被替换，不会残留', () => {
    const v3a = JSON.stringify({ spec: 'chara_card_v3', spec_version: '3.0', data: { name: 'v3-old' } })
    const v3b = JSON.stringify({ spec: 'chara_card_v3', spec_version: '3.0', data: { name: 'v3-new' } })

    const first = embedJsonIntoPng(minimalPng(), V2_JSON, v3a)
    const second = embedJsonIntoPng(first, V2_JSON, v3b)

    expect(countTextChunks(second, 'ccv3')).toBe(1)
    expect(countTextChunks(second, 'chara')).toBe(1)
  })

  it('会移除导入卡片里已有的 iTXt 形式的 chara 块', () => {
    const oldJson = JSON.stringify({ spec: 'chara_card_v2', spec_version: '2.0', data: { name: 'OLD' } })
    const newJson = JSON.stringify({ spec: 'chara_card_v2', spec_version: '2.0', data: { name: 'NEW' } })

    // 先写入 iTXt 形式的旧卡片
    const imported = pngWithChunks([itxtChunk('chara', oldJson)])
    expect(extractJsonFromPng(imported)).toBe(oldJson)

    const reExported = embedJsonIntoPng(imported, newJson)
    expect(JSON.parse(extractJsonFromPng(reExported)!).data.name).toBe('NEW')
    expect(countTextChunks(reExported, 'chara')).toBe(1)
  })
})

describe('iTXt 卡片块（回归：真实第三方工具使用 iTXt）', () => {
  it('能从 iTXt 的 chara 块中读出卡片（原先会死循环卡死）', () => {
    const png = pngWithChunks([itxtChunk('chara', V2_JSON)])
    expect(extractJsonFromPng(png)).toBe(V2_JSON)
  })

  it('能从 iTXt 的 ccv3 块中读出卡片', () => {
    const v3Json = JSON.stringify({
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: { name: 'v3 card' },
    })
    const png = pngWithChunks([itxtChunk('ccv3', v3Json)])
    expect(extractJsonFromPng(png)).toBe(v3Json)
  })

  it('iTXt 块损坏（缺语言标签终止符）时安全返回 null', () => {
    const kw = Array.from(new TextEncoder().encode('chara'))
    // 只给到 compressionFlag/Method，后面直接结束，没有 langTag 的 \0
    const broken = chunkBytes('iTXt', [...kw, 0, 0, 0])
    expect(extractJsonFromPng(pngWithChunks([broken]))).toBeNull()
  })
})

describe('损坏数据不得导致死循环（回归）', () => {
  it('chara 块内容不是合法 base64 时返回 null 而不是卡死', () => {
    const kw = Array.from(new TextEncoder().encode('chara'))
    const bad = chunkBytes('tEXt', [...kw, 0, ...Array.from(new TextEncoder().encode('not-valid-base64!!!'))])
    expect(extractJsonFromPng(pngWithChunks([bad]))).toBeNull()
  })

  it('损坏的 chara 块之后仍能读到后续有效卡片', () => {
    const kw = Array.from(new TextEncoder().encode('chara'))
    const bad = chunkBytes('tEXt', [...kw, 0, ...Array.from(new TextEncoder().encode('@@@'))])
    const good = chunkBytes('tEXt', [...kw, 0, ...base64Utf8(V2_JSON)])
    expect(extractJsonFromPng(pngWithChunks([bad, good]))).toBe(V2_JSON)
  })

  it('长度字段超出文件末尾时安全退出', () => {
    const view = new Uint8Array(minimalPng())
    // 把 IHDR 的长度字段改成超出文件大小的值
    new DataView(view.buffer).setUint32(8, 0x7fffffff)
    expect(extractJsonFromPng(view.buffer)).toBeNull()
    expect(findIendOffset(view.buffer)).toBe(-1)
  })
})

describe('findIendOffset（回归：不再用子串搜索）', () => {
  it('文本块内容里出现 "IEND" 字面量时不会误判并截断图片', () => {
    const content = Array.from(new TextEncoder().encode('Comment'))
    const decoyText = Array.from(new TextEncoder().encode('see IEND marker inside text'))
    const png = pngWithChunks([chunkBytes('tEXt', [...content, 0, ...decoyText])])

    const realIend = new Uint8Array(png).length - 12
    expect(findIendOffset(png)).toBe(realIend)
  })

  it('IDAT 数据里出现 "IEND" 字节时不影响重新导出', () => {
    const iendBytes = Array.from(new TextEncoder().encode('IEND'))
    const png = concatBytes([
      PNG_SIG,
      chunkBytes('IHDR', new Array(13).fill(0)),
      chunkBytes('IDAT', [...iendBytes, ...iendBytes]),
      chunkBytes('IEND'),
    ])

    const reExported = embedJsonIntoPng(png, V2_JSON)
    expect(isPngFile(reExported)).toBe(true)
    expect(extractJsonFromPng(reExported)).toBe(V2_JSON)
    // IDAT 必须完整保留
    expect(countTextChunks(reExported, 'chara')).toBe(1)
    expect(findIendOffset(reExported)).toBe(new Uint8Array(reExported).length - 12)
  })

  it('重新导出后所有原始 chunk 仍然存在（不丢 IDAT）', () => {
    const png = minimalPng()
    const reExported = embedJsonIntoPng(png, V2_JSON)
    const text = new TextDecoder('latin1').decode(new Uint8Array(reExported))
    expect(text).toContain('IHDR')
    expect(text).toContain('IDAT')
    expect(text).toContain('IEND')
  })
})

describe('isPngFile', () => {
  it('识别 PNG 签名', () => {
    expect(isPngFile(minimalPng())).toBe(true)
  })

  it('拒绝非 PNG 数据', () => {
    expect(isPngFile(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8]).buffer)).toBe(false)
    expect(isPngFile(new Uint8Array(4).buffer)).toBe(false)
  })
})
