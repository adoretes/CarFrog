import type { ApiMessage, ApiConfig } from '../types/actions'

function buildHeaders(config: ApiConfig): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

/**
 * SSE 事件按行分隔，而网络 chunk 的边界与行边界无关：
 * 一条 `data: {...}` 事件可能被 TCP 分包切成任意位置。
 * 解析器内部维护跨 chunk 行缓冲，只处理完整行，残行留待下一个 chunk。
 */
export function createSSELineParser(onLine: (line: string) => void) {
  let buffer = ''
  return (chunk: string) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data:')) {
        // 规范允许冒号后跟一个可选空格
        onLine(trimmed.slice(5).replace(/^ /, ''))
      }
    }
  }
}

function serializeMessages(
  systemPrompt: string,
  messages: ApiMessage[],
): { role: string; content: unknown }[] {
  return [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]
}

export async function fetchModels(config: ApiConfig): Promise<string[]> {
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/models`, {
    method: 'GET',
    headers: buildHeaders(config),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API Error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const source = Array.isArray(data) ? data : data.data || data.models || []
  return Array.from(
    new Set(
      source
        .map((model: unknown) => {
          if (typeof model === 'string') return model
          if (model && typeof model === 'object') {
            const item = model as { id?: unknown; name?: unknown; model?: unknown }
            return item.id || item.name || item.model
          }
          return null
        })
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
    ),
  )
}

export async function sendChatMessage(
  messages: ApiMessage[],
  systemPrompt: string,
  config: ApiConfig,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify({
      model: config.model,
      messages: serializeMessages(systemPrompt, messages),
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API Error ${response.status}: ${err}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullContent = ''

  const parseChunk = createSSELineParser((data) => {
    if (data === '[DONE]') return
    try {
      const parsed = JSON.parse(data)
      const content = parsed.choices?.[0]?.delta?.content || ''
      if (content) {
        fullContent += content
        onChunk?.(fullContent)
      }
    } catch {
      // 忽略无法解析的事件（如供应商返回的非 JSON 心跳）
    }
  })

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parseChunk(decoder.decode(value, { stream: true }))
  }

  return fullContent
}

export async function sendChatMessageNonStream(
  messages: ApiMessage[],
  systemPrompt: string,
  config: ApiConfig,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify({
      model: config.model,
      messages: serializeMessages(systemPrompt, messages),
      stream: false,
    }),
    signal,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API Error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
