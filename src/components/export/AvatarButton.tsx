import { useRef } from 'react'
import { useCharaStore } from '../../store/charaStore'
import { useChatStore } from '../../store/chatStore'

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
    try {
      const dataUrl = await fileToDataUrl(file)
      setAvatar(dataUrl)
      addMessage({ role: 'assistant', content: `✅ 已导入头像：${file.name}` })
    } catch {
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
        className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
        onClick={() => avatarInputRef.current?.click()}
      >
        🎨 头像
      </button>
      {hasAvatar && (
        <button
          className="px-2 py-1.5 text-xs sm:text-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
          onClick={handleRemoveAvatar}
          title="移除头像"
        >
          ✕
        </button>
      )}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarImport} />
    </div>
  )
}
