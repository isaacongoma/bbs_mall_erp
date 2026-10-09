import { $, frappe } from '@/shared/frappe/runtime'
import { validated, safe_href } from './utils.js'
frappe.provide('frappe.ui')
const VARIANTS: any = ['solid', 'subtle', 'outline', 'ghost']
function build_action(action?: any) {
  if (!action || !action.label) return null
  if (action.href) {
    const href = safe_href(action.href, 'empty_state')
    const variant = validated(action.variant, VARIANTS, 'action variant', 'empty_state') || 'ghost'
    const a = document.createElement('a')
    a.className = ['es-button', action.css_class].filter(Boolean).join(' ')
    if (variant !== 'subtle') a.setAttribute('data-variant', variant)
    if (action.theme === 'red') a.setAttribute('data-theme', 'red')
    if (href) {
      a.href = href
      a.target = '_blank'
      a.rel = 'noreferrer noopener'
    }
    if (action.icon) {
      a.insertAdjacentHTML('beforeend', frappe.utils.icon(action.icon, 'sm', '', '', '', true))
    }
    const label = document.createElement('span')
    label.className = 'es-button__label'
    label.textContent = action.label
    a.appendChild(label)
    return a
  }
  return frappe.ui.button({
    label: action.label,
    variant: action.variant,
    theme: action.theme,
    icon: action.icon,
    size: action.size,
    css_class: action.css_class,
    onclick: action.onclick,
  })[0]
}
frappe.ui.empty_state = function (opts: any = {}) {
  const wrap = document.createElement('div')
  wrap.className = ['flex flex-col items-center justify-center text-center gap-3 min-h-48', opts.css_class]
    .filter(Boolean)
    .join(' ')
  if (opts.icon) {
    const well = document.createElement('div')
    well.className = 'flex size-11 items-center justify-center rounded-full bg-surface-gray-2 text-ink-gray-5'
    well.insertAdjacentHTML('beforeend', frappe.utils.icon(opts.icon, 'md', '', '', '', true))
    wrap.appendChild(well)
  }
  const text = document.createElement('div')
  text.className = 'flex flex-col items-center gap-1'
  const title = document.createElement('div')
  title.className = 'text-base-medium text-ink-gray-8'
  title.textContent = opts.title || ''
  text.appendChild(title)
  if (opts.description) {
    const desc = document.createElement('div')
    desc.className = 'text-p-sm text-ink-gray-5 max-w-xs'
    desc.textContent = opts.description
    text.appendChild(desc)
  }
  wrap.appendChild(text)
  const actions = (opts.actions || []).map(build_action).filter(Boolean)
  if (actions.length) {
    const row = document.createElement('div')
    row.className = 'flex flex-wrap items-center justify-center gap-2'
    actions.forEach((node?: any) => row.appendChild(node))
    wrap.appendChild(row)
  }
  return $(wrap)
}
frappe.ui.empty_state.html = function (opts: any = {}) {
  return frappe.ui.empty_state(opts)[0].outerHTML
}
export default frappe.ui.empty_state
