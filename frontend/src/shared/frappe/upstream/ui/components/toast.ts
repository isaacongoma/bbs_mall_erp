import { $, __, frappe } from '@/shared/frappe/runtime'
import { validated } from './utils.js'
frappe.provide('frappe.ui')
const TYPES: any = ['message', 'info', 'success', 'warning', 'error']
const TYPE_ICONS: any = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  error: 'circle-x',
}
const active = new Map()
function get_container() {
  let container = document.querySelector('.es-toast-container')
  if (!container) {
    container = $('<div class="es-toast-container"></div>').appendTo('body')[0]
  }
  return $(container)
}
function render_content($el?: any, opts?: any) {
  const escape = frappe.utils.escape_html
  const type = validated(opts.type, TYPES, 'type', 'toast') || 'message'
  $el.attr('data-type', type)
  $el.attr('role', type === 'error' ? 'alert' : 'status')
  const icon_name = opts.icon || TYPE_ICONS[type]
  const icon = opts.loading
    ? '<span class="es-spinner" aria-hidden="true"></span>'
    : icon_name
      ? frappe.utils.icon(icon_name, 'sm', '', '', escape(opts.icon_class || ''), true)
      : ''
  const description = opts.description ? `<div class="es-toast__description">${escape(opts.description)}</div>` : ''
  const action = opts.action
    ? `<button class="es-toast__action" type="button">${escape(opts.action.label)}</button>`
    : ''
  const close =
    opts.closable === false
      ? ''
      : `<button class="es-toast__close close" type="button" aria-label="${escape(__('Close'))}">${frappe.utils.icon('x', 'sm', '', '', '', true)}</button>`
  $el.html(
    `${icon}<div class="es-toast__content"><div class="es-toast__message">${escape(opts.message || '')}</div>${description}</div>${action}${close}`,
  )
  if (opts.action && opts.action.onclick) {
    $el.find('.es-toast__action').on('click', opts.action.onclick)
  }
}
frappe.ui.toast = function (opts: any = {}) {
  const id = opts.id || frappe.utils.get_random(10)
  const existing = active.get(id)
  if (existing) {
    existing.set(opts)
    return existing.handle
  }
  const $el = $('<div class="es-toast"></div>')
  let timer: any = null
  const dismiss = () => {
    clearTimeout(timer)
    active.delete(id)
    $el.addClass('es-toast--out')
    setTimeout(() => $el.remove(), 250)
  }
  const start_timer = (duration?: any) => {
    clearTimeout(timer)
    if (duration > 0) timer = setTimeout(dismiss, duration)
  }
  const set = (new_opts?: any) => {
    render_content($el, new_opts)
    $el.find('.es-toast__close').on('click', dismiss)
    start_timer(new_opts.duration == null ? 5000 : new_opts.duration)
  }
  let current_opts = opts
  const current_duration = () => (current_opts.duration == null ? 5000 : current_opts.duration)
  $el.on('mouseenter focusin', () => clearTimeout(timer))
  $el.on('mouseleave focusout', () => start_timer(current_duration()))
  const handle: any = {
    id,
    $el,
    dismiss,
    update: (new_opts?: any) => {
      current_opts = { ...current_opts, ...new_opts }
      set(current_opts)
    },
  }
  active.set(id, { handle, set: handle.update })
  set(current_opts)
  $el.appendTo(get_container())
  return handle
}
frappe.ui.toast.promise = function (promise?: any, messages: any = {}) {
  const handle = frappe.ui.toast({
    message: messages.loading || __('Working...'),
    loading: true,
    closable: false,
    duration: 0,
  })
  const text = (value?: any, result?: any) => (typeof value === 'function' ? value(result) : value)
  const settle = (message?: any, type?: any) =>
    handle.update({
      message,
      type,
      loading: false,
      closable: true,
      duration: messages.duration == null ? 5000 : messages.duration,
    })
  promise.then(
    (result?: any) => settle(text(messages.success, result) || __('Done'), 'success'),
    (err?: any) => settle(text(messages.error, err) || __('Something went wrong'), 'error'),
  )
  return promise
}
export default frappe.ui.toast
