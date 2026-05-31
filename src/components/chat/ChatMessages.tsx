import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useChatStore } from '../../store/chatStore'
import type { Components } from 'react-markdown'

const markdownComponents: Components = {
  pre: ({ children }) => (
    <pre className="bg-gray-900 text-green-300 rounded-lg p-3 overflow-x-auto text-xs leading-relaxed my-2">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className
    return isInline ? (
      <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs" {...props}>
        {children}
      </code>
    ) : (
      <code className="text-green-300 text-xs" {...props}>
        {children}
      </code>
    )
  },
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border-collapse border border-gray-300 text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-200">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-gray-300 px-2 py-1 font-semibold text-left">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-300 px-2 py-1">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-gray-50">{children}</tr>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 pl-3 my-2 text-gray-600 italic">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <h1 className="text-base font-bold my-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold my-1.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
  p: ({ children }) => <p className="my-1">{children}</p>,
}

export function ChatMessages() {
  const messages = useChatStore((s) => s.messages)
  const setMessages = useChatStore((s) => s.setMessages)
  const removeMessage = useChatStore((s) => s.removeMessage)
  const setPendingRegenerate = useChatStore((s) => s.setPendingRegenerate)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4">
        <div className="text-center">
          <p className="text-lg mb-2">开始设计你的角色吧！</p>
          <p>在下方输入你的角色想法，和 AI 一起探讨设定</p>
        </div>
      </div>
    )
  }

  const handleRegenerate = () => {
    const lastAiIndex = messages.length - 1
    if (messages[lastAiIndex]?.role !== 'assistant') return

    let lastUserIndex = -1
    for (let i = lastAiIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i
        break
      }
    }
    if (lastUserIndex === -1) return

    const userContent = messages[lastUserIndex].content
    setMessages(messages.slice(0, lastUserIndex))
    setPendingRegenerate(userContent)
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 chat-messages">
      {messages.map((msg, i) => {
        const isLastAi = i === messages.length - 1 && msg.role === 'assistant'
        return (
          <div
            key={i}
            className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => setHoveredIndex((prev) => (prev === i ? null : i))}
          >
            <div className="max-w-[85%] sm:max-w-[90%] relative">
              {(hoveredIndex === i || isLastAi) && (
                <div
                  className={`absolute top-0 z-10 ${msg.role === 'user' ? 'right-0 sm:left-0 sm:right-auto sm:-translate-x-full sm:pl-1 -top-5 sm:top-0' : 'left-0 sm:right-0 sm:left-auto sm:translate-x-full sm:pr-1 -top-5 sm:top-0'} flex gap-0.5`}
                >
                  <button
                    className="text-gray-400 hover:text-red-500 text-xs px-1 py-0.5 rounded hover:bg-gray-200 transition-colors"
                    onClick={() => removeMessage(i)}
                    title="删除"
                  >
                    ×
                  </button>
                  {isLastAi && (
                    <button
                      className="text-gray-400 hover:text-indigo-600 text-xs px-1 py-0.5 rounded hover:bg-gray-200 transition-colors"
                      onClick={handleRegenerate}
                      title="重新生成"
                    >
                      ↻
                    </button>
                  )}
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-100 text-gray-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.role === 'user' ? (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                ) : (
                  <>
                    {msg.content.includes('<actions>') ? (
                      <div className="mb-1">
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                          📋 动作指令已应用
                        </span>
                      </div>
                    ) : null}
                    <ReactMarkdown components={markdownComponents}>
                      {msg.content.replace(/<actions>[\s\S]*?<\/actions>/g, '')}
                    </ReactMarkdown>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
