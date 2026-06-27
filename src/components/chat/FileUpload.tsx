import { useRef } from 'react'

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
    <div className="px-3 py-1">
      <div
        className="flex flex-wrap gap-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {files.map((f) => (
          <span
            key={f.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
          >
            {f.file.type.startsWith('image/') ? '🖼️' : '📄'} {f.file.name}
            <button
              className="text-gray-400 hover:text-red-500"
              onClick={() => onRemove(f.id)}
            >
              ×
            </button>
          </span>
        ))}
        <button
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5"
          onClick={() => fileInputRef.current?.click()}
        >
          + 上传
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
