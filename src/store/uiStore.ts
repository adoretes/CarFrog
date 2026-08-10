import { create } from 'zustand'

type RightTab = 'editor' | 'json' | 'preview'
type MobileView = 'chat' | 'right'

interface UiState {
  rightTab: RightTab
  setRightTab: (tab: RightTab) => void
  showApiConfig: boolean
  setShowApiConfig: (show: boolean) => void
  showPromptConfig: boolean
  setShowPromptConfig: (show: boolean) => void
  mobileView: MobileView
  setMobileView: (view: MobileView) => void
  sessionListOpen: boolean
  setSessionListOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  rightTab: 'editor',
  setRightTab: (rightTab) => set({ rightTab }),
  showApiConfig: false,
  setShowApiConfig: (showApiConfig) => set({ showApiConfig }),
  showPromptConfig: false,
  setShowPromptConfig: (showPromptConfig) => set({ showPromptConfig }),
  mobileView: 'chat',
  setMobileView: (mobileView) => set({ mobileView }),
  sessionListOpen: false,
  setSessionListOpen: (sessionListOpen) => set({ sessionListOpen }),
}))
