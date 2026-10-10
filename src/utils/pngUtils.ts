/**
 * PNG 角色卡（tEXt / iTXt）读写。
 *
 * 规范要点：
 * - V2 卡片放在名为 `chara` 的文本块，V3 放在 `ccv3`；
 * - 文本块的值是「JSON 的 utf-8 字节再 base64」；
 * - 同时存在 `chara` 与 `ccv3` 时，本工具优先采用先出现者（导出时为 `chara`）。
 *
 * 本文件所有遍历都走 chunk 结构（长度字段 + 类型 + 数据 + CRC），
 * 不再依赖对图像字节做子串搜索——那会把像素里的 "IEND" 误判成块边界。
 */

interface PngChunk {
  type: string
  /** 长度字段的偏移 */
  offset: number
  /** 数据区起始偏移 */
  dataOffset: number
  length: number
  /** 长度字段 + 类型 + 数据 + CRC 的总字节数 */
  total: number
}

const PNG_SIGNATURE_LENGTH = 8
const CHUNK_OVERHEAD = 12
const TEXT_DECODER = new TextDecoder()
const TEXT_ENCODER = new TextEncoder()

/**
 * 按 PNG 结构安全遍历 chunk。
 * 遇到越界或长度字段超出剩余字节（截断/损坏文件）时立即停止，
 * 绝不前进可能为 0 的步长，因此调用方不会陷入死循环。
 */
function* iterateChunks(view: Uint8Array, dv: DataView): Generator<PngChunk> {
  let i = PNG_SIGNATURE_LENGTH
  while (i + 8 <= view.length) {
    const length = dv.getUint32(i)
    const total = CHUNK_OVERHEAD + length
    // 长度字段被读成超大值（>2GB）或越过文件末尾 => 文件已损坏/截断
    if (total > view.length - i) return

    const type = TEXT_DECODER.decode(view.subarray(i + 4, i + 8))
    yield { type, offset: i, dataOffset: i + 8, length, total }

    if (type === 'IEND') return
    i += total
  }
}

interface ParsedTextChunk {
  keyword: string
  text: string
  compressed: boolean
}

/** 解析 tEXt / iTXt 的文本内容；结构不合法返回 null */
function parseTextChunk(view: Uint8Array, chunk: PngChunk): ParsedTextChunk | null {
  const start = chunk.dataOffset
  const end = chunk.dataOffset + chunk.length
  if (end > view.length) return null

  const nullPos = view.indexOf(0, start)
  if (nullPos === -1 || nullPos >= end) return null

  const keyword = TEXT_DECODER.decode(view.subarray(start, nullPos))

  if (chunk.type === 'tEXt') {
    // keyword\0text
    return { keyword, text: TEXT_DECODER.decode(view.subarray(nullPos + 1, end)), compressed: false }
  }

  // iTXt: keyword\0 compressionFlag(1) compressionMethod(1) langTag\0 translatedKeyword\0 text
  const flagPos = nullPos + 1
  if (flagPos + 2 > end) return null
  const compressed = (view[flagPos] & 1) === 1

  const langEnd = view.indexOf(0, flagPos + 2)
  if (langEnd === -1 || langEnd >= end) return null
  const translatedEnd = view.indexOf(0, langEnd + 1)
  if (translatedEnd === -1 || translatedEnd >= end) return null

  return {
    keyword,
    text: TEXT_DECODER.decode(view.subarray(translatedEnd + 1, end)),
    compressed,
  }
}

function isCardKeyword(keyword: string): boolean {
  return keyword === 'chara' || keyword === 'ccv3'
}

/** 定位 IEND 块（返回其长度字段偏移）；找不到返回 -1 */
export function findIendOffset(buffer: ArrayBuffer): number {
  const view = new Uint8Array(buffer)
  const dv = new DataView(buffer)
  for (const chunk of iterateChunks(view, dv)) {
    if (chunk.type === 'IEND') return chunk.offset
  }
  return -1
}

export function encodeTextChunk(keyword: string, text: string): ArrayBuffer {
  const keywordBytes = TEXT_ENCODER.encode(keyword)
  const textBytes = TEXT_ENCODER.encode(text)

  const data = new Uint8Array(keywordBytes.length + 1 + textBytes.length)
  data.set(keywordBytes, 0)
  data.set([0], keywordBytes.length)
  data.set(textBytes, keywordBytes.length + 1)

  const chunkData = new Uint8Array(CHUNK_OVERHEAD + data.length)
  const dv = new DataView(chunkData.buffer)

  dv.setUint32(0, data.length)
  chunkData.set(TEXT_ENCODER.encode('tEXt'), 4)
  chunkData.set(data, 8)

  const crcData = chunkData.subarray(4, 8 + data.length)
  dv.setUint32(8 + data.length, crc32(crcData))

  return chunkData.buffer
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function utf8ToBase64(str: string): string {
  const bytes = TEXT_ENCODER.encode(str)
  let binary = ''
  // 分批拼装，避免大卡片时 String.fromCharCode 的参数个数超限
  const BATCH = 0x8000
  for (let i = 0; i < bytes.length; i += BATCH) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BATCH))
  }
  return btoa(binary)
}

