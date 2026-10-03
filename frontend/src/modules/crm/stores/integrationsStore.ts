import { create } from 'zustand'
import { createResource } from '@/core/resources'

interface IntegrationsState {
  integrations: Record<string, boolean>
  defaultCallingMedium: string
  callEnabled: boolean
  whatsappEnabled: boolean
  isWhatsappInstalled: boolean
  setEnabled: (name: string, value: boolean) => void
}

export const useIntegrationsStore = create<IntegrationsState>((set) => ({
  integrations: {},
  defaultCallingMedium: '',
  callEnabled: false,
  whatsappEnabled: false,
  isWhatsappInstalled: false,
  setEnabled(name, value) {
    set((state) => {
      const integrations = { ...state.integrations, [name]: value }
      return { integrations, callEnabled: Object.values(integrations).some(Boolean) }
    })
  },
}))

let loaded = false

export function ensureIntegrationsLoaded(): void {
  if (loaded) return
  loaded = true

  createResource({
    url: 'crm.integrations.api.is_call_integration_enabled',
    cache: 'Is Call Integration Enabled',
    auto: true,
    onSuccess: (data: { integrations?: Record<string, boolean>; default_calling_medium?: string }) => {
      const integrations = data.integrations || {}
      useIntegrationsStore.setState({
        integrations,
        defaultCallingMedium: data.default_calling_medium ?? '',
        callEnabled: Object.values(integrations).some(Boolean),
      })
    },
  })

  createResource({
    url: 'crm.api.whatsapp.is_whatsapp_enabled',
    cache: 'Is Whatsapp Enabled',
    auto: true,
    onSuccess: (data: unknown) => useIntegrationsStore.setState({ whatsappEnabled: Boolean(data) }),
  })

  createResource({
    url: 'crm.api.whatsapp.is_whatsapp_installed',
    cache: 'Is Whatsapp Installed',
    auto: true,
    onSuccess: (data: unknown) => useIntegrationsStore.setState({ isWhatsappInstalled: Boolean(data) }),
  })
}
