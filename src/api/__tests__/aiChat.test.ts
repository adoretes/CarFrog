import { describe, it, expect, afterEach, vi } from 'vitest'
import { createSSELineParser, sendChatMessage } from '../aiChat'
import type { ApiConfig } from '../../types/actions'

describe('createSSELineParser', () => {
  it('解析单个 chunk 内的多条事件', () => {
    const events: string[] = []
    const parse = createSSELineParser((data) => events.push(data))

    parse('data: {"a":1}\n\ndata: {"b":2}\n\ndata: [DONE]\n\n')

    expect(events).toEqual(['{"a":1}', '{"b":2}', '[DONE]'])
  })

  it('跨 chunk 被任意位置切断的事件不丢数据', () => {
    const raw = 'data: {"choices":[{"delta":{"content":"你好世界"}}]}\n\n'

    // 在每个可能的字节位置切成两半，验证都能完整还原
    for (let splitAt = 1; splitAt < raw.length - 1; splitAt++) {
      const events: string[] = []
      const parse = createSSELineParser((data) => events.push(data))
      parse(raw.slice(0, splitAt))
      parse(raw.slice(splitAt))
      expect(events).toEqual(['{"choices":[{"delta":{"content":"你好世界"}}]}'])
    }
  })

  it('切成三个 chunk 同样不丢数据', () => {
    const raw = 'data: {"x":"abc"}\n\ndata: {"y":"def"}\n\n'
    const events: string[] = []
    const parse = createSSELineParser((data) => events.push(data))

    parse(raw.slice(0, 7))
    parse(raw.slice(7, 20))
    parse(raw.slice(20))

    expect(events).toEqual(['{"x":"abc"}', '{"y":"def"}'])
  })

  it('兼容 \\r\\n 行尾', () => {
    const events: string[] = []
    const parse = createSSELineParser((data) => events.push(data))

    parse('data: {"a":1}\r\n\r\ndata: [DONE]\r\n\r\n')

    expect(events).toEqual(['{"a":1}', '[DONE]'])
  })

  it('兼容冒号后无空格的 data 行', () => {
    const events: string[] = []
    const parse = createSSELineParser((data) => events.push(data))

    parse('data:{"a":1}\n\n')

    expect(events).toEqual(['{"a":1}'])
  })

  it('忽略非 data 行（注释/event 字段）', () => {
    const events: string[] = []
    const parse = createSSELineParser((data) => events.push(data))

    parse(': keep-alive\n\nevent: ping\n\n junk\n\ndata: {"ok":1}\n\n')

    expect(events).toEqual(['{"ok":1}'])
  })
})

const TEST_CONFIG: ApiConfig = {
  baseUrl: 'https://api.example.com/v1/',
  apiKey: 'test-key',
  model: 'test-model',
}

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

function deltaEvent(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
}

describe('sendChatMessage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('跨 chunk 分包的事件完整送达 onChunk 并正确拼接结果', async () => {
    const stream = deltaEvent('你好') + deltaEvent('，') + deltaEvent('世界！') + 'data: [DONE]\n\n'
    // 故意从事件 JSON 中间切断
    const chunks = [
      stream.slice(0, 30),
      stream.slice(30, 58),
      stream.slice(58, 61),
      stream.slice(61),
    ]
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(chunks)))

    const received: string[] = []
    const result = await sendChatMessage(
      [{ role: 'user', content: 'hi' }],
      'system',
      TEST_CONFIG,
      (text) => received.push(text),
    )

    expect(result).toBe('你好，世界！')
    expect(received).toEqual(['你好', '你好，', '你好，世界！'])
    // baseUrl 尾部斜杠被归一化
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
