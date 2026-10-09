import { $, __, frappe } from '@/shared/frappe/runtime'
import { safe_attrs, safe_href } from './utils.js'
frappe.provide('frappe.ui')
function breadcrumbs_html(opts: any = {}) {
  const escape = frappe.utils.escape_html
  const items = opts.items || []
  if (!opts._element_form && items.some((item?: any) => item.onclick)) {
    console.warn('frappe.ui.breadcrumbs: onclick needs the element form — frappe.ui.breadcrumbs(opts)')
  }
  const affix = (value?: any) => {
    if (!value) return ''
    if (typeof value !== 'string') {
      console.warn('frappe.ui.breadcrumbs: prefix/suffix take a lucide icon name')
      return ''
    }
    return frappe.utils.icon(value, 'sm', '', '', '', true)
  }
  const crumbs = items
    .map((item?: any, i?: any) => {
      const last = i === items.length - 1
      const href = safe_href(item.href, 'breadcrumbs')
      const label = item.label ? `<span class="es-breadcrumbs__label">${escape(item.label)}</span>` : ''
      const content = affix(item.prefix) + label + affix(item.suffix)
      let extra = ''
      const title = item.title || (last ? item.label : '')
      if (title) extra += ` title="${escape(title)}"`
      if (last) extra += ' aria-current="page"'
      if (!item.label && (item.prefix || item.suffix)) {
        if (item.title) {
          extra += ` aria-label="${escape(item.title)}"`
        } else {
          console.warn('frappe.ui.breadcrumbs: an icon-only crumb needs a title for accessibility')
        }
      }
      const inner = href
        ? `<a class="es-breadcrumbs__item" href="${escape(href)}"${extra}>${content}</a>`
        : item.onclick
          ? `<button class="es-breadcrumbs__item" type="button"${extra}>${content}</button>`
          : `<span class="es-breadcrumbs__item"${extra}>${content}</span>`
      return `<li>${inner}</li>`
    })
    .join('')
  const attrs: any = [`aria-label="${escape(__('Breadcrumb'))}"`]
  attrs.push(...safe_attrs(opts.attrs, 'breadcrumbs'))
  const classes = escape(['es-breadcrumbs', opts.css_class].filter(Boolean).join(' '))
  return `<nav class="${classes}" ${attrs.join(' ')}><ol>${crumbs}</ol></nav>`
}
frappe.ui.breadcrumbs = function (opts: any = {}) {
  const $el = $(breadcrumbs_html({ ...opts, _element_form: true }))
  ;(opts.items || []).forEach((item?: any, i?: any) => {
    if (item.onclick) {
      $el.find('.es-breadcrumbs__item').eq(i).on('click', item.onclick)
    }
  })
  return $el
}
frappe.ui.breadcrumbs.html = breadcrumbs_html
export default frappe.ui.breadcrumbs
