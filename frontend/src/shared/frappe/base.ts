import { useAuthStore } from '@/core/auth/authStore'
import { getBoot } from '@/core/boot'
import { getDeskBoot } from './boot'
import { callMethod } from './api'

type AnyRecord = Record<string, any>

function boot(): AnyRecord {
  return { ...(getBoot() as AnyRecord), ...getDeskBoot() }
}

function userInfo(): AnyRecord {
  const current = boot().user as AnyRecord | undefined
  return current ?? {}
}

function abbreviation(text: string): string {
  return String(text ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

type Listener = (payload: unknown) => unknown

class RealtimeClient {
  private listeners = new Map<string, Set<Listener>>()

  on(event: string, handler: Listener): void {
    const bucket = this.listeners.get(event) ?? new Set<Listener>()
    bucket.add(handler)
    this.listeners.set(event, bucket)
  }

  off(event: string, handler?: Listener): void {
    if (!handler) {
      this.listeners.delete(event)
      return
    }
    this.listeners.get(event)?.delete(handler)
  }

  emit(event: string, payload?: unknown): void {
    for (const handler of [...(this.listeners.get(event) ?? [])]) handler(payload)
  }

  publish(event: string, payload?: unknown): void {
    this.emit(event, payload)
  }

  doc_subscribe(): void {}

  doc_unsubscribe(): void {}

  doctype_subscribe(): void {}

  doctype_unsubscribe(): void {}

  doc_open(): void {}

  doc_close(): void {}

  has_subscribers(event: string): boolean {
    return (this.listeners.get(event)?.size ?? 0) > 0
  }
}

export const realtime = new RealtimeClient()

async function clientCall(method: string, args: AnyRecord): Promise<any> {
  const response = await callMethod(`frappe.client.${method}`, args)
  return response
}

export function installBase(api: AnyRecord): void {
  Object.defineProperties(api, {
    session: {
      enumerable: true,
      get: () => {
        const info = userInfo()
        const name = (info.name ?? info.email ?? 'Guest') as string
        return {
          user: name,
          user_email: info.email ?? name,
          user_fullname: info.full_name ?? info.fullname ?? name,
          user_abbr: abbreviation(String(info.full_name ?? name)),
          user_image: info.user_image ?? '',
          user_language: info.language ?? 'en',
          logged_in_user: name,
          csrf_token: boot().csrf_token ?? '',
          user_info: boot().user_info ?? {},
        }
      },
    },
    sys_defaults: {
      enumerable: true,
      get: () => boot().sysdefaults ?? {},
    },
  })

  Object.assign(api, {
    query_reports: {},
    listview_settings: {},
    treeview_settings: {},
    pages: {},
    breadcrumbs: {
      current: null as { module?: string; doctype?: string; type?: string } | null,
      add(module?: string, doctype?: string, type?: string) {
        this.current = { module, doctype, type }
      },
      clear() {
        this.current = null
      },
      update() {
        return undefined
      },
    },
    flags: {},
    help: { help_links: {} },
    tour: {},
    templates: {},
    form_dialog: undefined,
    validated: true,
    request: { url: '' },
    realtime,
    socketio: realtime,
    desk: {},
    views: { formview: {}, trees: {}, calendar: {} },
    contacts: {},
    core: {},
    automation: {},
    scripts: {},
    app: {
      awesome_bar: { setup: () => undefined },
      sidebar: { apply_page_visibility: () => undefined },
      handle_session_expired: () => useAuthStore.getState().logout(),
      trigger_primary_action: () => {
        const slot = window as unknown as AnyRecord
        const dialog = slot.cur_dialog as AnyRecord | null | undefined
        if (dialog?.get_primary_btn) dialog.get_primary_btn().trigger('click')
        else slot.cur_frm?.page?.btn_primary?.trigger('click')
      },
    },
    require: () => Promise.resolve(),
    is_online: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
    is_mobile: () => window.matchMedia?.('(max-width: 768px)').matches ?? false,
    get_abbr: abbreviation,
    show_not_permitted: (page: string) => {
      api.msgprint?.({ title: 'Not permitted', message: `You do not have access to ${page}`, indicator: 'red' })
    },
    client: {
      get: (doctype: string, name?: string, filters?: unknown) => clientCall('get', { doctype, name, filters }),
      get_value: (doctype: string, filters: unknown, fieldname: unknown) =>
        clientCall('get_value', { doctype, filters, fieldname }),
      get_list: (doctype: string, args: AnyRecord = {}) => clientCall('get_list', { doctype, ...args }),
      get_single_value: (doctype: string, field: string) => clientCall('get_single_value', { doctype, field }),
      set_value: (doctype: string, name: string, fieldname: unknown, value?: unknown) =>
        clientCall('set_value', { doctype, name, fieldname, value }),
      insert: (doc: AnyRecord) => clientCall('insert', { doc }),
      delete: (doctype: string, name: string) => clientCall('delete', { doctype, name }),
      submit: (doc: AnyRecord) => clientCall('submit', { doc }),
      cancel: (doctype: string, name: string) => clientCall('cancel', { doctype, name }),
      get_count: (doctype: string, filters?: unknown) => clientCall('get_count', { doctype, filters }),
    },
  })
}
