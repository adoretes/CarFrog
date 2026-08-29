import { Plus, Trash2, MessagesSquare } from 'lucide-react'
import { useCharaStore } from '../../store/charaStore'
import { MacroToolbar } from './MacroToolbar'

export function GreetingEditor() {
  const { card, setField } = useCharaStore()
  const greetings = card.data.alternate_greetings

  const addGreeting = () => {
    setField('data.alternate_greetings', [...greetings, ''])
  }

  const removeGreeting = (index: number) => {
    const updated = greetings.filter((_, i) => i !== index)
    setField('data.alternate_greetings', updated)
  }

  const updateGreeting = (index: number, value: string) => {
    const updated = greetings.map((g, i) => (i === index ? value : g))
    setField('data.alternate_greetings', updated)
  }

  const insertMacro = (index: number, macro: string) => {
    const current = greetings[index] || ''
    updateGreeting(index, current + macro)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          提供除首条消息外的多版本开场白，可在 SillyTavern 中左右滑动切换不同开场分支。
        </p>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 hover:bg-brand-100 rounded-lg transition-colors border border-brand-200/60 dark:border-brand-800/60 flex-shrink-0"
          onClick={addGreeting}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加问候语</span>
        </button>
      </div>

      {greetings.length === 0 ? (
        <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
          暂无替代问候语，点击上方按钮添加
        </div>
      ) : (
        <div className="space-y-3">
          {greetings.map((g, i) => (
            <div
              key={i}
              className="p-3 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <MessagesSquare className="w-3.5 h-3.5 text-amber-500" />
                  <span>分支问候语 #{i + 1}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({g.length} 字符)</span>
                </div>
                <div className="flex items-center gap-2">
                  <MacroToolbar onInsert={(macro) => insertMacro(i, macro)} />
                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                    onClick={() => removeGreeting(i)}
                    title="删除此问候语"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono leading-relaxed resize-y"
                rows={3}
                placeholder="输入该分支的开场白..."
                value={g}
                onChange={(e) => updateGreeting(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
