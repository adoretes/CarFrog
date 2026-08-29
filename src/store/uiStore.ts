import { create } from 'zustand'

export type RightTab = 'editor' | 'json' | 'preview'
export type MobileView = 'chat' | 'right'
export type ThemeMode = 'light' | 'dark' | 'system'
export type SettingsTab = 'api' | 'prompt' | 'about'

const SAVED_THEME_KEY = 'carfrog_theme'
const SAVED_WIDTH_KEY = 'carfrog_chat_width'

function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem(SAVED_THEME_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'system'
}

function getInitialWidth(): number {
  const saved = localStorage.getItem(SAVED_WIDTH_KEY)
  if (saved) {
    const num = parseInt(saved, 10)
    if (!isNaN(num) && num >= 340 && num <= 900) return num
  }
  return 480
}

export function applyTheme(theme: ThemeMode) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

interface UiState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  rightTab: RightTab
  setRightTab: (tab: RightTab) => void
  mobileView: MobileView
  setMobileView: (view: MobileView) => void
  sessionListOpen: boolean
  setSessionListOpen: (open: boolean) => void
  chatPanelWidth: number
  setChatPanelWidth: (width: number) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  settingsTab: SettingsTab
  setSettingsTab: (tab: SettingsTab) => void
}

export const useUiStore = create<UiState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem(SAVED_THEME_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },
  rightTab: 'editor',
  setRightTab: (rightTab) => set({ rightTab }),
  mobileView: 'chat',
  setMobileView: (mobileView) => set({ mobileView }),
  sessionListOpen: false,
  setSessionListOpen: (sessionListOpen) => set({ sessionListOpen }),
  chatPanelWidth: getInitialWidth(),
  setChatPanelWidth: (chatPanelWidth) => {
    localStorage.setItem(SAVED_WIDTH_KEY, String(chatPanelWidth))
    set({ chatPanelWidth })
  },
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  settingsTab: 'api',
  setSettingsTab: (settingsTab) => set({ settingsTab }),
}))
