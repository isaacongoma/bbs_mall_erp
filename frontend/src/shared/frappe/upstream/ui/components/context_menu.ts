import { $, frappe } from '@/shared/frappe/runtime'
import { MenuTree } from './menu.js'
frappe.provide('frappe.ui')
frappe.ui.ContextMenu = class ContextMenu {
  [key: string]: any
  constructor(opts: any = {}) {
    this.opts = opts
    this.options = opts.options || []
    this.menu = null
    this.target_el = opts.target ? $(opts.target)[0] : null
    if (!this.target_el) {
      console.warn('frappe.ui.ContextMenu: a target element is required')
      return
    }
    this.oncontextmenu = (e?: any) => {
      e.preventDefault()
      this.opts.on_open && this.opts.on_open(e)
      this.open_at(e.clientX, e.clientY)
    }
    this.target_el.addEventListener('contextmenu', this.oncontextmenu)
  }
  get is_open() {
    return !!this.menu
  }
  open_at(this: any, x?: any, y?: any) {
    if (!this.target_el) return
    this.close('owner')
    this.previous_state = this.target_el.getAttribute('data-state')
    this.target_el.setAttribute('data-state', 'open')
    const return_focus = document.activeElement
    const anchor: any = { top: y, bottom: y, left: x, right: x, width: 0, height: 0 }
    this.menu = new MenuTree({
      options: this.options,
      empty_text: this.opts.empty_text,
      component: 'ContextMenu',
      anchor: () => anchor,
      lock_scroll: true,
      on_close: (reason?: any) => {
        if (this.previous_state == null) {
          this.target_el.removeAttribute('data-state')
        } else {
          this.target_el.setAttribute('data-state', this.previous_state)
        }
        if (
          (reason === 'escape' || reason === 'activate' || reason === 'tab') &&
          return_focus &&
          return_focus.isConnected
        ) {
          ;(return_focus as any).focus({ preventScroll: true })
        }
        this.menu = null
        this.opts.on_close && this.opts.on_close(reason)
      },
    })
    this.menu.open({ side: 'bottom', align: 'start', motion: 'animated', focus: null })
  }
  close(this: any, reason: any = 'owner') {
    this.menu && this.menu.close(reason)
  }
  set_options(this: any, options?: any) {
    this.options = options || []
  }
  destroy(this: any) {
    this.close('owner')
    if (this.target_el) {
      this.target_el.removeEventListener('contextmenu', this.oncontextmenu)
    }
  }
}
export default frappe.ui.ContextMenu
