import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

const isBrowser = typeof window !== 'undefined'
const STORAGE_KEY = 'theme'

export function getSystemTheme(): 'light' | 'dark' {
  if (!isBrowser) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  if (!isBrowser) return
  document.documentElement.setAttribute('data-theme', theme === 'system' ? getSystemTheme() : theme)
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : null
  } catch {
    return null
  }
}

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    return
  }
}

interface ThemeState {
  currentTheme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: readStoredTheme() ?? 'system',
  setTheme(theme) {
    set({ currentTheme: theme })
    applyTheme(theme)
    persistTheme(theme)
  },
  toggleTheme() {
    get().setTheme(get().currentTheme === 'dark' ? 'light' : 'dark')
  },
}))

let initialized = false

export function initializeTheme(): void {
  if (initialized || !isBrowser) return
  initialized = true
  applyTheme(useThemeStore.getState().currentTheme)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().currentTheme === 'system') applyTheme('system')
  })
}
