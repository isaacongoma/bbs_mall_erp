import { frappe } from '@/shared/frappe/runtime'
export function validated(value?: any, allowed?: any, option?: any, component?: any) {
  if (value == null) return null
  if (!allowed.includes(value)) {
    console.warn(`frappe.ui.${component}: unknown ${option} "${value}" — expected ${allowed.join(' | ')}`)
    return null
  }
  return value
}
export function has_unsafe_scheme(value?: any) {
  const bare = String(value)
    .replace(/[\t\n\r]/g, '')
    .replace(/^[\u0000-\u0020]+/, '')
  return /^(javascript|vbscript|data):/i.test(bare)
}
export function safe_href(href?: any, component?: any) {
  if (!href) return null
  if (has_unsafe_scheme(href)) {
    console.warn(`frappe.ui.${component}: refusing unsafe href "${href}"`)
    return null
  }
  return href
}
const MAC_KEY_SYMBOLS: any = { ctrl: '⌘', meta: '⌘', cmd: '⌘', alt: '⌥', shift: '⇧' }
export function shortcut_keys(shortcut?: any) {
  if (Array.isArray(shortcut)) return shortcut.map(String)
  const mac = frappe.utils.is_mac && frappe.utils.is_mac()
  return String(shortcut)
    .split('+')
    .map((key?: any) => key.trim())
    .filter(Boolean)
    .map((key?: any) => {
      if (mac && MAC_KEY_SYMBOLS[key.toLowerCase()]) {
        return MAC_KEY_SYMBOLS[key.toLowerCase()]
      }
      return frappe.utils.to_title_case(key)
    })
}
export function safe_attrs(attrs?: any, component?: any) {
  const escape = frappe.utils.escape_html
  const out: any = []
  for (const [key, value] of Object.entries(attrs || {})) {
    if (!/^[a-zA-Z][\w.:-]*$/.test(key) || /^on/i.test(key)) {
      console.warn(`frappe.ui.${component}: refusing unsafe attribute "${key}"`)
      continue
    }
    out.push(value === true ? key : `${key}="${escape(value)}"`)
  }
  return out
}
export function make_activatable($el?: any, handler?: any) {
  return $el
    .attr({ role: 'button', tabindex: 0 })
    .on('click', handler)
    .on('keydown', (e?: any) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handler(e)
      }
    })
}
export const CHART_PALETTE = [
  'blue-600',
  'blue-400',
  'green-600',
  'green-400',
  'violet-600',
  'violet-400',
  'amber-600',
  'amber-400',
  'red-500',
  'red-400',
].map((token?: any) => `var(--${token})`)
