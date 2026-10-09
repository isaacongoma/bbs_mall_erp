import { $, frappe } from '@/shared/frappe/runtime'
import { place, SIDES, ALIGNS } from './position.js'
import { validated } from './utils.js'
frappe.provide('frappe.ui')
const EXIT_MS = 100
frappe.ui.HoverCard = class HoverCard {
  [key: string]: any
  constructor(trigger?: any, opts: any = {}) {
    this.trigger_el = $(trigger)[0]
    if (!this.trigger_el) {
      console.warn('frappe.ui.HoverCard: trigger element not found')
      return
    }
    this.opts = opts
    this.side = validated(opts.side, SIDES, 'side', 'HoverCard') || 'bottom'
    this.align = validated(opts.align, ALIGNS, 'align', 'HoverCard') || 'center'
    this.offset = opts.offset == null ? 4 : opts.offset
    this.open_delay = opts.open_delay == null ? 700 : opts.open_delay
    this.close_delay = opts.close_delay == null ? 300 : opts.close_delay
    this.panel = null
    this.open_timer = null
    this.close_timer = null
    this.onenter = (e?: any) => {
      if (e.pointerType === 'touch') return
      this.cancel_timers()
      if (!this.panel) {
        this.open_timer = setTimeout(() => this.open(), this.open_delay)
      }
    }
    this.onleave = () => {
      this.cancel_timers()
      if (this.panel) {
        this.close_timer = setTimeout(() => this.close(), this.close_delay)
      }
    }
    this.onfocus = () => {
      this.cancel_timers()
      this.open()
    }
    this.onblur = () => this.close()
    this.trigger_el.addEventListener('pointerenter', this.onenter)
    this.trigger_el.addEventListener('pointerleave', this.onleave)
    this.trigger_el.addEventListener('focus', this.onfocus)
    this.trigger_el.addEventListener('blur', this.onblur)
  }
  get is_open() {
    return !!this.panel
  }
  cancel_timers(this: any) {
    clearTimeout(this.open_timer)
    clearTimeout(this.close_timer)
  }
  resolve_content(this: any) {
    let content = this.opts.content
    if (typeof content === 'function') content = content(this)
    if (typeof content === 'string') {
      const p = document.createElement('div')
      p.textContent = content
      return p
    }
    const el = content && $(content)[0]
    if (!el) {
      console.warn('frappe.ui.HoverCard: no content to show')
      return null
    }
    return el
  }
  open(this: any) {
    if (this.panel || !this.trigger_el.isConnected) return
    const content = this.resolve_content()
    if (!content) return
    const panel = document.createElement('div')
    panel.className = ['es-popover es-hover-card', this.opts.css_class].filter(Boolean).join(' ')
    panel.appendChild(content)
    document.body.appendChild(panel)
    place(panel, this.trigger_el.getBoundingClientRect(), this.side, this.align, this.offset)
    panel.setAttribute('data-state', 'open')
    this.panel = panel
    panel.addEventListener('pointerenter', this.onenter)
    panel.addEventListener('pointerleave', this.onleave)
    this.onkeydown = (e?: any) => {
      if (e.key === 'Escape') this.close()
    }
    this.onreposition = () => {
      place(panel, this.trigger_el.getBoundingClientRect(), this.side, this.align, this.offset)
    }
    document.addEventListener('keydown', this.onkeydown)
    window.addEventListener('resize', this.onreposition)
    document.addEventListener('scroll', this.onreposition, { capture: true, passive: true })
    this.opts.on_open && this.opts.on_open(this)
  }
  close(this: any) {
    this.cancel_timers()
    if (!this.panel) return
    const panel = this.panel
    this.panel = null
    document.removeEventListener('keydown', this.onkeydown)
    window.removeEventListener('resize', this.onreposition)
    document.removeEventListener('scroll', this.onreposition, { capture: true })
    panel.setAttribute('data-state', 'closed')
    setTimeout(() => panel.remove(), EXIT_MS + 50)
    this.opts.on_close && this.opts.on_close()
  }
  destroy(this: any) {
    this.close()
    if (!this.trigger_el) return
    this.trigger_el.removeEventListener('pointerenter', this.onenter)
    this.trigger_el.removeEventListener('pointerleave', this.onleave)
    this.trigger_el.removeEventListener('focus', this.onfocus)
    this.trigger_el.removeEventListener('blur', this.onblur)
  }
}
frappe.ui.hover_card = function (trigger?: any, opts: any = {}) {
  const card = new frappe.ui.HoverCard(trigger, opts)
  const $trigger = $(trigger)
  $trigger.data('es-hover-card', card)
  return $trigger
}
export default frappe.ui.hover_card
