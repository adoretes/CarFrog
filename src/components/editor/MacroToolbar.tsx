interface MacroToolbarProps {
  onInsert: (text: string) => void
}

export function MacroToolbar({ onInsert }: MacroToolbarProps) {
  const macros = [
    { label: '{{char}}', title: '插入角色名字变量' },
    { label: '{{user}}', title: '插入用户名字变量' },
    { label: '<START>', title: '插入对话分界符' },
  ]

  return (
    <div className="flex items-center gap-1 mb-1 select-none">
      <span className="text-[10px] text-slate-400">宏变量：</span>
      {macros.map((m) => (
        <button
          key={m.label}
          type="button"
          onClick={() => onInsert(m.label)}
          className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 rounded transition-colors"
          title={m.title}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
