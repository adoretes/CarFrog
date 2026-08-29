import { useState } from 'react'
import {
  Edit3,
  FileCode2,
  Eye,
  ChevronDown,
  ChevronUp,
  Cpu,
  Bookmark,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { useCharaStore } from '../../store/charaStore'
import { BasicFields } from '../editor/BasicFields'
import { AdvancedFields } from '../editor/AdvancedFields'
import { GreetingEditor } from '../editor/GreetingEditor'
import { TagEditor } from '../editor/TagEditor'
import { WorldBookPanel } from '../worldbook/WorldBookPanel'
import { JsonView } from '../preview/JsonView'
import { CardView } from '../preview/CardView'
import { calculateCardStats } from '../../utils/tokenUtils'

interface AccordionSectionProps {
  id: string
  title: string
  icon: React.ReactNode
  badge?: string | number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}

function AccordionSection({
  title,
  icon,
  badge,
  open,
  onToggle,
  children,
}: AccordionSectionProps) {
  return (
    <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full p-3.5 sm:px-4 text-left hover:bg-slate-50/60 dark:hover:bg-slate-850 transition-colors select-none"
      >
        <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
          <span className="text-brand-600 dark:text-brand-400">{icon}</span>
          <span>{title}</span>
          {badge !== undefined && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono font-medium">
              {badge}
            </span>
          )}
        </div>
        <div className="p-1 text-slate-400">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && <div className="p-3.5 sm:p-4 pt-0 border-t border-slate-100 dark:border-slate-800/60 mt-1">{children}</div>}
    </div>
  )
}

export function RightPanel() {
  const { rightTab, setRightTab } = useUiStore()
  const card = useCharaStore((s) => s.card)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    greetings: true,
    tags: true,
    advanced: false,
    worldbook: true,
  })

  const stats = calculateCardStats(card)

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-slate-50/50 dark:bg-slate-950/50">
      {/* 顶部 Tab 与状态栏 */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
              rightTab === 'editor'
                ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold shadow-xs border border-brand-200/60 dark:border-brand-800/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setRightTab('editor')}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>卡片编辑</span>
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
              rightTab === 'preview'
                ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold shadow-xs border border-brand-200/60 dark:border-brand-800/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setRightTab('preview')}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>沉浸预览</span>
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
              rightTab === 'json'
                ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold shadow-xs border border-brand-200/60 dark:border-brand-800/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setRightTab('json')}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>JSON 源码</span>
          </button>
        </div>

        {/* Token 概览指示器 */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/70 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-1" title="角色卡估算总 Token 消耗">
            <Cpu className="w-3 h-3 text-brand-500" />
            <span>总计 ~{stats.totalTokens}t</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <div className="flex items-center gap-1" title="常驻上下文 Token 消耗">
            <Bookmark className="w-3 h-3 text-emerald-500" />
            <span>常驻 ~{stats.permanentTokens}t</span>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {rightTab === 'editor' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <AccordionSection
              id="basic"
              title="基本信息设定"
              icon={<Sparkles className="w-4 h-4" />}
              open={openSections.basic}
              onToggle={() => toggleSection('basic')}
            >
              <BasicFields />
            </AccordionSection>

            <AccordionSection
              id="greetings"
              title="替代分支问候语"
              badge={card.data.alternate_greetings.length}
              icon={<Layers className="w-4 h-4" />}
              open={openSections.greetings}
              onToggle={() => toggleSection('greetings')}
            >
              <GreetingEditor />
            </AccordionSection>

            <AccordionSection
              id="tags"
              title="分类标签"
              badge={card.data.tags.length}
              icon={<Layers className="w-4 h-4" />}
              open={openSections.tags}
              onToggle={() => toggleSection('tags')}
            >
              <TagEditor />
            </AccordionSection>

            <AccordionSection
              id="worldbook"
              title="世界书设定集 (World Book)"
              badge={card.data.character_book?.entries.length || 0}
              icon={<Bookmark className="w-4 h-4" />}
              open={openSections.worldbook}
              onToggle={() => toggleSection('worldbook')}
            >
              <WorldBookPanel />
            </AccordionSection>

            <AccordionSection
              id="advanced"
              title="进阶对话与系统提示"
              icon={<Cpu className="w-4 h-4" />}
              open={openSections.advanced}
              onToggle={() => toggleSection('advanced')}
            >
              <AdvancedFields />
            </AccordionSection>
          </div>
        )}

        {rightTab === 'preview' && <CardView />}
        {rightTab === 'json' && <JsonView />}
      </div>
    </div>
  )
}
