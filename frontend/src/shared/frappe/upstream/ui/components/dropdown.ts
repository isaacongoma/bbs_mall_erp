import { $, __, frappe } from '@/shared/frappe/runtime'
import { MenuTree } from './menu.js'
import { SIDES, ALIGNS } from './position.js'
import { validated } from './utils.js'
frappe.provide('frappe.ui')
frappe.ui.Dropdown = class Dropdown {
  [key: string]: any
  constructor(opts: any = {}) {
    this.opts = opts
    this.options = opts.options || []
    this.side = validated(opts.side, SIDES, 'side', 'Dropdown') || 'bottom'
    this.align = validated(opts.align, ALIGNS, 'align', 'Dropdown') || 'start'
    this.offset = opts.offset == null ? 4 : opts.offset
    this.menu = null
    const button_opts: any = { ...opts.button }
    if (!button_opts.label && !button_opts.icon && !button_opts.icon_left && !button_opts.icon_right) {
      button_opts.label = __('Options')
    }
    if (button_opts.onclick) {
      console.warn('frappe.ui.Dropdown: button.onclick is ignored — put actions on the items')
      delete button_opts.onclick
    }
    this.$trigger = opts.trigger ? $(opts.trigger) : frappe.ui.button(button_opts)
    this.trigger_el = this.$trigger[0]
    if (!this.trigger_el) {
      console.warn('frappe.ui.Dropdown: trigger element not found')
      return
    }
    this.trigger_el.setAttribute('aria-haspopup', 'menu')
    this.trigger_el.setAttribute('aria-expanded', 'false')
    this.last_pointerdown = 0
    this.onpointerdown = () => (this.last_pointerdown = Date.now())
    this.onclick = (e?: any) => {
      e.preventDefault()
      if (this.is_open) {
        this.close('owner')
      } else if (Date.now() - this.last_pointerdown < 300) {
        this.open({ motion: 'animated', focus: null })
      } else {
        this.open({ motion: 'instant', focus: 'first' })
      }
    }
    this.onkeydown = (e?: any) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      if (!this.is_open) {
        this.open({ motion: 'instant', focus: e.key === 'ArrowDown' ? 'first' : 'last' })
      }
    }
    this.trigger_el.addEventListener('pointerdown', this.onpointerdown)
    this.trigger_el.addEventListener('click', this.onclick)
    this.trigger_el.addEventListener('keydown', this.onkeydown)
  }
  get is_open() {
    return !!this.menu
  }
  open(this: any, { motion = 'animated', focus = null }: any = {}) {
    if (this.menu || !this.trigger_el) return
    this.menu = new MenuTree({
      options: this.options,
      empty_text: this.opts.empty_text,
      component: 'Dropdown',
      anchor: () => this.trigger_el.getBoundingClientRect(),
      ignore: [this.trigger_el],
      on_close: (reason?: any) => {
        this.menu = null
        this.trigger_el.setAttribute('aria-expanded', 'false')
        if (reason === 'escape' || reason === 'activate' || reason === 'tab') {
          this.trigger_el.focus({ preventScroll: true })
        }
        this.opts.on_close && this.opts.on_close(reason)
      },
    })
    this.menu.open({ side: this.side, align: this.align, offset: this.offset, motion, focus })
    this.trigger_el.setAttribute('aria-expanded', 'true')
    this.opts.on_open && this.opts.on_open()
  }
  close(this: any, reason: any = 'owner') {
    this.menu && this.menu.close(reason)
  }
  toggle(this: any) {
    this.is_open ? this.close('owner') : this.open()
  }
  set_options(this: any, options?: any) {
    this.options = options || []
  }
  destroy(this: any) {
    this.close('owner')
    if (!this.trigger_el) return
    this.trigger_el.removeEventListener('pointerdown', this.onpointerdown)
    this.trigger_el.removeEventListener('click', this.onclick)
    this.trigger_el.removeEventListener('keydown', this.onkeydown)
  }
}
frappe.ui.dropdown = function (opts: any = {}) {
  const dropdown = new frappe.ui.Dropdown(opts)
  dropdown.$trigger.data('es-dropdown', dropdown)
  return dropdown.$trigger
}
export default frappe.ui.dropdown
