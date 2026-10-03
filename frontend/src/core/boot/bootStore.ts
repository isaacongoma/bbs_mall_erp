import { create } from 'zustand'
import { rpc } from '@/core/api/rpc'
import { setConfig } from '@/core/resources/config'
import type { BootData } from './types'

export const DEFAULT_BOOT: BootData = {
  bbs_erp_version: null,
  default_route: '/crm',
  site_name: 'bbs-erp',
  socketio_port: null,
  read_only_mode: false,
  csrf_token: '',
  setup_complete: 1,
  sysdefaults: {
    date_format: 'yyyy-mm-dd',
    time_format: 'HH:mm:ss',
    currency: 'USD',
    number_format: '#,###.##',
    float_precision: 3,
    currency_precision: 2,
    rounding_method: "Banker's Rounding (legacy)",
  },
  is_demo_site: false,
  demo_data_created: false,
  is_fc_site: false,
  translated_doctypes: [],
  translated_messages: {},
  timezone: { system: 'UTC', user: 'UTC' },
  state_options: {},
}

interface BootState {
  boot: BootData
  loaded: boolean
  load: () => Promise<BootData>
}

function applyBoot(boot: BootData) {
  setConfig('systemTimezone', boot.timezone?.system || null)
  setConfig('localTimezone', boot.timezone?.user || null)
  setConfig('translatedMessages', boot.translated_messages || {})
}

export const useBootStore = create<BootState>((set) => ({
  boot: DEFAULT_BOOT,
  loaded: false,
  async load() {
    const values = await rpc<Partial<BootData>>({ url: 'crm.www.crm.get_context_for_dev' })
    const merged: BootData = {
      ...DEFAULT_BOOT,
      ...values,
      sysdefaults: { ...DEFAULT_BOOT.sysdefaults, ...(values.sysdefaults ?? {}) },
    }
    applyBoot(merged)
    set({ boot: merged, loaded: true })
    return merged
  },
}))

export function getBoot(): BootData {
  return useBootStore.getState().boot
}

export function getSysDefaults() {
  return useBootStore.getState().boot.sysdefaults
}

export function isTranslatableDoctype(doctype: string): boolean {
  return getBoot().translated_doctypes.includes(doctype)
}
