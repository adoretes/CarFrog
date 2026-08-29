import { useRef, useState, useEffect } from 'react'
import {
  DownloadCloud,
  FileJson,
  Image as ImageIcon,
  Upload,
  FolderOpen,
  ChevronDown,
} from 'lucide-react'
import { useCharaStore } from '../../store/charaStore'
import { useChatStore } from '../../store/chatStore'
import { useSessionStore } from '../../store/sessionStore'
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
  const resetChat = useChatStore((s) => s.resetChat)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const pngExportRef = useRef<HTMLInputElement>(null)
  const pngImportRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [showMenu, setShowMenu] = useState(false)

  const hasData = !!card.data.name
  const hasAvatar = !!avatar

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sessionId = useSessionStore.getState().activeId
    try {
      const text = await file.text()
      if (useSessionStore.getState().activeId !== sessionId) return
      const parsed = JSON.parse(text)
      if (parsed?.spec && parsed?.data) {
        resetChat()
        setAvatar(null)
        setCard(parsed)
        addMessage({ role: 'assistant', content: `✅ 已导入角色卡：${parsed.data.name || '未命名'}` })
        setMode('refine')
      } else {
        addMessage({ role: 'assistant', content: '❌ 无效的角色卡 JSON 格式' })
      }
    } catch {
      if (useSessionStore.getState().activeId !== sessionId) return
      addMessage({ role: 'assistant', content: '❌ 文件解析失败' })
    }
    e.target.value = ''
  }

  const handlePngExport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sessionId = useSessionStore.getState().activeId
    try {
      await exportAsPng(card, file)
    } catch (err) {
      if (useSessionStore.getState().activeId !== sessionId) return
      addMessage({ role: 'assistant', content: `❌ PNG 导出失败：${err}` })
    }
    e.target.value = ''
  }

  const handleExportPngWithCurrentAvatar = async () => {
    if (!avatar) return
    const sessionId = useSessionStore.getState().activeId
    try {
      const file = await dataUrlToFile(avatar, 'avatar.png')
      await exportAsPng(card, file)
    } catch (err) {
      if (useSessionStore.getState().activeId !== sessionId) return
      addMessage({ role: 'assistant', content: `❌ PNG 导出失败：${err}` })
    }
  }

  const handlePngImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sessionId = useSessionStore.getState().activeId
    const imported = await importFromPng(file)
    if (useSessionStore.getState().activeId !== sessionId) return
    if (imported) {
      resetChat()
      setCard(imported)
      try {
        const dataUrl = await fileToDataUrl(file)
        if (useSessionStore.getState().activeId !== sessionId) return
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-xl transition-all shadow-sm shadow-brand-500/20 whitespace-nowrap"
        onClick={() => setShowMenu(!showMenu)}
      >
        <DownloadCloud className="w-3.5 h-3.5" />
        <span>导入 / 导出</span>
        <ChevronDown className="w-3 h-3 opacity-80" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            导出角色卡
          </div>
          <button
            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            disabled={!hasData}
            onClick={() => {
              downloadJson(card)
              setShowMenu(false)
            }}
          >
            <FileJson className="w-4 h-4 text-emerald-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">导出 JSON</div>
              <div className="text-[10px] text-slate-400">标准 SillyTavern V2 格式</div>
            </div>
          </button>
          {hasAvatar ? (
            <button
              className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={!hasData}
              onClick={() => {
                void handleExportPngWithCurrentAvatar()
                setShowMenu(false)
              }}
            >
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">导出 PNG 角色卡</div>
                <div className="text-[10px] text-slate-400">嵌入当前头像元数据</div>
              </div>
            </button>
          ) : (
            <button
              className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={!hasData}
              onClick={() => {
                pngExportRef.current?.click()
                setShowMenu(false)
              }}
            >
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">导出 PNG（选择图片）</div>
                <div className="text-[10px] text-slate-400">选取底图并写入数据</div>
              </div>
            </button>
          )}

          <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            导入角色卡
          </div>
          <button
            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => {
              jsonInputRef.current?.click()
              setShowMenu(false)
            }}
          >
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">导入 JSON 角色卡</div>
              <div className="text-[10px] text-slate-400">支持 V2 格式 JSON</div>
            </div>
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => {
              pngImportRef.current?.click()
              setShowMenu(false)
            }}
          >
            <Upload className="w-4 h-4 text-sky-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">导入 PNG 角色卡</div>
              <div className="text-[10px] text-slate-400">读取图片 tEXt 数据</div>
            </div>
          </button>
        </div>
      )}

      <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
      <input ref={pngExportRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={handlePngExport} />
      <input ref={pngImportRef} type="file" accept=".png" className="hidden" onChange={handlePngImport} />
    </div>
  )
}
