import { useRef } from 'react'
import { useChatStore } from '../../store/chatStore'
import { readFileAsText, readFileAsDataUrl } from '../../utils/fileUtils'

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadedFiles, addFile, removeFile } = useChatStore()

  const handleFile = async (file: File) => {
    try {
      if (file.type.startsWith('image/')) {
        const dataUrl = await readFileAsDataUrl(file)
        addFile({ name: file.name, content: dataUrl, type: 'image' })
      } else {
        const text = await readFileAsText(file)
        addFile({ name: file.name, content: text, type: 'text' })
      }
    } catch {
      // ignore read errors
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="border-t border-gray-200 px-3 py-2">
      <div
        className="flex flex-wrap gap-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {uploadedFiles.map((f, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
          >
            {f.type === 'image' ? '🖼️' : '📄'} {f.name}
            <button
              className="text-gray-400 hover:text-red-500"
              onClick={() => removeFile(i)}
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
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
