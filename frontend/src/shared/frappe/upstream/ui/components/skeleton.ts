import { $, frappe } from '@/shared/frappe/runtime'
import { safe_attrs } from './utils.js'
frappe.provide('frappe.ui')
function skeleton_html(opts: any = {}) {
  const escape = frappe.utils.escape_html
  const attrs: any = ['aria-hidden="true"']
  const length = (value?: any, option?: any) => {
    if (value == null) return ''
    if (!/^[\d.]+(px|rem|em|%|vh|vw|ch)?$/.test(value)) {
      console.warn(`frappe.ui.skeleton: ${option} must be a CSS length, got "${value}"`)
      return ''
    }
    return value
  }
  const width = length(opts.width, 'width')
  const height = length(opts.height, 'height')
  const style = [width ? `width: ${width}` : '', height ? `height: ${height}` : ''].filter(Boolean).join('; ')
  if (style) attrs.push(`style="${style}"`)
  attrs.push(...safe_attrs(opts.attrs, 'skeleton'))
  const classes = escape(['es-skeleton', opts.css_class].filter(Boolean).join(' '))
  return `<div class="${classes}" ${attrs.join(' ')}></div>`
}
frappe.ui.skeleton = function (opts: any = {}) {
  return $(skeleton_html(opts))
}
frappe.ui.skeleton.html = skeleton_html
export default frappe.ui.skeleton
