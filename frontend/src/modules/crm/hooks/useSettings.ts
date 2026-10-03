import { useObservable } from '@/core/resources'
import { ensureSettingsLoaded, useSettingsStore } from '../stores/settingsStore'

export function useSettings() {
  const resource = ensureSettingsLoaded()
  useObservable(resource)
  const settings = useSettingsStore((state) => state.settings)
  const brand = useSettingsStore((state) => state.brand)
  return { _settings: resource, settings, brand }
}
