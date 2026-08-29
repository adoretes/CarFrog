import { useRef } from 'react'
import { User, FileText, Heart, Compass, MessageSquare } from 'lucide-react'
import { useCharaStore } from '../../store/charaStore'
import { MacroToolbar } from './MacroToolbar'

export function BasicFields() {
  const { card, setField } = useCharaStore()
  const d = card.data

  const descRef = useRef<HTMLTextAreaElement>(null)
  const firstMesRef = useRef<HTMLTextAreaElement>(null)

  const insertAtCursor = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    fieldPath: 'data.description' | 'data.first_mes',
    textToInsert: string,
  ) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const oldVal = (fieldPath === 'data.description' ? d.description : d.first_mes) || ''
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
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          <User className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span>角色名称</span>
        </label>
        <input
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium"
          placeholder="例如：爱丽丝 / 赛博侦探 V"
          value={d.name}
          onChange={(e) => setField('data.name', e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>设定与外貌描述 (Description)</span>
          </label>
          <span className="text-[10px] text-slate-400 font-mono">{d.description?.length || 0} 字符</span>
        </div>
        <MacroToolbar onInsert={(macro) => insertAtCursor(descRef, 'data.description', macro)} />
        <textarea
          ref={descRef}
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono leading-relaxed resize-y"
          rows={6}
          placeholder="描述角色的外貌、身世、穿着及核心特征..."
          value={d.description}
          onChange={(e) => setField('data.description', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>性格特点 (Personality)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">{d.personality?.length || 0} 字符</span>
          </div>
          <textarea
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono leading-relaxed resize-y"
            rows={4}
            placeholder="傲娇、外冷内热、理性沉着..."
            value={d.personality}
            onChange={(e) => setField('data.personality', e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              <span>场景背景 (Scenario)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">{d.scenario?.length || 0} 字符</span>
          </div>
          <textarea
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono leading-relaxed resize-y"
            rows={4}
            placeholder="当前对话发生的背景环境与前置关系..."
            value={d.scenario}
            onChange={(e) => setField('data.scenario', e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>首条开场白消息 (First Message)</span>
          </label>
          <span className="text-[10px] text-slate-400 font-mono">{d.first_mes?.length || 0} 字符</span>
        </div>
        <MacroToolbar onInsert={(macro) => insertAtCursor(firstMesRef, 'data.first_mes', macro)} />
        <textarea
          ref={firstMesRef}
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono leading-relaxed resize-y"
          rows={5}
          placeholder="*轻轻推开咖啡厅的木门，视线落在了你的身上...*"
          value={d.first_mes}
          onChange={(e) => setField('data.first_mes', e.target.value)}
        />
      </div>
    </div>
  )
}
