import type { ApiMessage, ApiConfig } from '../types/actions'

function buildHeaders(config: ApiConfig): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
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
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/models`, {
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
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify({
      model: config.model,
      messages: serializeMessages(systemPrompt, messages),
      stream: true,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API Error ${response.status}: ${err}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

    for (const line of lines) {
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content || ''
        fullContent += content
        onChunk?.(fullContent)
      } catch {
        // skip parse errors for partial chunks
      }
    }
  }

  return fullContent
}

export async function sendChatMessageNonStream(
  messages: ApiMessage[],
  systemPrompt: string,
  config: ApiConfig,
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify({
      model: config.model,
      messages: serializeMessages(systemPrompt, messages),
      stream: false,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API Error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
