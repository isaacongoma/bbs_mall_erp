import { $, frappe } from '@/shared/frappe/runtime'
import { validated } from './utils.js'
frappe.provide('frappe.ui')
const TYPES: any = ['subtle', 'ghost', 'underline', 'browser-tab']
const SIZES: any = ['sm', 'md']
const DIRECTIONS: any = ['left', 'right']
frappe.ui.TabButtons = class TabButtons {
  [key: string]: any
  constructor(opts: any = {}) {
    this.opts = opts
    this.options = opts.options || []
    this.type = validated(opts.type, TYPES, 'type', 'TabButtons') || 'subtle'
    this.size = validated(opts.size, SIZES, 'size', 'TabButtons') || 'sm'
    this.direction = validated(opts.direction, DIRECTIONS, 'direction', 'TabButtons') || 'left'
    this.vertical = !!opts.vertical
    this.el = document.createElement('div')
    this.el.className = ['es-tab-buttons', opts.css_class].filter(Boolean).join(' ')
    this.el.setAttribute('role', 'radiogroup')
    if (opts.label) this.el.setAttribute('aria-label', opts.label)
    if (this.type !== 'subtle') this.el.setAttribute('data-type', this.type)
    if (this.size !== 'sm') this.el.setAttribute('data-size', this.size)
    if (this.vertical) {
      this.el.setAttribute('data-orientation', 'vertical')
      if (this.type === 'browser-tab' && this.direction === 'right') {
        this.el.setAttribute('data-direction', 'right')
      }
    }
    this.pills = this.options.map((option?: any) => this.build_pill(option))
    this.pills.forEach((pill?: any) => this.el.appendChild(pill.el))
    const initial =
      ('value' in opts ? this.find_by_value(opts.value) : null) ||
      this.pills.find((pill?: any) => pill.option.active && !pill.option.disabled) ||
      this.pills.find((pill?: any) => !pill.option.disabled)
    this.select(initial, { silent: true })
    this.el.addEventListener('keydown', (e?: any) => {
      const rtl = frappe.utils.is_rtl()
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
      const backward = rtl ? 'ArrowRight' : 'ArrowLeft'
      const step = e.key === forward || e.key === 'ArrowDown' ? 1 : e.key === backward || e.key === 'ArrowUp' ? -1 : 0
      if (!step) return
      e.preventDefault()
      const enabled = this.pills.filter((pill?: any) => !pill.option.disabled)
      if (!enabled.length) return
      const current = Math.max(enabled.indexOf(this.selected), 0)
      const next = enabled[(current + step + enabled.length) % enabled.length]
      this.select(next)
      next.el.focus()
    })
    this.$el = $(this.el)
  }
  resolve_extra(extra?: any, option?: any) {
    if (typeof extra === 'function') extra = extra(option)
    return (extra && $(extra)[0]) || null
  }
  build_pill(this: any, option?: any) {
    const el = document.createElement('button')
    el.type = 'button'
    if (option.disabled) el.disabled = true
    el.className = ['es-pill', option.css_class].filter(Boolean).join(' ')
    el.setAttribute('role', 'radio')
    if (this.type === 'underline') el.setAttribute('data-variant', 'underline')
    if (this.type === 'browser-tab') {
      el.setAttribute('data-variant', 'browser-tab')
      if (!this.vertical) el.setAttribute('data-tab-base', 'default')
    }
    if (this.type === 'ghost') el.setAttribute('data-active-style', 'subtle')
    if (this.size !== 'sm') el.setAttribute('data-size', this.size)
    const prefix = this.resolve_extra(option.prefix, option)
    prefix && el.appendChild(prefix)
    const main_icon = option.icon || option.icon_left
    if (main_icon) {
      el.insertAdjacentHTML('beforeend', frappe.utils.icon(main_icon, 'sm'))
    }
    if (option.icon) {
      el.setAttribute('data-icon-only', '')
      if (option.label) el.setAttribute('aria-label', option.label)
    } else if (option.label) {
      el.appendChild(document.createTextNode(option.label))
    }
    if (option.icon_right && !option.icon) {
      el.insertAdjacentHTML('beforeend', frappe.utils.icon(option.icon_right, 'sm'))
    }
    const suffix = this.resolve_extra(option.suffix, option)
    suffix && el.appendChild(suffix)
    if (option.title) el.title = option.title
    if (option.icon && !option.label && !option.title) {
      console.warn(`frappe.ui.TabButtons: icon-only button ("${option.icon}") needs a label or title`)
    }
    const pill: any = { el, option }
    el.addEventListener('click', (e?: any) => {
      this.select(pill)
      option.onclick && option.onclick(e)
    })
    return pill
  }
  find_by_value(this: any, value?: any) {
    return this.pills.find((pill?: any) => Object.is(this.value_of(pill), value))
  }
  value_of(pill?: any) {
    return 'value' in pill.option ? pill.option.value : pill.option.label
  }
  select(this: any, pill: any, { silent = false }: any = {}) {
    if (!pill || pill === this.selected) return
    this.selected = pill
    for (const entry of this.pills) {
      const active = entry === pill
      entry.el.setAttribute('data-state', active ? 'active' : 'inactive')
      entry.el.setAttribute('aria-checked', active ? 'true' : 'false')
      entry.el.tabIndex = active ? 0 : -1
      if (this.type === 'browser-tab' && this.vertical) {
        if (active) {
          entry.el.setAttribute('data-tab-base', this.direction)
        } else {
          entry.el.removeAttribute('data-tab-base')
        }
      }
    }
    if (!silent) {
      this.opts.on_change && this.opts.on_change(this.value_of(pill), pill.option)
    }
  }
  get_value(this: any) {
    return this.selected ? this.value_of(this.selected) : null
  }
  set_value(this: any, value: any, { silent = false }: any = {}) {
    const pill = this.find_by_value(value)
    if (!pill) {
      console.warn(`frappe.ui.TabButtons: no option with value "${value}"`)
      return
    }
    this.select(pill, { silent })
  }
}
frappe.ui.tab_buttons = function (opts: any = {}) {
  const tab_buttons = new frappe.ui.TabButtons(opts)
  tab_buttons.$el.data('es-tab-buttons', tab_buttons)
  return tab_buttons.$el
}
export default frappe.ui.tab_buttons
