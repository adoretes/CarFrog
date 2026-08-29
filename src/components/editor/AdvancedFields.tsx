import { useRef } from 'react'
import { MessageSquareDashed, Terminal, ScrollText, PenLine } from 'lucide-react'
import { useCharaStore } from '../../store/charaStore'
import { MacroToolbar } from './MacroToolbar'

export function AdvancedFields() {
  const { card, setField } = useCharaStore()
  const d = card.data

  const exampleRef = useRef<HTMLTextAreaElement>(null)
  const systemRef = useRef<HTMLTextAreaElement>(null)
  const postHistoryRef = useRef<HTMLTextAreaElement>(null)

  const insertMacro = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    fieldPath: 'data.mes_example' | 'data.system_prompt' | 'data.post_history_instructions',
    textToInsert: string,
  ) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const oldVal = (d[fieldPath.replace('data.', '') as keyof typeof d] as string) || ''
    const newVal = oldVal.substring(0, start) + textToInsert + oldVal.substring(end)
    setField(fieldPath, newVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + textToInsert.length, start + textToInsert.length)
    }, 0)
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <MessageSquareDashed className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>示例对话 (Message Examples)</span>
          </label>
          <span className="text-[10px] text-slate-400 font-mono">{d.mes_example?.length || 0} 字符</span>
        </div>
        <MacroToolbar onInsert={(macro) => insertMacro(exampleRef, 'data.mes_example', macro)} />
        <textarea
          ref={exampleRef}
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono leading-relaxed resize-y"
          rows={5}
          placeholder="<START>&#10;{{user}}: 你好啊！&#10;{{char}}: 哼，今天找我又有什么事？"
          value={d.mes_example}
          onChange={(e) => setField('data.mes_example', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Terminal className="w-3.5 h-3.5 text-indigo-500" />
              <span>系统提示覆盖 (System Prompt)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">{d.system_prompt?.length || 0} 字符</span>
          </div>
          <textarea
            ref={systemRef}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono leading-relaxed resize-y"
            rows={3}
            placeholder="（可选）覆盖默认的系统提示词"
            value={d.system_prompt}
            onChange={(e) => setField('data.system_prompt', e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <ScrollText className="w-3.5 h-3.5 text-emerald-500" />
              <span>历史后处理指令 (Post-History)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">{d.post_history_instructions?.length || 0} 字符</span>
          </div>
          <textarea
            ref={postHistoryRef}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono leading-relaxed resize-y"
            rows={3}
            placeholder="（可选）在对话历史后注入的强化指令"
            value={d.post_history_instructions}
            onChange={(e) => setField('data.post_history_instructions', e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <PenLine className="w-3.5 h-3.5 text-slate-400" />
            <span>创作者注释 (Creator Notes)</span>
          </label>
          <span className="text-[10px] text-slate-400 font-mono">{d.creator_notes?.length || 0} 字符</span>
        </div>
        <textarea
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono leading-relaxed resize-y"
          rows={2}
          placeholder="（可选）写给使用者的提示或版权声明等"
          value={d.creator_notes}
          onChange={(e) => setField('data.creator_notes', e.target.value)}
        />
      </div>
    </div>
  )
}
