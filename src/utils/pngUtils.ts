export function encodeTextChunk(keyword: string, text: string): ArrayBuffer {
  const textEncoder = new TextEncoder()
  const keywordBytes = textEncoder.encode(keyword)
  const nullByte = new Uint8Array([0])
  const textBytes = textEncoder.encode(text)

  const data = new Uint8Array(keywordBytes.length + nullByte.length + textBytes.length)
  data.set(keywordBytes, 0)
  data.set(nullByte, keywordBytes.length)
  data.set(textBytes, keywordBytes.length + nullByte.length)

  const typeBytes = textEncoder.encode('tEXt')
  const length = data.length

  const chunkData = new Uint8Array(4 + 4 + data.length + 4)
  const dv = new DataView(chunkData.buffer)

  dv.setUint32(0, length)
  chunkData.set(typeBytes, 4)
  chunkData.set(data, 8)

  const crcData = new Uint8Array(chunkData.buffer, 4, 4 + data.length)
  const crcVal = crc32(crcData)
  dv.setUint32(8 + data.length, crcVal)

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

export function findIendOffset(buffer: ArrayBuffer): number {
  const view = new Uint8Array(buffer)
  const iendMark = textToBytes('IEND')
  for (let i = 0; i < view.length - 4; i++) {
    if (
      view[i] === iendMark[0] &&
      view[i + 1] === iendMark[1] &&
      view[i + 2] === iendMark[2] &&
      view[i + 3] === iendMark[3]
    ) {
      return i - 4
    }
  }
  return -1
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUtf8(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
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

export function embedJsonIntoPng(
  pngBuffer: ArrayBuffer,
  v2Json: string,
  v3Json?: string,
): ArrayBuffer {
  const iendOffset = findIendOffset(pngBuffer)
  if (iendOffset === -1) return pngBuffer

  const v2Chunk = encodeTextChunk('chara', utf8ToBase64(v2Json))
  const v3Chunk = v3Json ? encodeTextChunk('ccv3', utf8ToBase64(v3Json)) : null

  const head = new Uint8Array(pngBuffer, 0, iendOffset)
  const iend = new Uint8Array(pngBuffer, iendOffset)

  let totalLength = head.length + v2Chunk.byteLength
  if (v3Chunk) totalLength += v3Chunk.byteLength
  totalLength += iend.length

  const result = new Uint8Array(totalLength)
  result.set(head, 0)
  result.set(new Uint8Array(v2Chunk), head.length)
  if (v3Chunk) {
    result.set(new Uint8Array(v3Chunk), head.length + v2Chunk.byteLength)
  }
  result.set(iend, totalLength - iend.length)

  return result.buffer
}

export function extractJsonFromPng(buffer: ArrayBuffer): string | null {
  const view = new Uint8Array(buffer)
  const textDecoder = new TextDecoder()

  let i = 8
  while (i < view.length) {
    const dv = new DataView(buffer)
    if (i + 8 > view.length) break
    const length = dv.getUint32(i)
    const type = textDecoder.decode(view.slice(i + 4, i + 8))

    if (type === 'tEXt' || type === 'iTXt') {
      const chunkData = view.slice(i + 8, i + 8 + length)
      const nullPos = chunkData.indexOf(0)
      if (nullPos !== -1) {
        const keyword = textDecoder.decode(chunkData.slice(0, nullPos))
        const textData = chunkData.slice(nullPos + 1)

        if (keyword === 'chara' || keyword === 'ccv3') {
          try {
            const text = type === 'iTXt' ? textDecoder.decode(textData) : textDecoder.decode(textData)
            const json = base64ToUtf8(text)
            if (json.includes('"spec"') && json.includes('"data"')) {
              return json
            }
          } catch {
            continue
          }
        }
      }
    }

    i += 12 + length
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
