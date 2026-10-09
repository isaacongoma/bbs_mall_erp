import { useEffect } from 'react'
import { create } from 'zustand'
import type { HrmsSettings } from '../types'
import { makeHrmsResource, messageTransform, useHrmsResource } from './resource'

const settingsResource = makeHrmsResource<unknown>('hrms.api.get_hr_settings', 'hrms:settings')

interface SettingsState {
  settings: HrmsSettings | null
  setSettings: (settings: HrmsSettings | null) => void
}

export const useHrmsSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),
}))

export function useHrmsSettings(enabled = true): HrmsSettings | null {
  const resource = useHrmsResource(settingsResource, enabled)
  const settings = resource.data ? messageTransform<HrmsSettings>(resource.data) : null
  const current = useHrmsSettingsStore((state) => state.settings)

  useEffect(() => {
    if (settings && current !== settings) useHrmsSettingsStore.getState().setSettings(settings)
  }, [current, settings])
  return current ?? settings
}

export function resetHrmsSettings(): void {
  settingsResource.reset()
  useHrmsSettingsStore.getState().setSettings(null)
}

export { settingsResource }
