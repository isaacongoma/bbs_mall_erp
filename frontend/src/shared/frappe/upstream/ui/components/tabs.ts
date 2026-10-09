import { $, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.ui')
let id_counter = 0
frappe.ui.Tabs = class Tabs {
  [key: string]: any
  constructor(opts: any = {}) {
    this.opts = opts
    this.vertical = !!opts.vertical
    this.active = null
    const uid = ++id_counter
    this.el = document.createElement('div')
    this.el.className = ['es-tabs', opts.css_class].filter(Boolean).join(' ')
    this.el.setAttribute('data-orientation', this.vertical ? 'vertical' : 'horizontal')
    this.list = document.createElement('div')
    this.list.className = 'es-tabs__list'
    this.list.setAttribute('role', 'tablist')
    this.list.setAttribute('aria-orientation', this.vertical ? 'vertical' : 'horizontal')
    this.el.appendChild(this.list)
    this.tabs = (opts.tabs || []).map((tab?: any, i?: any) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'es-tabs__tab'
      button.id = `es-tab-${uid}-${i}`
      button.setAttribute('role', 'tab')
      if (tab.disabled) button.disabled = true
      if (tab.icon) {
        button.insertAdjacentHTML('beforeend', frappe.utils.icon(tab.icon, 'sm'))
      }
      button.appendChild(document.createTextNode(tab.label || ''))
      this.list.appendChild(button)
      const panel = document.createElement('div')
      panel.className = 'es-tabs__panel'
      panel.id = `es-tabpanel-${uid}-${i}`
      panel.setAttribute('role', 'tabpanel')
      panel.setAttribute('aria-labelledby', button.id)
      panel.tabIndex = 0
      button.setAttribute('aria-controls', panel.id)
      this.el.appendChild(panel)
      const entry: any = { tab, button, panel, rendered: false }
      button.addEventListener('click', () => this.set_active(i))
      return entry
    })
    this.indicator = document.createElement('span')
    this.indicator.className = 'es-tabs__indicator'
    this.indicator.setAttribute('aria-hidden', 'true')
    this.list.appendChild(this.indicator)
    this.list.addEventListener('keydown', (e?: any) => {
      const rtl = !this.vertical && frappe.utils.is_rtl()
      const forward = this.vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'
      const backward = this.vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'
      const enabled = this.tabs.filter((entry?: any) => !entry.tab.disabled)
      if (!enabled.length) return
      let target = null
      if (e.key === forward || e.key === backward) {
        const step = e.key === forward ? 1 : -1
        const current = Math.max(
          enabled.findIndex((entry?: any) => entry === this.tabs[this.active]),
          0,
        )
        target = enabled[(current + step + enabled.length) % enabled.length]
      } else if (e.key === 'Home') {
        target = enabled[0]
      } else if (e.key === 'End') {
        target = enabled[enabled.length - 1]
      }
      if (!target) return
      e.preventDefault()
      this.set_active(this.tabs.indexOf(target))
      target.button.focus()
    })
    if (window.ResizeObserver) {
      this.observer = new ResizeObserver(() => this.position_indicator())
      this.observer.observe(this.list)
    } else {
      this.onresize = () => this.position_indicator()
      window.addEventListener('resize', this.onresize)
    }
    const requested = this.tabs[opts.active || 0]
    const initial =
      requested && !requested.tab.disabled ? requested : this.tabs.find((entry?: any) => !entry.tab.disabled)
    initial && this.set_active(this.tabs.indexOf(initial), { silent: true })
    this.$el = $(this.el)
  }
  render_panel(this: any, entry?: any) {
    if (entry.rendered) return
    entry.rendered = true
    let content = entry.tab.content
    if (typeof content === 'function') content = content(this)
    if (typeof content === 'string') {
      entry.panel.textContent = content
    } else if (content) {
      const el = $(content)[0]
      el && entry.panel.appendChild(el)
    }
  }
  set_active(this: any, index: any, { silent = false }: any = {}) {
    const entry = this.tabs[index]
    if (!entry || entry.tab.disabled || index === this.active) return
    this.active = index
    this.render_panel(entry)
    for (const other of this.tabs) {
      const active = other === entry
      other.button.setAttribute('data-state', active ? 'active' : 'inactive')
      other.button.setAttribute('aria-selected', active ? 'true' : 'false')
      other.button.tabIndex = active ? 0 : -1
      other.panel.setAttribute('data-state', active ? 'active' : 'inactive')
    }
    this.position_indicator()
    if (!silent) {
      this.opts.on_change && this.opts.on_change(index, entry.tab)
    }
  }
  get_active(this: any) {
    return this.active
  }
  position_indicator(this: any) {
    const entry = this.tabs[this.active]
    if (!entry) return
    const offset = this.vertical ? entry.button.offsetTop : entry.button.offsetLeft
    const size = this.vertical ? entry.button.offsetHeight : entry.button.offsetWidth
    if (!size) return
    if (!this.indicator_placed) {
      this.indicator_placed = true
      this.indicator.style.transition = 'none'
      requestAnimationFrame(() => (this.indicator.style.transition = ''))
    }
    this.indicator.style.setProperty('--es-tabs-indicator-x', `${offset}px`)
    this.indicator.style.setProperty('--es-tabs-indicator-w', `${size}px`)
  }
  destroy(this: any) {
    this.observer && this.observer.disconnect()
    this.onresize && window.removeEventListener('resize', this.onresize)
    this.el.remove()
  }
}
frappe.ui.tabs = function (opts: any = {}) {
  const tabs = new frappe.ui.Tabs(opts)
  tabs.$el.data('es-tabs', tabs)
  return tabs.$el
}
export default frappe.ui.tabs
