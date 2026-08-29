import { useRef } from 'react'
import { Paperclip, FileText, Image as ImageIcon, X } from 'lucide-react'

export interface FileItem {
  id: string
  file: File
}

interface FileUploadProps {
  files: FileItem[]
  onAdd: (fileList: FileList) => void
  onRemove: (id: string) => void
}

export function FileUpload({ files, onAdd, onRemove }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const fileList = e.dataTransfer.files
    if (fileList.length > 0) onAdd(fileList)
  }

  return (
    <div className="px-3.5 py-1.5 bg-slate-50/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/60">
      <div
        className="flex flex-wrap items-center gap-1.5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {files.map((f) => (
          <span
            key={f.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs group"
          >
            {f.file.type.startsWith('image/') ? (
              <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="max-w-[120px] truncate">{f.file.name}</span>
            <button
              className="text-slate-400 hover:text-rose-500 transition-colors"
              onClick={() => onRemove(f.id)}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all"
          onClick={() => fileInputRef.current?.click()}
          title="上传参考设定或参考图"
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>添加附件</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            const fileList = e.target.files
            if (fileList && fileList.length > 0) onAdd(fileList)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
