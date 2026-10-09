import { setRouteKnowledge } from '@/core/navigation/canonicalPath'
import { useBootStore } from '@/core/boot'
import { setConfig } from '@/core/resources/config'
import { callMethod } from './api'
import { ensureIconSprite } from './iconSprite'
import { ensureSharedScripts } from './scriptLoader'

type AnyRecord = Record<string, any>

let deskBoot: AnyRecord = {
  user: {
    name: '',
    roles: [],
    defaults: {},
    can_read: [],
    can_write: [],
    can_create: [],
    can_submit: [],
    can_cancel: [],
    can_delete: [],
    can_search: [],
    can_get_report: [],
    can_import: [],
    can_export: [],
    can_print: [],
    can_email: [],
    can_set_user_permissions: [],
    can_select: [],
  },
  sysdefaults: {},
  user_defaults: {},
  desk_settings: {},
  docs: [],
  module_app: {},
  single_types: [],
  user_info: {},
  email_accounts: [],
}

const BOOT_DEFAULTS: AnyRecord = {
  sysdefaults: {},
  user_defaults: {},
  desk_settings: {},
  docs: [],
  module_app: {},
  single_types: [],
  user_info: {},
  email_accounts: [],
}

export function setDeskBoot(value: AnyRecord): void {
  if (Array.isArray(value.docs)) (window as unknown as AnyRecord).frappe?.model?.sync?.(value.docs)
  deskBoot = {
    ...BOOT_DEFAULTS,
    ...value,
    user: {
      can_read: [],
      can_write: [],
      can_create: [],
      can_submit: [],
      can_cancel: [],
      can_delete: [],
      can_search: [],
      can_get_report: [],
      can_import: [],
      can_export: [],
      can_print: [],
      can_email: [],
      can_set_user_permissions: [],
      can_select: [],
      roles: [],
      defaults: {},
      ...(value.user ?? {}),
    },
  }
}

export function getDeskBoot(): AnyRecord {
  return deskBoot
}

let bootPromise: Promise<AnyRecord> | null = null

export function loadDeskBoot(): Promise<AnyRecord> {
  bootPromise ??= callMethod('frappe.sessions.get', {}, 'GET').then(
    async (response) => {
      setDeskBoot((response.message ?? response) as AnyRecord)
      setRouteKnowledge({
        doctypes: [
          ...new Set([
            ...((deskBoot.doctype_names as string[] | undefined) ?? []),
            ...Object.keys((deskBoot.canonical_shell?.DocType as Record<string, string> | undefined) ?? {}),
          ]),
        ],
        shellOfDoctype: (deskBoot.canonical_shell?.DocType as Record<string, string> | undefined) ?? {},
        shells: Object.keys((deskBoot.module_sidebars as AnyRecord | undefined) ?? {}),
      })
      const zone = (deskBoot.time_zone ?? {}) as { system?: string; user?: string }
      if (zone.system) setConfig('systemTimezone', zone.system)
      if (zone.user) setConfig('localTimezone', zone.user)
      useBootStore.setState((state) => ({
        boot: {
          ...state.boot,
          sysdefaults: { ...state.boot.sysdefaults, ...((deskBoot.sysdefaults ?? {}) as AnyRecord) },
        },
      }))
      void ensureIconSprite()
      await ensureSharedScripts()
      return deskBoot
    },
    (error: unknown) => {
      bootPromise = null
      throw error
    },
  )
  return bootPromise
}

export function resetDeskBootLoader(): void {
  bootPromise = null
}
