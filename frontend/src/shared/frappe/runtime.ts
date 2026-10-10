import moment from 'moment-timezone'
import jquery from 'jquery'
import { getBoot } from '@/core/boot'
import { __ } from '@/core/i18n'
import { cint, cstr, flt, formatNumber } from '../utils/numberFormat'
import { installAjaxBridge } from './ajax'
import { installBase } from './base'
import { getDeskBoot } from './boot'
import { getCurrentForm } from './events'
import { installWindowGlobals } from './globals'
import { locals as sharedLocals } from './locals'
import { getRoute, navigateTo, router } from './router'

export * from './globals'

type AnyRecord = Record<string, any>

export const locals: any = sharedLocals

export const $: any = jquery

export const jQuery: any = jquery

export { moment }

export const cur_frm: any = new Proxy(
  {},
  {
    get: (_target, key: string | symbol) => (getCurrentForm() as AnyRecord | null)?.[key as string],
    set: (_target, key: string | symbol, value: unknown) => {
      const form = getCurrentForm() as AnyRecord | null
      if (form) form[key as string] = value
      return true
    },
    has: (_target, key: string | symbol) => Boolean(getCurrentForm()) && key in (getCurrentForm() as AnyRecord),
  },
)

function provide(root: AnyRecord, path: string): AnyRecord {
  let target = root
  for (const part of path.split('.')) {
    target[part] ??= {}
    target = target[part]
  }
  return target
}

function userRoles(): string[] {
  return (getDeskBoot().user?.roles as string[] | undefined) ?? []
}

const frappeApi: AnyRecord = {
  ui: { form: {} },
  model: { locals: sharedLocals },
  meta: {},
  router,
  route_options: null,
  route_flags: {},
  route_history: [],
  route_hooks: {},
  route_titles: {},
  re_route: {},
  set_route: (...route: unknown[]) => {
    const flat = route.length === 1 && Array.isArray(route[0]) ? (route[0] as unknown[]) : route
    return navigateTo(flat)
  },
  get_route: () => getRoute(),
  get_route_str: () => getRoute().join('/'),
  provide: (path: string) => provide(globalScope, path),
  get boot() {
    return { json_request_apps: ['frappe', 'erpnext', 'hrms'], ...getBoot(), ...getDeskBoot() }
  },
  get user() {
    const boot = frappeApi.boot as AnyRecord
    return {
      name: boot.user?.name ?? boot.user?.email,
      has_role: (role: string | string[]) =>
        (Array.isArray(role) ? role : [role]).some((entry) => userRoles().includes(entry)),
      full_name: (user?: string) =>
        user && user !== boot.user?.name
          ? ((boot.user_info?.[user]?.fullname as string | undefined) ?? user)
          : (boot.user?.full_name ?? ''),
    }
  },
  get user_roles() {
    return userRoles()
  },
  user_defaults: {},
  form_dialog: undefined,
  _: __,
}

installBase(frappeApi)
installAjaxBridge()

const globalScope: AnyRecord = { frappe: frappeApi, erpnext: {}, hrms: {} }

const unsupported = new Set<string | symbol>(['then', 'toJSON', Symbol.toPrimitive, Symbol.toStringTag])

export const missingApi = new Set<string>()

function strict(name: string, target: AnyRecord): AnyRecord {
  return new Proxy(target, {
    get: (object, key: string | symbol, receiver) => {
      if (key in object || unsupported.has(key) || typeof key === 'symbol') return Reflect.get(object, key, receiver)
      missingApi.add(`${name}.${String(key)}`)
      return undefined
    },
  })
}

export const frappe = strict('frappe', frappeApi)
export const erpnext = globalScope.erpnext
export const hrms = globalScope.hrms
export { __ }
export { cint, cstr, flt, formatNumber }

function windowFunction(name: string): (...args: any[]) => any {
  return (...args: any[]) => (window as unknown as AnyRecord)[name](...args)
}

export const in_list = windowFunction('in_list')
export const has_common = windowFunction('has_common')
export const is_null = windowFunction('is_null')
export const copy_dict = windowFunction('copy_dict')
export const strip = windowFunction('strip')
export const comment_when = windowFunction('comment_when')
export const extend_cscript = windowFunction('extend_cscript')
export const filter_dict = (...args: any[]) => frappe.utils.filter_dict(...args)
export const format_currency = windowFunction('format_currency')
export const fmt_money = windowFunction('fmt_money')
export const get_number_format = (currency?: string) =>
  String(
    (currency ? (locals[':Currency']?.[currency] as AnyRecord | undefined)?.number_format : undefined) ??
      getDeskBoot().sysdefaults?.number_format ??
      getBoot().sysdefaults?.number_format ??
      '#,###.##',
  )
export const precision = (fieldname: string, doc?: AnyRecord) =>
  (window as unknown as AnyRecord).precision(fieldname, doc)

installWindowGlobals({
  get_number_format,
  frappe,
  erpnext,
  hrms,
  __,
  flt,
  cint,
  cstr,
  locals,
  moment,
  $,
  jQuery,
})
