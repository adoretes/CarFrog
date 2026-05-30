import { useRef, useState } from 'react'
import { useCharaStore } from '../../store/charaStore'
import { useChatStore } from '../../store/chatStore'
import { downloadJson } from '../../utils/fileUtils'
import { exportAsPng, importFromPng } from './PngExport'

export function ExportButton() {
  const card = useCharaStore((s) => s.card)
  const setCard = useCharaStore((s) => s.setCard)
  const addMessage = useChatStore((s) => s.addMessage)
  const setMode = useChatStore((s) => s.setMode)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const pngExportRef = useRef<HTMLInputElement>(null)
  const pngImportRef = useRef<HTMLInputElement>(null)
  const [showMenu, setShowMenu] = useState(false)

  const hasData = !!card.data.name

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

  const handlePngImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const imported = await importFromPng(file)
    if (imported) {
      setCard(imported)
      addMessage({ role: 'assistant', content: `✅ 已从 PNG 导入角色卡：${imported.data.name || '未命名'}` })
      setMode('refine')
    } else {
      addMessage({ role: 'assistant', content: '❌ PNG 中未找到有效的角色卡数据' })
    }
    e.target.value = ''
  }

  return (
    <div className="relative">
      <button
        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        onClick={() => setShowMenu(!showMenu)}
      >
        📦 导出 / 导入
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
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
            <button
              className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
              disabled={!hasData}
              onClick={() => {
                pngExportRef.current?.click()
                setShowMenu(false)
              }}
            >
              🖼️ 导出 PNG（选头像）
            </button>
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
          </div>
        </>
      )}

      <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
      <input ref={pngExportRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={handlePngExport} />
      <input ref={pngImportRef} type="file" accept=".png" className="hidden" onChange={handlePngImport} />
    </div>
  )
}