function base64ToUtf8(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return TEXT_DECODER.decode(bytes)
}

export function anyImageToPngBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        if (!blob) { reject(new Error('PNG conversion failed')); return }
        blob.arrayBuffer().then(resolve).catch(reject)
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

/**
 * 写入角色卡数据。
 *
 * 先剥掉文件里已有的 `chara` / `ccv3` 块再写入新数据：
 * 否则旧块会留在图片里，而读取方（以及本文件的 extractJsonFromPng）
 * 取的是先出现的那个，表现为「改名导出后重新导入还是旧数据」。
 */
export function embedJsonIntoPng(
  pngBuffer: ArrayBuffer,
  v2Json: string,
  v3Json?: string,
): ArrayBuffer {
  const view = new Uint8Array(pngBuffer)
  const dv = new DataView(pngBuffer)

  let iendOffset = -1
  const keptChunks: Uint8Array[] = []

  for (const chunk of iterateChunks(view, dv)) {
    if (chunk.type === 'IEND') {
      iendOffset = chunk.offset
      break
    }
    const parsed = chunk.type === 'tEXt' || chunk.type === 'iTXt' ? parseTextChunk(view, chunk) : null
    if (parsed && isCardKeyword(parsed.keyword)) continue // 丢弃旧卡片数据
    keptChunks.push(view.subarray(chunk.offset, chunk.offset + chunk.total))
  }

  if (iendOffset === -1) return pngBuffer

  const newChunks = [new Uint8Array(encodeTextChunk('chara', utf8ToBase64(v2Json)))]
  if (v3Json) {
    newChunks.push(new Uint8Array(encodeTextChunk('ccv3', utf8ToBase64(v3Json))))
  }

  // IEND 本身及其后的任何字节（部分工具会追加数据）原样保留
  const tail = view.subarray(iendOffset)

  const total =
    PNG_SIGNATURE_LENGTH +
    keptChunks.reduce((sum, c) => sum + c.length, 0) +
    newChunks.reduce((sum, c) => sum + c.length, 0) +
    tail.length

  const result = new Uint8Array(total)
  let offset = 0
  result.set(view.subarray(0, PNG_SIGNATURE_LENGTH), offset)
  offset += PNG_SIGNATURE_LENGTH
  for (const chunk of keptChunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  for (const chunk of newChunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  result.set(tail, offset)

  return result.buffer
}

/**
 * 提取内嵌的角色卡 JSON。
 *
 * 规范要求：同时存在 `ccv3` 与 `chara` 时**优先采用 `ccv3`**（信息更全），
 * 只在不认识 V3 时才退回 `chara`。因此这里先扫一遍找 ccv3，再退回 chara，
 * 而不是简单返回文件里第一个出现的块。
 *
 * 单块损坏（非法 base64、压缩的 iTXt）只跳过该块，不影响后续块。
 */
export function extractJsonFromPng(buffer: ArrayBuffer): string | null {
  return (
    findCardChunkJson(buffer, 'ccv3') ??
    findCardChunkJson(buffer, 'chara')
  )
}

function findCardChunkJson(buffer: ArrayBuffer, keyword: string): string | null {
  const view = new Uint8Array(buffer)
  const dv = new DataView(buffer)

  for (const chunk of iterateChunks(view, dv)) {
    if (chunk.type !== 'tEXt' && chunk.type !== 'iTXt') continue

    const parsed = parseTextChunk(view, chunk)
    if (!parsed || parsed.keyword !== keyword) continue
    // 压缩型 iTXt 需要 inflate，同步路径无法处理，跳过而不是中断遍历
    if (parsed.compressed) continue

    try {
      const json = base64ToUtf8(parsed.text)
      if (json.includes('"spec"') && json.includes('"data"')) return json
    } catch {
      continue
    }
  }

  return null
}

export function isPngFile(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer)
  return view.length > 8 &&
    view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47 &&
    view[4] === 0x0D && view[5] === 0x0A && view[6] === 0x1A && view[7] === 0x0A
}

export function cardToPngBlob(
  pngBuffer: ArrayBuffer,
  v2Json: string,
  v3Json?: string,
): Blob {
  const embedded = embedJsonIntoPng(pngBuffer, v2Json, v3Json)
  return new Blob([embedded], { type: 'image/png' })
}
