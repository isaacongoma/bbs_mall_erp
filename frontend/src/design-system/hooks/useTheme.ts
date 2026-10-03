import { initializeTheme, useThemeStore, type Theme } from '../stores/themeStore'

initializeTheme()

export type { Theme }

export function useTheme() {
  const currentTheme = useThemeStore((state) => state.currentTheme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  return { currentTheme, setTheme, toggleTheme }
}
