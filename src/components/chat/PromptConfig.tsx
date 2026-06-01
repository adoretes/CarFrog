import { useState, useRef, useEffect } from 'react'
import { fetchModels } from '../../api/aiChat'
import { useChatStore } from '../../store/chatStore'
import { useUiStore } from '../../store/uiStore'
import { useChatStore as useChatMode } from '../../store/chatStore'

type PromptTab = 'brainstorm' | 'generate' | 'refine'

export function PromptConfig() {
  const { apiConfig, setApiConfig } = useChatStore()
  const { showApiConfig, setShowApiConfig, showPromptConfig, setShowPromptConfig } = useUiStore()
  const brainstormPrompt = useChatStore((s) => s.brainstormPrompt)
  const generatePrompt = useChatStore((s) => s.generatePrompt)
  const refinePrompt = useChatStore((s) => s.refinePrompt)
  const setBrainstormPrompt = useChatStore((s) => s.setBrainstormPrompt)
  const setGeneratePrompt = useChatStore((s) => s.setGeneratePrompt)
  const setRefinePrompt = useChatStore((s) => s.setRefinePrompt)
  const currentMode = useChatMode((s) => s.mode)
  const [promptTab, setPromptTab] = useState<PromptTab>('brainstorm')
  const [models, setModels] = useState<string[]>([])
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState('')
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const modelMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!modelMenuRef.current?.contains(event.target as Node)) {
        setModelMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFetchModels = async () => {
    setModelLoading(true)
    setModelError('')
    try {
      const list = await fetchModels(apiConfig)
      setModels(list)
      setModelMenuOpen(list.length > 0)
      if (list.length > 0 && !list.includes(apiConfig.model)) {
        setApiConfig({ model: list[0] })
      }
    } catch (error) {
      setModelError(error instanceof Error ? error.message : '拉取模型失败')
    } finally {
      setModelLoading(false)
    }
  }

  const promptValue = {
    brainstorm: brainstormPrompt,
    generate: generatePrompt,
    refine: refinePrompt,
  }[promptTab]

  const setPromptValue = {
    brainstorm: setBrainstormPrompt,
    generate: setGeneratePrompt,
    refine: setRefinePrompt,
  }[promptTab]

  return (
    <>
      <div className="flex border-b border-gray-200">
        <button
          className="flex-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setShowApiConfig(!showApiConfig)}
        >
          {showApiConfig ? '▼' : '▶'} API 配置
        </button>
        <button
          className="flex-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setShowPromptConfig(!showPromptConfig)}
        >
          {showPromptConfig ? '▼' : '▶'} 提示词
        </button>
      </div>

      {showApiConfig && (
        <div className="p-3 border-b border-gray-200 bg-gray-50 space-y-2">
          <input
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="API Base URL"
            value={apiConfig.baseUrl}
            onChange={(e) => setApiConfig({ baseUrl: e.target.value })}
          />
          <input
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="API Key"
            type="password"
            value={apiConfig.apiKey}
            onChange={(e) => setApiConfig({ apiKey: e.target.value })}
          />
          <div className="relative" ref={modelMenuRef}>
            <input
              className="w-full px-2 py-1.5 pr-20 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="Model (e.g. gpt-4o)"
              value={apiConfig.model}
              onChange={(e) => setApiConfig({ model: e.target.value })}
            />
            <button
              className="absolute right-0 top-0 h-full px-2 text-xs text-white bg-indigo-500 rounded-r hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={modelLoading || !apiConfig.baseUrl}
              onClick={() => {
                if (models.length > 0) {
                  setModelMenuOpen(!modelMenuOpen)
                } else {
                  handleFetchModels()
                }
              }}
            >
              {modelLoading ? '拉取中' : models.length > 0 ? '列表' : '拉取'}
            </button>
            {modelMenuOpen && models.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-gray-300 bg-white shadow">
                {models.map((model) => (
                  <button
                    key={model}
                    className="block w-full px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-indigo-50"
                    onClick={() => {
                      setApiConfig({ model })
                      setModelMenuOpen(false)
                    }}
                  >
                    {model}
                  </button>
                ))}
              </div>
            )}
          </div>
          {modelError && <div className="text-xs text-red-500">{modelError}</div>}
        </div>
      )}

      {showPromptConfig && (
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex border-b border-gray-200">
            {(['brainstorm', 'generate', 'refine'] as PromptTab[]).map((tab) => (
              <button
                key={tab}
                className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${
                  promptTab === tab
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setPromptTab(tab)}
              >
                {tab === 'brainstorm' ? '💬 头脑风暴' : tab === 'generate' ? '✨ 生成' : '🔧 精修'}
              </button>
            ))}
          </div>
          <textarea
            className="w-full px-2 py-1.5 text-xs border-0 focus:outline-none focus:ring-0 font-mono resize-none"
            rows={6}
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
          />
        </div>
      )}
    </>
  )
}
