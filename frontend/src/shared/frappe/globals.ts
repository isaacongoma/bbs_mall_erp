import Awesomplete from 'awesomplete'
import { getBoot } from '@/core/boot'
import onScan from 'onscan.js'
import { cint, flt, formatNumber, getNumberFormatInfo } from '../utils/numberFormat'
import { getDeskBoot } from './boot'
import { locals } from './locals'
import { getCurrentForm } from './events'

type AnyRecord = Record<string, any>

type WindowSlot = 'cur_tree' | 'cur_pos' | 'cur_page' | 'cur_dialog' | 'cur_list'

const slots = window as unknown as AnyRecord

export function setCurrentTree(tree: unknown): void {
  slots.cur_tree = tree
}

export function setCurrentPos(pos: unknown): void {
  slots.cur_pos = pos
}

export function setCurrentPage(page: unknown): void {
  slots.cur_page = page
}

export function setCurrentDialog(dialog: unknown): void {
  slots.cur_dialog = dialog
}

export function setCurrentList(list: unknown): void {
  slots.cur_list = list
}

function registryProxy(key: WindowSlot): any {
  return new Proxy(
    {},
    {
      get: (_target, property: string | symbol) => (slots[key] as AnyRecord | undefined)?.[property as string],
      set: (_target, property: string | symbol, value: unknown) => {
        const holder = slots[key] as AnyRecord | undefined
        if (holder) holder[property as string] = value
        return true
      },
      has: (_target, property: string | symbol) => Boolean(slots[key]) && property in (slots[key] as AnyRecord),
    },
  )
}

export const cur_tree: any = registryProxy('cur_tree')
export const cur_pos: any = registryProxy('cur_pos')
export const cur_page: any = registryProxy('cur_page')
export const cur_dialog: any = registryProxy('cur_dialog')
export const cur_list: any = registryProxy('cur_list')
export { onScan }

export const Plaid: any = new Proxy(
  {},
  {
    get: (_target, property: string | symbol) => (window as unknown as AnyRecord).Plaid?.[property as string],
  },
)

export { Awesomplete }

export const format_number = (value: unknown, format?: string | null, decimals?: number | null) =>
  formatNumber(value, format, decimals)

export const repl = (text: string | null | undefined, dict: AnyRecord): string => {
  if (text == null) return ''
  let result = text
  for (const key of Object.keys(dict)) {
    result = result.split(`%(${key})s`).join(String(dict[key]))
  }
  return result
}

export const set_field_options = (fieldname: string, options: unknown): void => {
  const form = getCurrentForm() as AnyRecord | null
  form?.set_df_property(fieldname, 'options', options)
}

export const toggle_field = (fieldname: string, hidden: number | boolean): void => {
  const form = getCurrentForm() as AnyRecord | null
  if (!form) return
  const field = form.fields_dict[fieldname]
  if (field?.df) {
    field.df.hidden = hidden ? 1 : 0
    form.refresh_field(fieldname)
  } else {
    console.warn(`${hidden ? 'hide_field' : 'unhide_field'} cannot find field ${fieldname}`)
  }
}

export const hide_field = (fieldname: string | string[]): void => {
  if (!getCurrentForm()) return
  for (const name of typeof fieldname === 'string' ? [fieldname] : fieldname) toggle_field(name, 1)
}

export const unhide_field = (fieldname: string | string[]): void => {
  if (!getCurrentForm()) return
  for (const name of typeof fieldname === 'string' ? [fieldname] : fieldname) toggle_field(name, 0)
}

export const open_url_post = (url: string, params: AnyRecord, newWindow?: boolean): HTMLFormElement => {
  const form = document.createElement('form')
  form.action = url
  form.method = 'POST'
  form.style.display = 'none'
  if (newWindow) form.target = '_blank'
  const payload: AnyRecord = { ...params, csrf_token: (getBoot() as AnyRecord).csrf_token }
  for (const key of Object.keys(payload)) {
    const input = document.createElement('textarea')
    input.name = key
    const value = payload[key]
    input.value = typeof value === 'string' ? value : JSON.stringify(value)
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
  return form
}

export const refresh_many = (fields: string[], docname?: string, tableField?: string): void => {
  for (const fieldname of fields) {
    if (tableField) refresh_field(fieldname, docname, tableField)
    else refresh_field(fieldname)
  }
}

export const refresh_field = (fieldname: string | string[], docname?: string, tableField?: string): void => {
  if (Array.isArray(fieldname)) {
    refresh_many(fieldname, docname, tableField)
    return
  }
  const form = getCurrentForm() as AnyRecord | null
  if (!form) return
  form.refresh_field(fieldname && tableField ? tableField : fieldname)
}

export const get_number_format_info = getNumberFormatInfo

export const get_currency_symbol = (currency?: string | null): string | null => {
  const defaults = getDeskBoot().sysdefaults as AnyRecord | undefined
  if (['1', 'Yes'].includes(String(defaults?.hide_currency_symbol))) return null
  const code = currency || (defaults?.currency as string | undefined)
  if (!code) return null
  const symbol = (locals[':Currency']?.[code] as AnyRecord | undefined)?.symbol
  return (symbol as string | undefined) || code
}

export const remainder = (numerator: number, denominator: number, precision?: number): number => {
  const digits = cint(precision)
  const multiplier = Math.pow(10, digits)
  const value = digits ? ((numerator * multiplier) % (denominator * multiplier)) / multiplier : numerator % denominator
  return flt(value, digits)
}

export const round_based_on_smallest_currency_fraction = (
  value: number,
  currency: string,
  precision?: number,
): number => {
  const fraction = flt((locals[':Currency']?.[currency] as AnyRecord | undefined)?.smallest_currency_fraction_value)
  if (!fraction) return flt(value, 0)
  const rest = remainder(value, fraction, precision)
  return rest > fraction / 2 ? value + (fraction - rest) : value - rest
}

export function installWindowGlobals(extra: AnyRecord): void {
  Object.assign(slots, {
    refresh_field,
    refresh_many,
    set_field_options,
    hide_field,
    unhide_field,
    toggle_field,
    open_url_post,
    repl,
    format_number,
    get_number_format_info,
    get_currency_symbol,
    remainder,
    round_based_on_smallest_currency_fraction,
    onScan,
    ...extra,
  })
}

export const toTitle = (text: string): string =>
  String(text).replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
