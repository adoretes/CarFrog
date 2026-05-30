import { create } from 'zustand'

type RightTab = 'editor' | 'json' | 'preview'

interface UiState {
  rightTab: RightTab
  setRightTab: (tab: RightTab) => void
  showApiConfig: boolean
  setShowApiConfig: (show: boolean) => void
  showPromptConfig: boolean
  setShowPromptConfig: (show: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  rightTab: 'editor',
  setRightTab: (rightTab) => set({ rightTab }),
  showApiConfig: false,
  setShowApiConfig: (showApiConfig) => set({ showApiConfig }),
  showPromptConfig: false,
  setShowPromptConfig: (showPromptConfig) => set({ showPromptConfig }),
}))
