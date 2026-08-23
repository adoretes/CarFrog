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

function minimalPng(): ArrayBuffer {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const bytes = new Uint8Array([
    ...sig,
    ...chunkBytes('IHDR', new Array(13).fill(0)),
    ...chunkBytes('IDAT', [1, 2, 3, 4]),
    ...chunkBytes('IEND'),
  ])
  return bytes.buffer
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

  it('同时嵌入 v2/v3 时优先返回 chara (v2) 数据', () => {
    const v3Json = JSON.stringify({
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: { name: 'v3 card' },
    })
    const embedded = embedJsonIntoPng(minimalPng(), V2_JSON, v3Json)
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

describe('isPngFile', () => {
  it('识别 PNG 签名', () => {
    expect(isPngFile(minimalPng())).toBe(true)
  })

  it('拒绝非 PNG 数据', () => {
    expect(isPngFile(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8]).buffer)).toBe(false)
    expect(isPngFile(new Uint8Array(4).buffer)).toBe(false)
  })
})
