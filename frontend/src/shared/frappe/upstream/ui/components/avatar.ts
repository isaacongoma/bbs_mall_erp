import { $, frappe } from '@/shared/frappe/runtime'
import { validated, safe_attrs } from './utils.js'
frappe.provide('frappe.ui')
const SIZES: any = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']
const SHAPES: any = ['circle', 'square']
const THEMES: any = ['gray', 'blue', 'green', 'amber', 'red', 'violet']
function fallback_html(label?: any) {
  const escape = frappe.utils.escape_html
  const letter = (label || '').trim().charAt(0)
  return `<span class="es-avatar__fallback">${escape(letter)}</span>`
}
function avatar_html(opts: any = {}) {
  const escape = frappe.utils.escape_html
  const size = validated(opts.size, SIZES, 'size', 'avatar')
  const shape = validated(opts.shape, SHAPES, 'shape', 'avatar')
  const theme = validated(opts.theme, THEMES, 'theme', 'avatar')
  const attrs: any = []
  if (size && size !== 'md') attrs.push(`data-size="${size}"`)
  if (shape && shape !== 'circle') attrs.push(`data-shape="${shape}"`)
  if (theme && theme !== 'gray') attrs.push(`data-theme="${theme}"`)
  const title = opts.title || opts.label
  if (title) attrs.push(`title="${escape(title)}"`)
  attrs.push(...safe_attrs(opts.attrs, 'avatar'))
  const inner = opts.image
    ? `<img src="${escape(opts.image)}" alt="${escape(opts.label || '')}">`
    : fallback_html(opts.label)
  const indicator_color = validated(opts.indicator, THEMES, 'indicator', 'avatar')
  const indicator = indicator_color
    ? `<span class="es-avatar__indicator" aria-hidden="true"><span class="es-avatar__indicator-dot"${indicator_color !== 'gray' ? ` data-color="${indicator_color}"` : ''}></span></span>`
    : ''
  const classes = escape(['es-avatar', opts.css_class].filter(Boolean).join(' '))
  const attr_str = attrs.length ? ' ' + attrs.join(' ') : ''
  return `<span class="${classes}"${attr_str}>${inner}${indicator}</span>`
}
frappe.ui.avatar = function (opts: any = {}) {
  const $el = $(avatar_html(opts))
  if (opts.image) {
    $el.find('img').on('error', function (this: any) {
      $(this).replaceWith(fallback_html(opts.label))
    })
  }
  return $el
}
document.addEventListener(
  'error',
  (e?: any) => {
    const img = e.target
    if (img.tagName === 'IMG' && img.parentElement?.classList.contains('es-avatar')) {
      img.outerHTML = fallback_html(img.alt)
    }
  },
  true,
)
frappe.ui.avatar.html = avatar_html
export default frappe.ui.avatar
