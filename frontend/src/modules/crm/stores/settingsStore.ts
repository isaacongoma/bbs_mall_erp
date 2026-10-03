import { create } from 'zustand'
import { createDocumentResource, type DocumentResource } from '@/core/resources'

export interface Brand {
  name?: string
  logo?: string
  favicon?: string
}

interface SettingsState {
  settings: Record<string, any>
  brand: Brand
}

export const useSettingsStore = create<SettingsState>(() => ({ settings: {}, brand: {} }))

let settingsResource: DocumentResource | null = null

export function ensureSettingsLoaded(): DocumentResource {
  if (settingsResource) return settingsResource

  const created = createDocumentResource({
    doctype: 'FCRM Settings',
    name: 'FCRM Settings',
    onSuccess: (data: Record<string, any>) => {
      useSettingsStore.setState({
        settings: data,
        brand: { name: data?.brand_name, logo: data?.brand_logo, favicon: data?.favicon },
      })
      return data
    },
  })
  settingsResource = created as DocumentResource
  return settingsResource
}

export function setupBrand(): void {
  const doc = ensureSettingsLoaded().doc as Record<string, any> | null
  if (!doc) return
  useSettingsStore.setState({
    settings: doc,
    brand: { name: doc.brand_name, logo: doc.brand_logo, favicon: doc.favicon },
  })
}

export function getSettings() {
  return { _settings: ensureSettingsLoaded(), ...useSettingsStore.getState() }
}
