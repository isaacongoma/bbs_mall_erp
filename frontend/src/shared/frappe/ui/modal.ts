import { $ } from '../runtime'

type AnyRecord = Record<string, any>
type Listener = () => void

const open = new Set<HTMLElement>()
const listeners = new Set<Listener>()
let version = 0
let counter = 0

function notify(): void {
  version += 1
  for (const listener of [...listeners]) listener()
}

export function subscribeModals(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function modalVersion(): number {
  return version
}

export function openModals(): HTMLElement[] {
  return [...open]
}

export function dialogOf(element: HTMLElement): AnyRecord | undefined {
  return $(element).data('frappe-dialog') as AnyRecord | undefined
}

export function touchModals(): void {
  notify()
}

function show(element: HTMLElement): void {
  if (open.has(element)) return
  const wrapper = $(element)
  if (!element.getAttribute('data-modal-key')) {
    counter += 1
    element.setAttribute('data-modal-key', `modal-${counter}`)
  }
  wrapper.trigger('show.bs.modal')
  open.add(element)
  notify()
  wrapper.trigger('shown.bs.modal')
}

function hide(element: HTMLElement): void {
  if (!open.has(element)) return
  const wrapper = $(element)
  wrapper.trigger('hide.bs.modal')
  open.delete(element)
  notify()
  wrapper.trigger('hidden.bs.modal')
}

export function installModalPlugin(): void {
  const fn = $.fn as AnyRecord
  fn.modal = function (this: JQuery, action?: string | AnyRecord) {
    return this.each((_index: number, element: HTMLElement) => {
      if (action && typeof action === 'object') {
        $(element).data('modal-options', action)
        return
      }
      if (action === 'show') show(element)
      else if (action === 'hide') hide(element)
      else if (action === 'toggle') (open.has(element) ? hide : show)(element)
    })
  }
  fn.tooltip = function (this: JQuery) {
    return this
  }
  fn.popover = function (this: JQuery) {
    return this
  }
  fn.dropdown = function (this: JQuery) {
    return this
  }
  fn.collapse = function (this: JQuery) {
    return this
  }
  fn.tab = function (this: JQuery) {
    return this
  }
}
