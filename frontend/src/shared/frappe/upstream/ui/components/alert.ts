import { $, __, frappe } from '@/shared/frappe/runtime'
import { validated, safe_attrs } from './utils.js'
frappe.provide('frappe.ui')
const THEMES: any = ['yellow', 'blue', 'red', 'green']
const VARIANTS: any = ['subtle', 'outline']
const THEME_ICONS: any = {
  yellow: 'triangle-alert',
  blue: 'info',
  red: 'circle-x',
  green: 'circle-check',
}
function alert_html(opts: any = {}) {
  const escape = frappe.utils.escape_html
  const theme_name = opts.theme === 'amber' ? 'yellow' : opts.theme
  const theme = validated(theme_name, THEMES, 'theme', 'alert')
  const variant = validated(opts.variant, VARIANTS, 'variant', 'alert')
  const attrs: any = ['role="alert"']
  if (theme) attrs.push(`data-theme="${theme}"`)
  if (variant && variant !== 'subtle') attrs.push(`data-variant="${variant}"`)
  attrs.push(...safe_attrs(opts.attrs, 'alert'))
  const icon_name = opts.icon || (theme && THEME_ICONS[theme])
  const icon = icon_name ? frappe.utils.icon(icon_name, 'sm', '', '', '', true) : ''
  if (opts.footer && !opts._element_form) {
    console.warn('frappe.ui.alert: footer needs the element form — frappe.ui.alert(opts)')
  }
  const description = opts.description ? `<p class="es-alert__description">${escape(opts.description)}</p>` : ''
  const dismiss = opts.dismissible
    ? `<button class="es-alert__dismiss" type="button" aria-label="${escape(__('Dismiss'))}">${frappe.utils.icon('x', 'sm', '', '', '', true)}</button>`
    : ''
  const classes = escape(['es-alert', opts.css_class].filter(Boolean).join(' '))
  return `<div class="${classes}" ${attrs.join(' ')}>${icon}<div class="es-alert__content"><span class="es-alert__title">${escape(opts.title || '')}</span>${description}</div>${dismiss}</div>`
}
frappe.ui.alert = function (opts: any = {}) {
  const $el = $(alert_html({ ...opts, _element_form: true }))
  if (opts.dismissible) {
    $el.find('.es-alert__dismiss').on('click', () => {
      $el.remove()
      opts.on_dismiss && opts.on_dismiss()
    })
  }
  if (opts.footer) {
    const footer = typeof opts.footer === 'function' ? opts.footer() : opts.footer
    $('<div class="es-alert__footer"></div>').append(footer).appendTo($el)
  }
  return $el
}
frappe.ui.alert.html = alert_html
export default frappe.ui.alert
