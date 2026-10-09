import { $, frappe } from '@/shared/frappe/runtime'
import { place, SIDES, ALIGNS } from './position.js'
import { validated, shortcut_keys } from './utils.js'
frappe.provide('frappe.ui')
const SKIP_DELAY_MS = 300
let last_hidden_at = 0
let visible: any = null
const EXIT_MS = 100
const TEXT_ALIGNS: any = ['start', 'center']
let id_counter = 0
function is_truncated(el?: any) {
  if (el.offsetWidth === 0 && el.offsetHeight === 0) return false
  const style = getComputedStyle(el)
  let axis = 'both'
  if (style.whiteSpace === 'nowrap' || style.whiteSpace === 'pre') axis = 'x'
  else if (style.webkitLineClamp && style.webkitLineClamp !== 'none') axis = 'y'
  const x = axis !== 'y' && el.scrollWidth - el.clientWidth > 1
  const y = axis !== 'x' && el.scrollHeight - el.clientHeight > 1
  return x || y
}
function collapse(text?: any) {
  return (text || '').replace(/\s+/g, ' ').trim()
}
function point_arrow(bubble?: any, anchor?: any) {
  const rect = bubble.getBoundingClientRect()
  const landed = bubble.getAttribute('data-side')
  const offset =
    landed === 'top' || landed === 'bottom'
      ? Math.min(Math.max(anchor.left + anchor.width / 2 - rect.left, 8), rect.width - 8)
      : Math.min(Math.max(anchor.top + anchor.height / 2 - rect.top, 8), rect.height - 8)
  bubble.style.setProperty('--arrow-offset', `${Math.round(offset)}px`)
}
frappe.ui.Tooltip = class Tooltip {
  [key: string]: any
  constructor(trigger?: any, opts: any = {}) {
    this.trigger_el = $(trigger)[0]
    if (!this.trigger_el) {
      console.warn('frappe.ui.Tooltip: trigger element not found')
      return
    }
    this.text = opts.text || ''
    this.only_on_overflow = !!opts.only_on_overflow
    this.shortcut = opts.shortcut || null
    this.side = validated(opts.side, SIDES, 'side', 'Tooltip') || 'top'
    this.align = validated(opts.align, ALIGNS, 'align', 'Tooltip') || 'center'
    this.text_align = validated(opts.text_align, TEXT_ALIGNS, 'text_align', 'Tooltip') || 'center'
    this.delay = opts.delay == null ? 500 : opts.delay
    this.offset = opts.offset == null ? 4 : opts.offset
    this.extra_class = opts.class || ''
    this.bubble = null
    this.show_timer = null
    this.onenter = () => {
      const warm = Date.now() - last_hidden_at < SKIP_DELAY_MS
      this.schedule(warm ? 0 : this.delay)
    }
    this.onleave = () => this.hide()
    this.onfocus = () => {
      if (this.trigger_el.matches(':focus-visible')) this.schedule(0)
    }
    this.onblur = () => this.hide()
    this.ondown = (e?: any) => {
      if (e.key === 'Escape' && this.bubble) e.stopPropagation()
      this.hide()
    }
    this.trigger_el.addEventListener('pointerenter', this.onenter)
    this.trigger_el.addEventListener('pointerleave', this.onleave)
    this.trigger_el.addEventListener('focus', this.onfocus)
    this.trigger_el.addEventListener('blur', this.onblur)
    this.trigger_el.addEventListener('pointerdown', this.ondown)
    this.trigger_el.addEventListener('keydown', this.ondown)
  }
  schedule(this: any, wait: any = this.delay) {
    if (this.bubble || !(this.text || this.only_on_overflow)) return
    clearTimeout(this.show_timer)
    this.show_timer = setTimeout(() => this.show(), wait)
  }
  show(this: any) {
    if (this.bubble || !this.trigger_el.isConnected) return
    if (this.only_on_overflow && !is_truncated(this.trigger_el)) return
    const text = this.text || (this.only_on_overflow ? collapse(this.trigger_el.textContent) : '')
    if (!text) return
    if (visible && visible !== this) visible.hide()
    visible = this
    const bubble = document.createElement('div')
    const classes: any = ['es-tooltip']
    if (this.text_align === 'start') classes.push('es-tooltip--text-start')
    if (this.extra_class) classes.push(this.extra_class)
    bubble.className = classes.join(' ')
    bubble.setAttribute('role', 'tooltip')
    bubble.id = `es-tooltip-${++id_counter}`
    bubble.textContent = text
    if (this.shortcut) {
      const hint = document.createElement('span')
      hint.className = 'es-tooltip__shortcut'
      hint.setAttribute('aria-hidden', 'true')
      for (const key of shortcut_keys(this.shortcut)) {
        const kbd = document.createElement('kbd')
        kbd.textContent = key
        hint.appendChild(kbd)
      }
      bubble.appendChild(hint)
    }
    const plain = bubble.classList.contains('es-tooltip--plain')
    if (!plain) {
      const arrow = document.createElement('span')
      arrow.className = 'es-tooltip__arrow'
      bubble.appendChild(arrow)
    }
    document.body.appendChild(bubble)
    const anchor = this.trigger_el.getBoundingClientRect()
    place(bubble, anchor, this.side, this.align, this.offset)
    if (!plain) point_arrow(bubble, anchor)
    bubble.setAttribute('data-state', 'open')
    this.trigger_el.setAttribute('aria-describedby', bubble.id)
    this.bubble = bubble
  }
  hide(this: any) {
    clearTimeout(this.show_timer)
    if (!this.bubble) return
    if (visible === this) visible = null
    last_hidden_at = Date.now()
    this.trigger_el.removeAttribute('aria-describedby')
    const bubble = this.bubble
    this.bubble = null
    bubble.setAttribute('data-state', 'closed')
    setTimeout(() => bubble.remove(), EXIT_MS + 50)
  }
  set_text(this: any, text?: any) {
    this.text = text || ''
    if (this.bubble) this.bubble.childNodes[0].nodeValue = this.text
  }
  destroy(this: any) {
    this.hide()
    if (!this.trigger_el) return
    this.trigger_el.removeEventListener('pointerenter', this.onenter)
    this.trigger_el.removeEventListener('pointerleave', this.onleave)
    this.trigger_el.removeEventListener('focus', this.onfocus)
    this.trigger_el.removeEventListener('blur', this.onblur)
    this.trigger_el.removeEventListener('pointerdown', this.ondown)
    this.trigger_el.removeEventListener('keydown', this.ondown)
  }
  static delegate(root?: any, selector?: any, opts: any = {}) {
    root = $(root)[0]
    let current: any = null
    const release = () => {
      current?.destroy()
      current = null
    }
    const claim = (el?: any, from_keyboard?: any) => {
      if (current?.trigger_el === el) return
      release()
      current = new Tooltip(el, opts)
      if (from_keyboard) current.schedule(0)
      else current.onenter()
    }
    const match = (e?: any) => {
      const hit = e.target?.closest?.(selector)
      return hit && root.contains(hit) ? hit : null
    }
    const onover = (e?: any) => {
      const hit = match(e)
      if (hit) claim(hit, false)
      else if (current && !current.trigger_el.contains(e.target)) release()
    }
    const onout = (e?: any) => {
      if (current && !current.trigger_el.contains(e.relatedTarget)) release()
    }
    const onfocus = (e?: any) => {
      const hit = match(e)
      if (hit?.matches(':focus-visible')) claim(hit, true)
    }
    root.addEventListener('pointerover', onover)
    root.addEventListener('pointerout', onout)
    root.addEventListener('focusin', onfocus)
    root.addEventListener('focusout', release)
    return () => {
      release()
      root.removeEventListener('pointerover', onover)
      root.removeEventListener('pointerout', onout)
      root.removeEventListener('focusin', onfocus)
      root.removeEventListener('focusout', release)
    }
  }
}
frappe.ui.tooltip = function (trigger?: any, opts: any = {}) {
  const tooltip = new frappe.ui.Tooltip(trigger, opts)
  const $trigger = $(trigger)
  $trigger.data('es-tooltip', tooltip)
  return $trigger
}
export default frappe.ui.tooltip
