import { $, __, frappe } from '@/shared/frappe/runtime'
import { validated, safe_attrs } from './utils.js'
frappe.provide('frappe.ui')
const VARIANTS: any = ['solid', 'subtle', 'outline', 'ghost']
const SIZES: any = ['xs', 'sm', 'md', 'lg']
const THEMES: any = ['gray', 'red']
function default_loading_label(label?: any) {
  if (!label) return null
  const map: any = {
    [__('Save')]: __('Saving...'),
    [__('Delete')]: __('Deleting...'),
    [__('Submit')]: __('Submitting...'),
  }
  return map[label] || null
}
function button_html(opts: any = {}) {
  const escape = frappe.utils.escape_html
  const variant = validated(opts.variant, VARIANTS, 'variant', 'button')
  const size = validated(opts.size, SIZES, 'size', 'button')
  const theme = validated(opts.theme, THEMES, 'theme', 'button')
  const icon_left_name = opts.icon_left || opts.icon
  const icon_only = Boolean((icon_left_name || opts.icon_right) && !opts.label)
  const attrs: any = [`type="${escape(opts.type || 'button')}"`]
  if (variant && variant !== 'subtle') attrs.push(`data-variant="${variant}"`)
  if (size && size !== 'sm') attrs.push(`data-size="${size}"`)
  if (theme && theme !== 'gray') attrs.push(`data-theme="${theme}"`)
  if (icon_only) attrs.push('data-icon-button="true"')
  if (opts.loading) attrs.push('aria-busy="true"')
  if (opts.disabled) attrs.push('disabled')
  const tooltip_text = typeof opts.tooltip === 'string' ? opts.tooltip : opts.tooltip && opts.tooltip.text
  if (opts.title && !tooltip_text) attrs.push(`title="${escape(opts.title)}"`)
  const accessible_name = tooltip_text || opts.title
  if (icon_only && accessible_name) attrs.push(`aria-label="${escape(accessible_name)}"`)
  attrs.push(...safe_attrs(opts.attrs, 'button'))
  if (icon_only && !accessible_name && !(opts.attrs || {})['aria-label']) {
    console.warn(
      `frappe.ui.button: icon-only button ("${icon_left_name || opts.icon_right}") needs a tooltip or title for accessibility`,
    )
  }
  const classes = escape(['es-button', opts.css_class].filter(Boolean).join(' '))
  return `<button class="${classes}" ${attrs.join(' ')}>${content_html(opts)}</button>`
}
function content_html(opts?: any) {
  const escape = frappe.utils.escape_html
  const render_icon = (name?: any) => (name ? frappe.utils.icon(name, 'sm', '', '', '', true) : '')
  const icon_left = render_icon(opts.icon_left || opts.icon)
  const icon_right = render_icon(opts.icon_right)
  const label = opts.label ? `<span class="es-button__label">${escape(opts.label)}</span>` : ''
  const loading_label_text = 'loading_label' in opts ? opts.loading_label : default_loading_label(opts.label)
  const loading_label = loading_label_text
    ? `<span class="es-button__loading-label" aria-live="polite">${escape(loading_label_text)}</span>`
    : ''
  return `<span class="es-spinner" aria-hidden="true"></span>${loading_label}${icon_left}${label}${icon_right}`
}
frappe.ui.button = function (opts: any = {}) {
  const $btn = $(button_html(opts))
  if (opts.tooltip && frappe.ui.tooltip) {
    frappe.ui.tooltip($btn, typeof opts.tooltip === 'string' ? { text: opts.tooltip } : opts.tooltip)
  }
  if (opts.onclick) {
    $btn.on('click', function (this: any, e?: any) {
      if ($btn.attr('aria-busy') === 'true') return
      const result = opts.onclick.call(this, e)
      if (result && typeof result.then === 'function') {
        $btn.attr('aria-busy', 'true')
        result.then(
          () => $btn.removeAttr('aria-busy'),
          (err?: any) => {
            $btn.removeAttr('aria-busy')
            if (frappe.boot?.developer_mode) {
              console.error('frappe.ui.button: onclick rejected', err)
            }
          },
        )
      }
    })
  }
  return $btn
}
frappe.ui.button.html = button_html
frappe.ui.button.dress = function (el?: any, opts: any = {}) {
  const $el = $(el)
  $el.addClass('es-button')
  if (!$el.attr('type')) $el.attr('type', 'button')
  const set_data = (name?: any, value?: any, default_value?: any) => {
    if (value === undefined) return
    if (value === default_value) {
      $el.removeAttr(`data-${name}`)
    } else {
      $el.attr(`data-${name}`, value)
    }
  }
  set_data('variant', validated(opts.variant, VARIANTS, 'variant', 'button'), 'subtle')
  set_data('size', validated(opts.size, SIZES, 'size', 'button'), 'sm')
  set_data('theme', validated(opts.theme, THEMES, 'theme', 'button'), 'gray')
  const has_icon = Boolean(opts.icon || opts.icon_left || opts.icon_right)
  if ('label' in opts || has_icon) {
    $el.html(content_html(opts))
    if (has_icon && !opts.label) {
      $el.attr('data-icon-button', 'true')
    } else {
      $el.removeAttr('data-icon-button')
    }
  }
  return $el
}
export default frappe.ui.button
