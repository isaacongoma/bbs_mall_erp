import { $, frappe } from '@/shared/frappe/runtime'
import { validated, safe_attrs } from './utils.js'
frappe.provide('frappe.ui')
const THEMES: any = ['gray', 'blue', 'green', 'amber', 'red', 'violet']
const LEGACY_THEMES: any = ['grey', 'darkgrey', 'yellow', 'cyan', 'purple', 'pink', 'light-blue']
const SIZES: any = ['sm', 'md', 'lg']
const VARIANTS: any = ['solid', 'subtle', 'outline', 'ghost']
function badge_html(opts: any = {}) {
  const escape = frappe.utils.escape_html
  const theme_name = opts.theme === 'orange' ? 'amber' : opts.theme
  const theme = LEGACY_THEMES.includes(theme_name) ? theme_name : validated(theme_name, THEMES, 'theme', 'badge')
  const size = validated(opts.size, SIZES, 'size', 'badge')
  const variant = validated(opts.variant, VARIANTS, 'variant', 'badge')
  const icon_name = opts.icon_left || opts.icon
  const icon_right_name = opts.icon_right
  const attrs: any = []
  if (theme && theme !== 'gray') attrs.push(`data-theme="${theme}"`)
  if (size && size !== 'md') attrs.push(`data-size="${size}"`)
  if (variant && variant !== 'subtle') attrs.push(`data-variant="${variant}"`)
  if (opts.title) {
    attrs.push(`title="${escape(opts.title)}"`)
    if ((icon_name || icon_right_name) && !opts.label) {
      attrs.push(`aria-label="${escape(opts.title)}"`)
    }
  }
  attrs.push(...safe_attrs(opts.attrs, 'badge'))
  const classes = escape(['es-badge', opts.css_class].filter(Boolean).join(' '))
  const attr_str = attrs.length ? ' ' + attrs.join(' ') : ''
  const icon = icon_name ? frappe.utils.icon(icon_name, 'sm', '', '', '', true) : ''
  const icon_right = icon_right_name
    ? `<span class="es-badge__affix">${frappe.utils.icon(icon_right_name, 'sm', '', '', '', true)}</span>`
    : ''
  const label = opts.label ? `<span class="es-badge__label">${escape(opts.label)}</span>` : ''
  return `<span class="${classes}"${attr_str}>${icon}${label}${icon_right}</span>`
}
frappe.ui.badge = function (opts: any = {}) {
  return $(badge_html(opts))
}
frappe.ui.badge.html = badge_html
export default frappe.ui.badge
