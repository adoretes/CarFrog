import { useRef } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useCharaStore } from '../../store/charaStore'
import { useChatStore } from '../../store/chatStore'
import { useSessionStore } from '../../store/sessionStore'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function AvatarButton() {
  const avatar = useCharaStore((s) => s.avatar)
  const setAvatar = useCharaStore((s) => s.setAvatar)
  const addMessage = useChatStore((s) => s.addMessage)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const hasAvatar = !!avatar

  const handleAvatarImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sessionId = useSessionStore.getState().activeId
    try {
      const dataUrl = await fileToDataUrl(file)
      if (useSessionStore.getState().activeId !== sessionId) return
      setAvatar(dataUrl)
      addMessage({ role: 'assistant', content: `✅ 已导入头像：${file.name}` })
    } catch {
      if (useSessionStore.getState().activeId !== sessionId) return
      addMessage({ role: 'assistant', content: '❌ 头像导入失败' })
    }
    e.target.value = ''
  }

  const handleRemoveAvatar = () => {
    setAvatar(null)
    addMessage({ role: 'assistant', content: '🗑️ 已移除头像' })
  }

  return (
    <div className="flex items-center gap-1">
      <button
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all whitespace-nowrap border border-slate-200/60 dark:border-slate-700/60 shadow-sm"
        onClick={() => avatarInputRef.current?.click()}
        title="设置角色头像"
      >
        <ImagePlus className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
        <span className="hidden sm:inline">头像</span>
      </button>
      {hasAvatar && (
        <button
          className="p-1.5 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
          onClick={handleRemoveAvatar}
          title="移除头像"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarImport}
      />
    </div>
  )
}
