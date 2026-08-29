import { useState, useRef, useEffect } from 'react'
import {
  X,
  Key,
  Bot,
  Sliders,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Wrench,
  Sun,
  Moon,
  Laptop,
  Check,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react'
import { fetchModels } from '../../api/aiChat'
import { useChatStore } from '../../store/chatStore'
import { useUiStore, type ThemeMode } from '../../store/uiStore'
import {
  DEFAULT_BRAINSTORM_PROMPT,
  DEFAULT_GENERATE_PROMPT,
  DEFAULT_REFINE_PROMPT,
} from '../../utils/charaUtils'

type PromptTab = 'brainstorm' | 'generate' | 'refine'

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, settingsTab, setSettingsTab, theme, setTheme } = useUiStore()
  const { apiConfig, setApiConfig } = useChatStore()
  const brainstormPrompt = useChatStore((s) => s.brainstormPrompt)
  const generatePrompt = useChatStore((s) => s.generatePrompt)
  const refinePrompt = useChatStore((s) => s.refinePrompt)
  const setBrainstormPrompt = useChatStore((s) => s.setBrainstormPrompt)
  const setGeneratePrompt = useChatStore((s) => s.setGeneratePrompt)
  const setRefinePrompt = useChatStore((s) => s.setRefinePrompt)

  const [promptTab, setPromptTab] = useState<PromptTab>('brainstorm')
  const [models, setModels] = useState<string[]>([])
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState('')
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const modelMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!settingsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, setSettingsOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!modelMenuRef.current?.contains(event.target as Node)) {
        setModelMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!settingsOpen) return null

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
      setModelError(error instanceof Error ? error.message : '拉取模型失败，请检查 Base URL 和 API Key')
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

  const defaultPrompt = {
    brainstorm: DEFAULT_BRAINSTORM_PROMPT,
    generate: DEFAULT_GENERATE_PROMPT,
    refine: DEFAULT_REFINE_PROMPT,
  }[promptTab]

  const isDefault = promptValue === defaultPrompt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setSettingsOpen(false)}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">偏好与配置</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">自定义接口、系统提示词与应用外观</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-2 bg-slate-50/50 dark:bg-slate-950/30">
          <button
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-medium transition-all ${
              settingsTab === 'api'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setSettingsTab('api')}
          >
            <Key className="w-4 h-4" />
            API 设置
          </button>
          <button
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-medium transition-all ${
              settingsTab === 'prompt'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setSettingsTab('prompt')}
          >
            <Bot className="w-4 h-4" />
            系统提示词
          </button>
          <button
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-medium transition-all ${
              settingsTab === 'about'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setSettingsTab('about')}
          >
            <Info className="w-4 h-4" />
            外观与关于
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {settingsTab === 'api' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  API Base URL
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all font-mono"
                  placeholder="https://api.openai.com/v1"
                  value={apiConfig.baseUrl}
                  onChange={(e) => setApiConfig({ baseUrl: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-slate-400">支持 OpenAI 标准兼容接口，如 OpenRouter、DeepSeek、OneAPI、Ollama 等</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-16 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all font-mono"
                    placeholder="sk-..."
                    value={apiConfig.apiKey}
                    onChange={(e) => setApiConfig({ apiKey: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1.5 py-0.5 rounded"
                  >
                    {showPassword ? '隐藏' : '显示'}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">所有密钥均仅保存在您本地浏览器中，绝不上报云端</p>
              </div>

              <div ref={modelMenuRef} className="relative">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  模型名称 (Model)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all font-mono"
                    placeholder="gpt-4o / claude-3-5-sonnet / deepseek-chat"
                    value={apiConfig.model}
                    onChange={(e) => setApiConfig({ model: e.target.value })}
                  />
                  <button
                    type="button"
                    disabled={modelLoading || !apiConfig.baseUrl}
                    onClick={() => {
                      if (models.length > 0) {
                        setModelMenuOpen(!modelMenuOpen)
                      } else {
                        handleFetchModels()
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-xl transition-all shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${modelLoading ? 'animate-spin' : ''}`} />
                    {modelLoading ? '拉取中' : models.length > 0 ? '选择模型' : '拉取列表'}
                  </button>
                </div>

                {modelMenuOpen && models.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl py-1">
                    {models.map((model) => (
                      <button
                        key={model}
                        className={`flex items-center justify-between w-full px-3 py-2 text-left text-xs transition-colors ${
                          apiConfig.model === model
                            ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-medium'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                        onClick={() => {
                          setApiConfig({ model })
                          setModelMenuOpen(false)
                        }}
                      >
                        <span className="font-mono">{model}</span>
                        {apiConfig.model === model && <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />}
                      </button>
                    ))}
                  </div>
                )}
                {modelError && <p className="mt-1.5 text-xs text-rose-500">{modelError}</p>}
              </div>
            </div>
          )}

          {settingsTab === 'prompt' && (
            <div className="space-y-3">
              <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    promptTab === 'brainstorm'
                      ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  onClick={() => setPromptTab('brainstorm')}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  头脑风暴
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    promptTab === 'generate'
                      ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  onClick={() => setPromptTab('generate')}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  生成卡片
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    promptTab === 'refine'
                      ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  onClick={() => setPromptTab('refine')}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  精修微调
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {promptTab === 'brainstorm' && '引导 AI 共同探讨人物人设与背景设定'}
                  {promptTab === 'generate' && '让 AI 按规范提取并一次性生成完整 JSON'}
                  {promptTab === 'refine' && '在已有角色卡基础上，按指令以 <actions> 标签微调字段'}
                </span>
                <button
                  className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setPromptValue(defaultPrompt)}
                  disabled={isDefault}
                >
                  <RotateCcw className="w-3 h-3" />
                  恢复默认
                </button>
              </div>

              <textarea
                className="w-full h-72 px-3 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none leading-relaxed"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
              />
            </div>
          )}

          {settingsTab === 'about' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  界面主题外观
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light' as ThemeMode)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      theme === 'light'
                        ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400 ring-2 ring-brand-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="text-xs font-medium">浅色模式</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark' as ThemeMode)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400 ring-2 ring-brand-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span className="text-xs font-medium">深色模式</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('system' as ThemeMode)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      theme === 'system'
                        ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400 ring-2 ring-brand-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <Laptop className="w-5 h-5" />
                    <span className="text-xs font-medium">跟随系统</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <img src="/icons/carfrog-icon-64.png" alt="" className="w-6 h-6 rounded-md" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">CarFrog 🐸 v1.0</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  纯对话 AI 辅助角色卡创作工具。专为 SillyTavern / 酒馆生态设计，无后端本地存储，安全轻量。
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs text-brand-600 dark:text-brand-400">
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:underline"
                  >
                    GitHub 仓库 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-xl transition-colors shadow-sm"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
