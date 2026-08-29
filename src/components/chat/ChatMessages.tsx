import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Copy,
  Check,
  RotateCcw,
  Trash2,
  ChevronRight,
  Sparkles,
  Bot,
  User,
  Wrench,
} from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { parseActionsFromText } from '../../utils/charaUtils'
import type { Components } from 'react-markdown'

function CollapsiblePre({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-2 border border-slate-700/60 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-slate-300 bg-slate-800 dark:bg-slate-950/80 hover:bg-slate-750 transition-colors select-none font-mono"
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
        <span>{open ? '收起代码块' : '展开代码块'}</span>
      </button>
      {open && (
        <pre className="bg-slate-900 dark:bg-black/80 text-emerald-300 p-3.5 overflow-x-auto text-xs leading-relaxed font-mono">
          {children}
        </pre>
      )}
    </div>
  )
}

const markdownComponents: Components = {
  pre: ({ children }) => <CollapsiblePre>{children}</CollapsiblePre>,
  code: ({ className, children, ...props }) => {
    const isInline = !className
    return isInline ? (
      <code className="bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-300 px-1.5 py-0.5 rounded-md text-xs font-mono" {...props}>
        {children}
      </code>
    ) : (
      <code className="text-emerald-300 text-xs font-mono" {...props}>
        {children}
      </code>
    )
  },
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full border-collapse text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-slate-200 dark:border-slate-700 px-3 py-2 font-semibold text-left">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-slate-100 dark:border-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-slate-50/50 dark:even:bg-slate-800/30">{children}</tr>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside my-1.5 space-y-1 text-slate-700 dark:text-slate-200">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside my-1.5 space-y-1 text-slate-700 dark:text-slate-200">{children}</ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-brand-500/60 dark:border-brand-400 pl-3 my-2 text-slate-600 dark:text-slate-400 italic">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <h1 className="text-base font-bold my-2 text-slate-900 dark:text-slate-100">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold my-1.5 text-slate-900 dark:text-slate-100">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-semibold my-1 text-slate-800 dark:text-slate-200">{children}</h3>,
  p: ({ children }) => <p className="my-1 text-slate-700 dark:text-slate-200 leading-relaxed">{children}</p>,
}

function fieldNameLabel(path: string): string {
  if (path === 'data.name') return '姓名'
  if (path === 'data.description') return '描述设定'
  if (path === 'data.personality') return '性格设定'
  if (path === 'data.scenario') return '场景背景'
  if (path === 'data.first_mes') return '首条消息'
  if (path === 'data.mes_example') return '示例对话'
  if (path === 'data.alternate_greetings') return '问候语'
  if (path === 'data.tags') return '标签'
  if (path.startsWith('data.character_book')) return '世界书'
  return path.replace('data.', '')
}

function ActionsSummary({ content }: { content: string }) {
  const actions = parseActionsFromText(content)
  if (actions.length === 0) return null

  const modifiedFields = Array.from(
    new Set(
      actions.map((a) => fieldNameLabel(a.path)),
    ),
  )

  return (
    <div className="mb-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs">
      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
        <Wrench className="w-3.5 h-3.5" />
        <span>已同步应用微调指令</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {modifiedFields.map((f, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[11px] font-medium"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ChatMessages() {
  const messages = useChatStore((s) => s.messages)
  const setMessages = useChatStore((s) => s.setMessages)
  const removeMessage = useChatStore((s) => s.removeMessage)
  const setPendingRegenerate = useChatStore((s) => s.setPendingRegenerate)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleCopy = async (text: string, index: number) => {
    const cleanText = text.replace(/<actions>[\s\S]*?<\/actions>/g, '').trim()
    try {
      await navigator.clipboard.writeText(cleanText)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1500)
    } catch {
      // fallback
    }
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

    const userMsg = messages[lastUserIndex]
    setMessages(messages.slice(0, lastUserIndex))
    setPendingRegenerate({ content: userMsg.content, files: userMsg.files ?? [] })
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-14 h-14 mb-4 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-100 dark:border-brand-900/60 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm">
          <Sparkles className="w-7 h-7 animate-pulse" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
          开启角色卡头脑风暴
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          像聊天一样描述你想创作的角色（外貌、性格、世界观等），讨论完善后点击右上角「生成角色卡」。
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 chat-messages">
      {messages.map((msg, i) => {
        const isUser = msg.role === 'user'
        const isLastAi = i === messages.length - 1 && !isUser
        const isExcluded = msg.excluded === true
        const prevExcluded = i > 0 ? messages[i - 1].excluded === true : false
        const showDivider = isExcluded && i < messages.length - 1 && messages[i + 1].excluded !== true

        return (
          <div key={i}>
            {!isExcluded && prevExcluded && (
              <div className="flex items-center gap-2 my-4 text-[11px] text-slate-400 dark:text-slate-500 select-none">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  以下为精修阶段（上下文已聚焦）
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>
            )}

            <div
              className={`group flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${
                isExcluded ? 'opacity-40 grayscale' : ''
              }`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* 头像小图标 */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-semibold shadow-xs ${
                  isUser
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* 气泡与操作栏 */}
              <div className={`relative max-w-[85%] sm:max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* 悬浮操作栏 */}
                <div
                  className={`absolute -top-7 z-10 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg px-1 py-0.5 transition-opacity duration-150 ${
                    hoveredIndex === i || isLastAi ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  } ${isUser ? 'right-0' : 'left-0'}`}
                >
                  <button
                    className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded transition-colors"
                    onClick={() => void handleCopy(msg.content, i)}
                    title="复制内容"
                  >
                    {copiedIndex === i ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>

                  {isLastAi && !isExcluded && (
                    <button
                      className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded transition-colors"
                      onClick={handleRegenerate}
                      title="重新生成"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                    onClick={() => removeMessage(i)}
                    title="删除消息"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* 消息主体 */}
                <div
                  className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-brand-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                  }`}
                >
                  {isUser ? (
                    <>
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      {msg.files && msg.files.length > 0 && (
                        <div className="mt-2.5 space-y-1.5 pt-2 border-t border-brand-500/50">
                          {msg.files.map((f, fi) =>
                            f.type === 'image' ? (
                              <img
                                key={fi}
                                src={f.content}
                                alt={f.name}
                                className="max-w-full max-h-56 rounded-xl border border-white/20 object-contain bg-black/10"
                              />
                            ) : (
                              <div
                                key={fi}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-700/60 rounded-lg text-xs text-brand-100"
                              >
                                <span>📄</span>
                                <span className="truncate max-w-[180px]">{f.name}</span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </>
                  ) : msg.streaming ? (
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content}
                      <span className="inline-block w-1.5 h-3.5 align-middle ml-1 bg-brand-500 animate-pulse rounded-xs" />
                    </div>
                  ) : (
                    <>
                      {msg.content.includes('<actions>') && (
                        <ActionsSummary content={msg.content} />
                      )}
                      <ReactMarkdown components={markdownComponents}>
                        {msg.content.replace(/<actions>[\s\S]*?<\/actions>/g, '')}
                      </ReactMarkdown>
                    </>
                  )}
                </div>
              </div>
            </div>

            {showDivider && (
              <div className="flex items-center gap-2 my-4 text-[11px] text-slate-400 dark:text-slate-500 select-none">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  ✨ 角色卡生成完成 · 进入精修
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>
            )}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
