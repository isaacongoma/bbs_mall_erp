import { $, __, frappe } from '@/shared/frappe/runtime'
import { place, SIDES, ALIGNS } from './position.js'
import { validated } from './utils.js'
frappe.provide('frappe.ui')
const EXIT_MS = 100
const TABBABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
let id_counter = 0
frappe.ui.Popover = class Popover {
  [key: string]: any
  constructor(opts: any = {}) {
    this.opts = opts
    this.side = validated(opts.side, SIDES, 'side', 'Popover') || 'bottom'
    this.align = validated(opts.align, ALIGNS, 'align', 'Popover') || 'start'
    this.offset = opts.offset == null ? 4 : opts.offset
    this.panel = null
    const button_opts: any = { label: __('Open'), ...opts.button }
    if (button_opts.onclick) {
      console.warn("frappe.ui.Popover: button.onclick is ignored — the trigger's click toggles the panel")
      delete button_opts.onclick
    }
    this.$trigger = opts.trigger ? $(opts.trigger) : frappe.ui.button(button_opts)
    this.trigger_el = this.$trigger[0]
    if (!this.trigger_el) {
      console.warn('frappe.ui.Popover: trigger element not found')
      return
    }
    this.trigger_el.setAttribute('aria-haspopup', 'dialog')
    this.trigger_el.setAttribute('aria-expanded', 'false')
    this.ontriggerclick = (e?: any) => {
      e.preventDefault()
      this.toggle()
    }
    this.trigger_el.addEventListener('click', this.ontriggerclick)
  }
  get is_open() {
    return !!this.panel
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
      console.warn('frappe.ui.Popover: no content to show')
      return null
    }
    return el
  }
  open(this: any) {
    if (this.panel || !this.trigger_el) return
    const content = this.resolve_content()
    if (!content) return
    const panel = document.createElement('div')
    panel.className = ['es-popover', this.opts.css_class].filter(Boolean).join(' ')
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('tabindex', '-1')
    panel.id = `es-popover-${++id_counter}`
    panel.appendChild(content)
    document.body.appendChild(panel)
    place(panel, this.trigger_el.getBoundingClientRect(), this.side, this.align, this.offset)
    panel.setAttribute('data-state', 'open')
    this.trigger_el.setAttribute('aria-expanded', 'true')
    this.trigger_el.setAttribute('aria-controls', panel.id)
    this.panel = panel
    panel.focus({ preventScroll: true })
    this.onkeydown = (e?: any) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        this.close('escape')
      } else if (e.key === 'Tab') {
        this.handle_tab(e)
      }
    }
    this.onpointerdown = (e?: any) => {
      if (panel.contains(e.target) || this.trigger_el.contains(e.target)) return
      this.close('outside')
    }
    this.onfocusin = (e?: any) => {
      if (panel.contains(e.target) || this.trigger_el.contains(e.target)) return
      this.close('blur')
    }
    this.onreposition = () => {
      place(panel, this.trigger_el.getBoundingClientRect(), this.side, this.align, this.offset)
    }
    panel.addEventListener('keydown', this.onkeydown)
    document.addEventListener('pointerdown', this.onpointerdown, { capture: true })
    document.addEventListener('focusin', this.onfocusin)
    window.addEventListener('resize', this.onreposition)
    document.addEventListener('scroll', this.onreposition, { capture: true, passive: true })
    this.opts.on_open && this.opts.on_open(this)
  }
  handle_tab(this: any, e?: any) {
    const tabbables: any = [...this.panel.querySelectorAll(TABBABLE)]
    const first = tabbables[0]
    const last = tabbables[tabbables.length - 1]
    const active = document.activeElement
    if (!tabbables.length || (!e.shiftKey && active === last)) {
      this.close('tab')
    } else if (e.shiftKey && (active === first || active === this.panel)) {
      e.preventDefault()
      this.close('tab')
    }
  }
  close(this: any, reason: any = 'owner') {
    if (!this.panel) return
    const panel = this.panel
    this.panel = null
    panel.removeEventListener('keydown', this.onkeydown)
    document.removeEventListener('pointerdown', this.onpointerdown, { capture: true })
    document.removeEventListener('focusin', this.onfocusin)
    window.removeEventListener('resize', this.onreposition)
    document.removeEventListener('scroll', this.onreposition, { capture: true })
    this.trigger_el.setAttribute('aria-expanded', 'false')
    this.trigger_el.removeAttribute('aria-controls')
    if (reason === 'escape' || reason === 'tab') {
      this.trigger_el.focus({ preventScroll: true })
    }
    panel.setAttribute('data-state', 'closed')
    setTimeout(() => panel.remove(), EXIT_MS + 50)
    this.opts.on_close && this.opts.on_close(reason)
  }
  toggle(this: any) {
    this.is_open ? this.close('owner') : this.open()
  }
  destroy(this: any) {
    this.close('owner')
    if (!this.trigger_el) return
    this.trigger_el.removeEventListener('click', this.ontriggerclick)
  }
}
frappe.ui.popover = function (opts: any = {}) {
  const popover = new frappe.ui.Popover(opts)
  popover.$trigger.data('es-popover', popover)
  return popover.$trigger
}
export default frappe.ui.popover
