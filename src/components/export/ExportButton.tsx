import { useRef, useState } from 'react'
import { useCharaStore } from '../../store/charaStore'
import { useChatStore } from '../../store/chatStore'
import { downloadJson } from '../../utils/fileUtils'
import { exportAsPng, importFromPng } from './PngExport'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/png' })
}

export function ExportButton() {
  const card = useCharaStore((s) => s.card)
  const avatar = useCharaStore((s) => s.avatar)
  const setCard = useCharaStore((s) => s.setCard)
  const setAvatar = useCharaStore((s) => s.setAvatar)
  const addMessage = useChatStore((s) => s.addMessage)
  const setMode = useChatStore((s) => s.setMode)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const pngExportRef = useRef<HTMLInputElement>(null)
  const pngImportRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [showMenu, setShowMenu] = useState(false)

  const hasData = !!card.data.name
  const hasAvatar = !!avatar

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (parsed?.spec && parsed?.data) {
        setCard(parsed)
        addMessage({ role: 'assistant', content: `✅ 已导入角色卡：${parsed.data.name || '未命名'}` })
        setMode('refine')
      } else {
        addMessage({ role: 'assistant', content: '❌ 无效的角色卡 JSON 格式' })
      }
    } catch {
      addMessage({ role: 'assistant', content: '❌ 文件解析失败' })
    }
    e.target.value = ''
  }

  const handlePngExport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await exportAsPng(card, file)
    } catch (err) {
      addMessage({ role: 'assistant', content: `❌ PNG 导出失败：${err}` })
    }
    e.target.value = ''
  }

  const handleExportPngWithCurrentAvatar = async () => {
    if (!avatar) return
    try {
      const file = await dataUrlToFile(avatar, 'avatar.png')
      await exportAsPng(card, file)
    } catch (err) {
      addMessage({ role: 'assistant', content: `❌ PNG 导出失败：${err}` })
    }
  }

  const handlePngImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const imported = await importFromPng(file)
    if (imported) {
      setCard(imported)
      try {
        const dataUrl = await fileToDataUrl(file)
        setAvatar(dataUrl)
      } catch {
        // 头像设置失败不影响角色卡导入
      }
      addMessage({ role: 'assistant', content: `✅ 已从 PNG 导入角色卡：${imported.data.name || '未命名'}` })
      setMode('refine')
    } else {
      addMessage({ role: 'assistant', content: '❌ PNG 中未找到有效的角色卡数据' })
    }
    e.target.value = ''
  }

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
    <div className="relative">
      <button
        className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
        onClick={() => setShowMenu(!showMenu)}
      >
        📦 <span className="hidden sm:inline">导出 / 导入</span><span className="sm:hidden">文件</span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            <div className="px-3 py-1 text-xs text-gray-400 font-medium">导出</div>
            <button
              className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
              disabled={!hasData}
              onClick={() => {
                downloadJson(card)
                setShowMenu(false)
              }}
            >
              📄 导出 JSON
            </button>
            {hasAvatar ? (
              <button
                className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                disabled={!hasData}
                onClick={() => {
                  handleExportPngWithCurrentAvatar()
                  setShowMenu(false)
                }}
              >
                🖼️ 导出 PNG
              </button>
            ) : (
              <button
                className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                disabled={!hasData}
                onClick={() => {
                  pngExportRef.current?.click()
                  setShowMenu(false)
                }}
              >
                🖼️ 导出 PNG（选图片）
              </button>
            )}
            <div className="border-t border-gray-100 my-1" />
            <div className="px-3 py-1 text-xs text-gray-400 font-medium">导入</div>
            <button
              className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
              onClick={() => {
                jsonInputRef.current?.click()
                setShowMenu(false)
              }}
            >
              📂 导入 JSON
            </button>
            <button
              className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
              onClick={() => {
                pngImportRef.current?.click()
                setShowMenu(false)
              }}
            >
              🖼️ 导入 PNG 角色卡
            </button>
            <div className="border-t border-gray-100 my-1" />
            <div className="px-3 py-1 text-xs text-gray-400 font-medium">头像</div>
            <button
              className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
              onClick={() => {
                avatarInputRef.current?.click()
                setShowMenu(false)
              }}
            >
              🎨 {hasAvatar ? '更换头像' : '导入头像'}
            </button>
            {hasAvatar && (
              <button
                className="w-full px-4 py-2 text-sm text-left text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  handleRemoveAvatar()
                  setShowMenu(false)
                }}
              >
                🗑️ 移除头像
              </button>
            )}
          </div>
        </>
      )}

      <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
      <input ref={pngExportRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={handlePngExport} />
      <input ref={pngImportRef} type="file" accept=".png" className="hidden" onChange={handlePngImport} />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarImport} />
    </div>
  )
}
