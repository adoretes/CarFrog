import { useState } from 'react'
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
          <input
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="Model (e.g. gpt-4o)"
            value={apiConfig.model}
            onChange={(e) => setApiConfig({ model: e.target.value })}
          />
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
