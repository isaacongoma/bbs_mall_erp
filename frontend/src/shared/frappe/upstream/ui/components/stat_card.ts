import { $, __, flt, frappe, jQuery } from '@/shared/frappe/runtime'
import { make_activatable } from './utils.js'
frappe.provide('frappe.ui')
frappe.ui.stat_card = function ({ label, value, delta, caption, dot, icon, loading, onclick, css_class }: any = {}) {
  const $card = $('<div class="es-stat-card">').addClass(css_class || '')
  const $head = $('<div class="es-stat-card__head">').appendTo($card)
  if (dot) $('<span class="es-stat-card__dot">').css('background', dot).appendTo($head)
  else if (icon) $head.append(frappe.utils.icon(icon, 'sm'))
  $('<span class="es-stat-card__label">')
    .text(label || '')
    .appendTo($head)
  const $value = $('<div class="es-stat-card__value">').appendTo($card)
  if (loading) {
    $card.attr({ 'data-state': 'loading', 'aria-busy': 'true' })
    $value.append(frappe.ui.skeleton({ width: '96px', height: '20px' }))
    $('<div class="es-stat-card__caption">')
      .append(frappe.ui.skeleton({ width: '128px', height: '12px' }))
      .appendTo($card)
    return $card
  }
  if (value == null) {
    $card.attr('data-state', 'empty')
    $value.text('—')
    $('<div class="es-stat-card__caption">').text(__('No data')).appendTo($card)
  } else {
    set_content($value, value)
    if (delta) {
      $card.append(build_delta(delta))
    } else if (caption != null) {
      set_content($('<div class="es-stat-card__caption">').appendTo($card), caption)
    }
  }
  if (onclick) make_activatable($card.addClass('es-stat-card--clickable'), onclick)
  return $card
}
frappe.ui.stat_cards = function ({ items = [], layout = 'grid' }: any = {}) {
  const cls = layout === 'stack' ? 'es-stat-card-stack' : 'es-stat-card-grid'
  const $wrap = $(`<div class="${cls}">`)
  items.forEach((opts?: any) => $wrap.append(frappe.ui.stat_card(opts)))
  return $wrap
}
function set_content($el?: any, content?: any) {
  if (content == null) return
  if (content instanceof jQuery || content instanceof Element) {
    $el.append(content)
  } else {
    $el.text(content)
  }
}
function build_delta({ value, positive_is_good = true, suffix }: any = {}) {
  const $delta = $('<div class="es-stat-card__caption es-stat-card__delta">')
  const change = flt(value)
  if (!change) {
    $delta.attr('data-tone', 'neutral').append(document.createTextNode('0%'))
  } else {
    const up = change > 0
    $delta
      .attr('data-tone', up === positive_is_good ? 'positive' : 'negative')
      .append(frappe.utils.icon(up ? 'arrow-up-right' : 'arrow-down-right', 'sm'))
      .append(document.createTextNode(' ' + (up ? '+' : '−') + (flt(Math.abs(change), 1) || '<0.1') + '%'))
  }
  if (suffix)
    $('<span class="es-stat-card__delta-suffix">')
      .text(' ' + suffix)
      .appendTo($delta)
  return $delta
}
export default frappe.ui.stat_card
