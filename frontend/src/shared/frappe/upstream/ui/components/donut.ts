import { $, __, flt, frappe } from '@/shared/frappe/runtime'
import { CHART_PALETTE } from './utils.js'
frappe.provide('frappe.ui')
frappe.ui.Donut = class Donut {
  [key: string]: any
  constructor({ segments = [], center, format, size = 240, css_class }: any = {}) {
    this.center = center || {}
    this.format = format || ((v?: any) => String(v))
    this.size = size
    const ro = size * 0.46
    const ri = ro * 0.7
    this.geometry = { c: size / 2, ro, ri, lift: size * 0.02, corner: (ro - ri) * 0.15 }
    this.segments = this.prepare(segments)
    this.active = -1
    this.$el = $('<div class="es-donut">').addClass(css_class || '')
    this.$chart = $('<div class="es-donut__chart">').css({ width: size, height: size }).appendTo(this.$el)
    if (!this.segments.length) {
      this.$el.attr('data-state', 'empty')
      $('<div class="es-donut__empty">').text(__('No data to show')).appendTo(this.$chart)
      return
    }
    this.render_ring()
    this.render_center()
    this.$tip = $('<div class="es-donut__tip">').appendTo(this.$chart)
    this.render_legend()
    this.$chart.on('mouseleave', () => this.clear())
    this.$legend.on('mouseleave', () => this.clear())
  }
  prepare(segments?: any) {
    const kept = segments.filter((s?: any) => flt(s.value) > 0)
    const total = kept.reduce((sum?: any, s?: any) => sum + flt(s.value), 0)
    const pcts = whole_percentages(kept.map((s?: any) => flt(s.value) / total))
    const gap = kept.length > 1 ? 0.03 : 0
    let angle = -Math.PI / 2
    return kept.map((s?: any, i?: any) => {
      const sweep = (flt(s.value) / total) * 2 * Math.PI
      const g = Math.min(gap, sweep / 2)
      const seg: any = {
        label: s.label,
        value: flt(s.value),
        color: s.color || CHART_PALETTE[i % CHART_PALETTE.length],
        pct: pcts[i],
        a0: angle + g / 2,
        a1: angle + sweep - g / 2,
      }
      angle += sweep
      return seg
    })
  }
  path(this: any, seg?: any, outer?: any) {
    const { c, ri, corner } = this.geometry
    if (this.segments.length === 1) return ring_path(c, ri, outer)
    return sector_path(c, ri, outer, seg.a0, seg.a1, corner)
  }
  render_ring(this: any) {
    const { ro } = this.geometry
    const svg = svg_el('svg', {
      viewBox: `0 0 ${this.size} ${this.size}`,
      class: 'es-donut__svg',
      role: 'img',
      'aria-label': this.segments.map((s?: any) => `${s.label}: ${this.format(s.value)} (${s.pct}%)`).join(', '),
    })
    this.shapes = this.segments.map((seg?: any, i?: any) => {
      const shape = svg_el('path', { class: 'es-donut__seg', d: this.path(seg, ro) })
      shape.style.fill = seg.color
      $(shape)
        .on('mouseenter', (e?: any) => {
          this.highlight(i)
          this.$tip.addClass('is-visible')
          this.place_tip(e)
        })
        .on('mousemove', (e?: any) => this.place_tip(e))
        .on('mouseleave', () => this.clear())
      svg.appendChild(shape)
      return shape
    })
    this.$chart.append(svg)
  }
  render_center(this: any) {
    const { c, ri } = this.geometry
    const inset = c - ri * 0.85
    const $center = $('<div class="es-donut__center">')
      .css({ paddingLeft: inset, paddingRight: inset })
      .appendTo(this.$chart)
    this.$value = $('<div class="es-donut__value">').appendTo($center)
    this.$label = $('<div class="es-donut__label">').appendTo($center)
    this.set_center(this.center.value, this.center.label)
  }
  render_legend(this: any) {
    this.$legend = $('<div class="es-donut__legend">').appendTo(this.$el)
    this.segments.forEach((seg?: any, i?: any) => {
      $('<div class="es-donut__legend-row" tabindex="0">')
        .append(dot(seg.color))
        .append($('<span class="es-donut__legend-label">').text(seg.label))
        .append($('<span class="es-donut__legend-pct">').text(`${this.format(seg.value)} · ${seg.pct}%`))
        .on('mouseenter focus', () => {
          this.highlight(i)
          this.$tip.removeClass('is-visible')
        })
        .on('blur', () => this.clear())
        .appendTo(this.$legend)
    })
  }
  set_center(this: any, value?: any, label?: any) {
    this.$value.text(value == null ? '' : value)
    this.$label.text(label == null ? '' : label)
  }
  highlight(this: any, i?: any) {
    if (this.active === i) return
    this.active = i
    const seg = this.segments[i]
    const { ro, lift } = this.geometry
    this.shapes.forEach((shape?: any, j?: any) => {
      shape.classList.toggle('is-dim', j !== i)
      shape.setAttribute('d', this.path(this.segments[j], j === i ? ro + lift : ro))
    })
    this.$legend.children().removeClass('is-active').eq(i).addClass('is-active')
    this.set_center(this.format(seg.value), `${seg.label} · ${seg.pct}%`)
    this.$tip
      .empty()
      .append(dot(seg.color))
      .append($('<span class="es-donut__tip-label">').text(seg.label))
      .append($('<b>').text(this.format(seg.value)))
      .append($('<span class="es-donut__legend-pct">').text(seg.pct + '%'))
  }
  clear(this: any) {
    if (this.active === -1) return
    this.shapes[this.active].setAttribute('d', this.path(this.segments[this.active], this.geometry.ro))
    this.active = -1
    this.shapes.forEach((shape?: any) => shape.classList.remove('is-dim'))
    this.$legend.children().removeClass('is-active')
    this.set_center(this.center.value, this.center.label)
    this.$tip.removeClass('is-visible')
  }
  place_tip(this: any, e?: any) {
    const rect = this.$chart[0].getBoundingClientRect()
    const x = e.clientX - rect.left
    const fits_right = e.clientX + 14 + this.$tip.outerWidth() < document.documentElement.clientWidth
    const right = x >= rect.width / 2 && fits_right
    this.$tip.css({
      left: right ? x + 14 : x - 14,
      top: e.clientY - rect.top,
      transform: right ? 'translateY(-50%)' : 'translate(-100%, -50%)',
    })
  }
}
frappe.ui.donut = function (opts: any = {}) {
  const donut = new frappe.ui.Donut(opts)
  donut.$el.data('es-donut', donut)
  return donut.$el
}
function dot(color?: any) {
  return $('<span class="es-donut__dot">').css('background', color)
}
function svg_el(tag?: any, attrs?: any) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
  Object.entries(attrs).forEach(([key, value]: any) => el.setAttribute(key, value))
  return el
}
function whole_percentages(fracs?: any) {
  const raw = fracs.map((f?: any) => f * 100)
  const out = raw.map(Math.floor)
  let short = 100 - out.reduce((a?: any, b?: any) => a + b, 0)
  raw
    .map((r?: any, i?: any) => [r - out[i], i])
    .sort((a?: any, b?: any) => b[0] - a[0])
    .forEach(([, i]: any) => {
      if (short-- > 0) out[i] += 1
    })
  return out
}
function polar(c?: any, r?: any, a?: any) {
  return [c + r * Math.cos(a), c + r * Math.sin(a)]
}
function sector_path(c?: any, ri?: any, ro?: any, a0?: any, a1?: any, cr?: any) {
  const span = a1 - a0
  cr = Math.min(cr, (ro - ri) / 2, (span * ri) / 2.2)
  const dao = cr / ro
  const dai = cr / ri
  const large_o = span - 2 * dao > Math.PI ? 1 : 0
  const large_i = span - 2 * dai > Math.PI ? 1 : 0
  const p = (r?: any, a?: any) => polar(c, r, a).join(' ')
  return [
    'M ' + p(ro, a0 + dao),
    'A ' + ro + ' ' + ro + ' 0 ' + large_o + ' 1 ' + p(ro, a1 - dao),
    'Q ' + p(ro, a1) + ' ' + p(ro - cr, a1),
    'L ' + p(ri + cr, a1),
    'Q ' + p(ri, a1) + ' ' + p(ri, a1 - dai),
    'A ' + ri + ' ' + ri + ' 0 ' + large_i + ' 0 ' + p(ri, a0 + dai),
    'Q ' + p(ri, a0) + ' ' + p(ri + cr, a0),
    'L ' + p(ro - cr, a0),
    'Q ' + p(ro, a0) + ' ' + p(ro, a0 + dao),
    'Z',
  ].join(' ')
}
function ring_path(c?: any, ri?: any, ro?: any) {
  const arc = (r?: any, sweep?: any, x?: any) => `A ${r} ${r} 0 1 ${sweep} ${x} ${c}`
  return [
    `M ${c + ro} ${c}`,
    arc(ro, 1, c - ro),
    arc(ro, 1, c + ro),
    `M ${c + ri} ${c}`,
    arc(ri, 0, c - ri),
    arc(ri, 0, c + ri),
    'Z',
  ].join(' ')
}
export default frappe.ui.donut
