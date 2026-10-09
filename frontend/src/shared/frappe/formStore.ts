import { frappe } from './runtime'

type AnyRecord = Record<string, any>
type Listener = () => void

const MUTATION_OPTIONS: MutationObserverInit = {
  subtree: true,
  childList: true,
  attributes: true,
  characterData: true,
}

const listeners = new Set<Listener>()
let version = 0
let scheduled = false

export function bumpForms(): void {
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => {
    scheduled = false
    version += 1
    for (const listener of [...listeners]) listener()
  })
}

export function subscribeForms(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function formsVersion(): number {
  return version
}

const observers = new WeakMap<Element, MutationObserver>()

export function observeElement(element: Element): void {
  if (observers.has(element) || typeof MutationObserver === 'undefined') return
  const observer = new MutationObserver(() => bumpForms())
  observer.observe(element, MUTATION_OPTIONS)
  observers.set(element, observer)
}

export function unobserveElement(element: Element): void {
  observers.get(element)?.disconnect()
  observers.delete(element)
}

let installed = false

export function installFormStore(): void {
  if (installed) return
  installed = true

  const trigger = frappe.model.trigger
  frappe.model.trigger = function (...args: unknown[]) {
    const result = trigger.apply(this, args)
    bumpForms()
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return (result as Promise<unknown>).then((value) => {
        bumpForms()
        return value
      })
    }
    return result
  }

  const setValue = frappe.model.set_value
  frappe.model.set_value = function (...args: unknown[]) {
    const result = setValue.apply(this, args)
    bumpForms()
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return (result as Promise<unknown>).then((value) => {
        bumpForms()
        return value
      })
    }
    return result
  }

  const refresh = frappe.ui.form.Form.prototype.refresh
  frappe.ui.form.Form.prototype.refresh = function (this: AnyRecord, ...args: unknown[]) {
    this.refresh_chain = undefined
    refresh.apply(this, args)
    bumpForms()
    return Promise.resolve(this.refresh_chain).then(() => bumpForms())
  }
}
