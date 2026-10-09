import { $, __, flt, frappe } from '@/shared/frappe/runtime'
import { CHART_PALETTE, make_activatable } from './utils.js'
frappe.provide('frappe.ui')
frappe.ui.bar_list = function ({
  items = [],
  max,
  format,
  color,
  label_width,
  values_on_hover,
  onclick,
  css_class,
}: any = {}) {
  const $root = $('<div class="es-bar-list">').addClass(css_class || '')
  if (!items.length) {
    return $root.attr('data-state', 'empty').append($('<div class="es-bar-list__empty">').text(__('No data to show')))
  }
  format = format || ((v?: any) => String(v))
  const values = items.map((it?: any) => Math.max(flt(it.value), 0))
  const data_max = Math.max(flt(max), 0, ...values)
  const { nice_max, ticks } = axis_ticks(data_max, 6)
  const at = (v?: any) => (nice_max ? (Math.max(flt(v), 0) / nice_max) * 100 : 0) + '%'
  $root.toggleClass('es-bar-list--hover-values', !!values_on_hover && !!onclick)
  if (label_width) $root.css('--es-bl-label-w', label_width + 'px')
  const $plot = $('<div class="es-bar-list__plot">').appendTo($root)
  ticks.forEach((t?: any) => {
    $('<div class="es-bar-list__gridline">').css('inset-inline-start', at(t)).appendTo($plot)
  })
  const $rows = $('<div class="es-bar-list__rows">').appendTo($plot)
  items.forEach((it?: any) => $rows.append(build_row(it, { at, format, color, onclick })))
  const $axis = $('<div class="es-bar-list__axis">').appendTo($plot)
  ticks.forEach((t?: any) => {
    $('<div class="es-bar-list__tick">').css('inset-inline-start', at(t)).text(format(t)).appendTo($axis)
  })
  return $root
}
function build_row(item: any, { at, format, color, onclick }: any) {
  const $row = $('<div class="es-bar-list__row">')
  if (onclick) {
    make_activatable($row.addClass('es-bar-list__row--clickable'), () => onclick(item))
  }
  $('<div class="es-bar-list__label">').text(item.label).attr('title', item.label).appendTo($row)
  const $bar = $('<div class="es-bar-list__bar">').css('width', at(item.value)).appendTo($row)
  $bar.css('background-color', color || CHART_PALETTE[0])
  $('<div class="es-bar-list__value">')
    .css('inset-inline-start', at(item.value))
    .text(item.formatted != null ? item.formatted : format(item.value))
    .appendTo($row)
  return $row
}
function nice_num(range?: any, round?: any) {
  const exp = Math.floor(Math.log10(range || 1))
  const base = Math.pow(10, exp)
  const f = range / base
  let nf: any
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nf * base
}
function axis_ticks(max?: any, count?: any) {
  if (!(max > 0)) return { nice_max: 1, ticks: [0, 1] }
  const step = nice_num(nice_num(max, false) / (count - 1), true)
  const nice_max = Math.ceil(max / step) * step
  const ticks: any = []
  for (let t = 0; t <= nice_max + step / 2; t += step) ticks.push(t)
  return { nice_max, ticks }
}
export default frappe.ui.bar_list
