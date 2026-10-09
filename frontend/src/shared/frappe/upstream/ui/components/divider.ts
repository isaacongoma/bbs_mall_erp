import { $, frappe } from '@/shared/frappe/runtime'
import { validated, safe_attrs } from './utils.js'
frappe.provide('frappe.ui')
const ORIENTATIONS: any = ['horizontal', 'vertical']
const POSITIONS: any = ['start', 'center', 'end']
function divider_html(opts: any = {}) {
  const escape = frappe.utils.escape_html
  const orientation = validated(opts.orientation, ORIENTATIONS, 'orientation', 'divider')
  const position = validated(opts.position, POSITIONS, 'position', 'divider')
  if (opts.action) {
    if (orientation === 'vertical') {
      console.warn("frappe.ui.divider: the vertical action form isn't supported yet")
    }
    const attrs: any = []
    if (position && position !== 'center') attrs.push(`data-position="${position}"`)
    attrs.push(...safe_attrs(opts.attrs, 'divider'))
    const classes = escape(['es-divider-action', opts.css_class].filter(Boolean).join(' '))
    const button = frappe.ui.button.html({
      label: opts.action.label,
      size: 'sm',
      variant: 'outline',
      loading: opts.action.loading,
    })
    const attr_str = attrs.length ? ' ' + attrs.join(' ') : ''
    return `<div class="${classes}"${attr_str}>
			<div class="es-divider-line" role="separator" aria-orientation="horizontal"></div>${button}
		</div>`
  }
  const attrs: any = []
  if (orientation && orientation !== 'horizontal') {
    attrs.push(`data-orientation="${orientation}"`)
    attrs.push('aria-orientation="vertical"')
  }
  if (opts.flex_item) attrs.push('data-flex-item')
  attrs.push(...safe_attrs(opts.attrs, 'divider'))
  const classes = escape(['es-divider', opts.css_class].filter(Boolean).join(' '))
  const attr_str = attrs.length ? ' ' + attrs.join(' ') : ''
  return `<hr class="${classes}"${attr_str}>`
}
frappe.ui.divider = function (opts: any = {}) {
  if (opts.action && opts.action.onclick) {
    const $el = $(divider_html({ ...opts, action: { ...opts.action } }))
    $el.find('.es-button').replaceWith(
      frappe.ui.button({
        label: opts.action.label,
        size: 'sm',
        variant: 'outline',
        loading: opts.action.loading,
        onclick: opts.action.onclick,
      }),
    )
    return $el
  }
  return $(divider_html(opts))
}
frappe.ui.divider.html = divider_html
export default frappe.ui.divider
