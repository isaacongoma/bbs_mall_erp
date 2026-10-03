import { create } from 'zustand'
import { call } from '@/core/api/rpc'

export type UserSettings = Record<string, unknown>

interface UserSettingsState {
  cache: Record<string, UserSettings>
  loading: boolean
  error: Error | null
}

export const useUserSettingsStore = create<UserSettingsState>(() => ({ cache: {}, loading: false, error: null }))

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function setCache(doctype: string, settings: UserSettings) {
  useUserSettingsStore.setState((state) => ({ cache: { ...state.cache, [doctype]: settings } }))
}

async function track<T>(label: string, run: () => Promise<T>): Promise<T> {
  try {
    useUserSettingsStore.setState({ loading: true, error: null })
    return await run()
  } catch (error) {
    const failure = toError(error)
    useUserSettingsStore.setState({ error: failure })
    console.error(label, error)
    throw failure
  } finally {
    useUserSettingsStore.setState({ loading: false })
  }
}

export function getUserSettingsFromServer(doctype: string): Promise<UserSettings> {
  if (!doctype) throw new Error('Doctype is required')
  return track('Error getting user settings:', async () => {
    const response = await call<string>('frappe.model.utils.user_settings.get', { doctype })
    const settings: UserSettings = JSON.parse(response || '{}')
    setCache(doctype, settings)
    return settings
  })
}

export function updateUserSettings(doctype: string, userSettings: UserSettings): Promise<UserSettings> {
  if (!doctype) throw new Error('Doctype is required')
  return track('Error updating user settings:', async () => {
    const response = await call<UserSettings>('frappe.model.utils.user_settings.save', {
      doctype,
      user_settings: JSON.stringify(userSettings),
    })
    setCache(doctype, response)
    return response
  })
}

export async function saveUserSetting(doctype: string, key: string, value: unknown): Promise<UserSettings> {
  if (!doctype || !key) throw new Error('Doctype and key are required')

  return track('Error saving user settings:', async () => {
    const oldSettings: UserSettings = useUserSettingsStore.getState().cache[doctype] || {}
    const newSettings: UserSettings = JSON.parse(JSON.stringify(oldSettings))

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      newSettings[key] = newSettings[key] || {}
      Object.assign(newSettings[key] as object, value)
    } else {
      newSettings[key] = value
    }

    if (JSON.stringify(oldSettings) !== JSON.stringify(newSettings)) {
      return updateUserSettings(doctype, newSettings)
    }
    return newSettings
  })
}

export function removeUserSetting(doctype: string, key: string): Promise<UserSettings> {
  if (!doctype || !key) throw new Error('Doctype and key are required')
  return track('Error removing user setting:', async () => {
    const updated: UserSettings = { ...(useUserSettingsStore.getState().cache[doctype] || {}) }
    delete updated[key]
    return updateUserSettings(doctype, updated)
  })
}

export function getCachedUserSettings(doctype: string, key: string | null = null): unknown {
  const settings: UserSettings = useUserSettingsStore.getState().cache[doctype] || {}
  return key ? settings[key] || {} : settings
}

export function clearUserSettingsCache(doctype: string | null = null): void {
  useUserSettingsStore.setState((state) => {
    if (!doctype) return { cache: {} }
    const next = { ...state.cache }
    delete next[doctype]
    return { cache: next }
  })
}

export async function getUserSettings(doctype: string, key: string | null = null): Promise<unknown> {
  let settings: UserSettings | undefined = useUserSettingsStore.getState().cache[doctype]
  if (!settings) settings = await getUserSettingsFromServer(doctype)
  return key ? settings[key] || {} : settings
}
