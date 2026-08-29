import type { CharaCardV2 } from '../types'

/**
 * 快速估算文本 token 数量（粗略近似估算，兼顾中英文字符）
 * 英文单词 ~ 1.3 tokens，汉字 ~ 1.5~2 tokens
 */
export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0
  const clean = text.trim()
  if (!clean) return 0

  let tokens = 0
  // 统计中文字符
  const cjkMatches = clean.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g)
  const cjkCount = cjkMatches ? cjkMatches.length : 0
  tokens += Math.round(cjkCount * 1.5)

  // 移除非 CJK 后的单词/符号统计
  const nonCjk = clean.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ').trim()
  if (nonCjk) {
    const words = nonCjk.split(/\s+/).filter(Boolean)
    tokens += Math.round(words.length * 1.3)
  }

  return Math.max(1, tokens)
}

export interface CardTokenStats {
  totalTokens: number
  permanentTokens: number
  worldBookTokens: number
  totalChars: number
}

export function calculateCardStats(card: CharaCardV2): CardTokenStats {
  const d = card.data
  const descTokens = estimateTokens(d.description)
  const personalityTokens = estimateTokens(d.personality)
  const scenarioTokens = estimateTokens(d.scenario)
  const systemPromptTokens = estimateTokens(d.system_prompt)
  const postHistoryTokens = estimateTokens(d.post_history_instructions)
  const mesExampleTokens = estimateTokens(d.mes_example)
  const firstMesTokens = estimateTokens(d.first_mes)

  const wbEntries = d.character_book?.entries ?? []
  let wbTokens = 0
  let wbConstantTokens = 0

  for (const entry of wbEntries) {
    if (entry.enabled) {
      const entryTokens = estimateTokens(entry.content) + estimateTokens(entry.keys.join(' '))
      wbTokens += entryTokens
      if (entry.constant) {
        wbConstantTokens += entryTokens
      }
    }
  }

  // 常驻消耗 = 描述 + 个性 + 场景 + 系统提示 + 历史后指令 + 常驻世界书
  const permanentTokens =
    descTokens +
    personalityTokens +
    scenarioTokens +
    systemPromptTokens +
    postHistoryTokens +
    wbConstantTokens

  // 总计（含示例、首条消息与全部激活的世界书）
  const totalTokens =
    permanentTokens +
    mesExampleTokens +
    firstMesTokens +
    (wbTokens - wbConstantTokens)

  const allStrings = [
    d.name,
    d.description,
    d.personality,
    d.scenario,
    d.first_mes,
    d.mes_example,
    d.system_prompt,
    d.post_history_instructions,
    d.creator_notes,
    ...d.alternate_greetings,
    ...d.tags,
    ...wbEntries.map((e) => e.content + e.keys.join('')),
  ]

  const totalChars = allStrings.reduce((acc, str) => acc + (str ? str.length : 0), 0)

  return {
    totalTokens,
    permanentTokens,
    worldBookTokens: wbTokens,
    totalChars,
  }
}
