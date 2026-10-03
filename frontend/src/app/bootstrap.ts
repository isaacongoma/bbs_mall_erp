import { useAuthStore } from '@/core/auth/authStore'
import { useBootStore } from '@/core/boot'
import { configureUpload, setMaxFileSize } from '@/design-system'
import { useThemeStore } from '@/design-system/stores/themeStore'
import { registerAllModules } from './modules'

const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024

function readStoredTheme(): string | null {
  try {
    return localStorage.getItem('theme')
  } catch {
    return null
  }
}

export async function bootstrap(): Promise<void> {
  registerAllModules()

  configureUpload({
    getHeaders: () => {
      const token = useAuthStore.getState().access
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      return headers
    },
  })
  setMaxFileSize(DEFAULT_MAX_FILE_SIZE)

  if (!readStoredTheme()) useThemeStore.getState().setTheme('light')

  if (useAuthStore.getState().access) {
    try {
      await useBootStore.getState().load()
    } catch (error) {
      console.error('Boot failed', error)
    }
  }
}
