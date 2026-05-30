import { downloadBlob } from '../../utils/fileUtils'
import {
  anyImageToPngBuffer,
  cardToPngBlob,
  extractJsonFromPng,
  isPngFile,
} from '../../utils/pngUtils'
import type { CharaCard } from '../../types'
import { cardToJsonString, ensureCharaCard } from '../../utils/charaUtils'

export async function exportAsPng(
  card: CharaCard,
  imageFile: File,
): Promise<void> {
  const pngBuffer = await anyImageToPngBuffer(imageFile)
  const v2Json = cardToJsonString(card)
  const blob = cardToPngBlob(pngBuffer, v2Json)
  const filename = `${card.data.name || '角色卡'}.png`
  downloadBlob(blob, filename)
}

export async function importFromPng(file: File): Promise<CharaCard | null> {
  const buffer = await file.arrayBuffer()
  if (!isPngFile(buffer)) return null
  const json = extractJsonFromPng(buffer)
  if (!json) return null
  try {
    const parsed = JSON.parse(json)
    if (parsed?.spec && parsed?.data) return ensureCharaCard(parsed)
    return null
  } catch {
    return null
  }
}
