import { $, frappe } from '@/shared/frappe/runtime'
import { validated } from './utils.js'
frappe.provide('frappe.ui')
const SIZES: any = ['sm', 'md', 'lg', 'xl']
let id_counter = 0
frappe.ui.Progress = class Progress {
  [key: string]: any
  constructor(opts: any = {}) {
    this.opts = opts
    this.size = validated(opts.size, SIZES, 'size', 'Progress') || 'sm'
    this.intervals = !!opts.intervals
    this.interval_count = opts.interval_count || 6
    this.el = document.createElement('div')
    this.el.className = ['es-progress', opts.css_class].filter(Boolean).join(' ')
    if (opts.label || opts.hint) {
      const header = document.createElement('div')
      header.className = 'es-progress__header'
      if (opts.label) {
        this.label_el = document.createElement('span')
        this.label_el.className = 'es-progress__label'
        this.label_el.id = `es-progress-label-${++id_counter}`
        this.label_el.textContent = opts.label
        header.appendChild(this.label_el)
      }
      if (opts.hint) {
        this.hint_el = document.createElement('span')
        this.hint_el.className = 'es-progress__hint'
        header.appendChild(this.hint_el)
      }
      this.el.appendChild(header)
    }
    this.track = document.createElement('div')
    this.track.className = 'es-progress__track'
    this.track.setAttribute('role', 'progressbar')
    this.track.setAttribute('aria-valuemin', '0')
    this.track.setAttribute('aria-valuemax', '100')
    if (this.label_el) this.track.setAttribute('aria-labelledby', this.label_el.id)
    if (this.size !== 'sm') this.track.setAttribute('data-size', this.size)
    this.el.appendChild(this.track)
    if (this.intervals) {
      this.track.setAttribute('data-intervals', '')
      this.segments = []
      for (let i = 0; i < this.interval_count; i++) {
        const segment = document.createElement('div')
        segment.className = 'es-progress__segment'
        this.segments.push(segment)
        this.track.appendChild(segment)
      }
    } else {
      this.fill = document.createElement('div')
      this.fill.className = 'es-progress__fill'
      this.track.appendChild(this.fill)
    }
    this.set_value(opts.value || 0)
    this.$el = $(this.el)
  }
  set_value(this: any, value?: any) {
    this.value = value
    const shown = Math.min(Math.max(value, 0), 100)
    this.track.setAttribute('aria-valuenow', String(shown))
    if (this.intervals) {
      const filled = Math.round((shown / 100) * this.interval_count)
      this.segments.forEach((segment?: any, i?: any) => {
        segment.toggleAttribute('data-filled', i < filled)
      })
    } else {
      this.fill.style.width = `${shown}%`
    }
    if (this.hint_el) {
      this.hint_el.textContent = typeof this.opts.hint === 'function' ? this.opts.hint(value) : `${Math.round(shown)}%`
    }
  }
  get_value(this: any) {
    return this.value
  }
  set_label(this: any, label?: any) {
    if (this.label_el) this.label_el.textContent = label
  }
}
frappe.ui.progress = function (opts: any = {}) {
  const progress = new frappe.ui.Progress(opts)
  progress.$el.data('es-progress', progress)
  return progress.$el
}
frappe.ui.progress.html = function (opts: any = {}) {
  return new frappe.ui.Progress(opts).el.outerHTML
}
export default frappe.ui.progress
