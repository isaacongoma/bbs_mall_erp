import { frappe, jQuery } from '@/shared/frappe/runtime'
frappe.provide('frappe.utils')
const EventEmitterMixin: any = {
  init(this: any) {
    this.jq = jQuery({})
  },
  trigger(this: any, evt?: any, data?: any) {
    !this.jq && this.init()
    this.jq.trigger(evt, data)
  },
  once(this: any, evt?: any, handler?: any) {
    !this.jq && this.init()
    this.jq.one(evt, (_e?: any, data?: any) => handler(data))
  },
  on(this: any, evt?: any, handler?: any) {
    !this.jq && this.init()
    this.jq.bind(evt, (_e?: any, data?: any) => handler(data))
  },
  off(this: any, evt?: any, handler?: any) {
    !this.jq && this.init()
    this.jq.unbind(evt, (_e?: any, data?: any) => handler(data))
  },
}
frappe.utils.make_event_emitter = function (object?: any) {
  Object.assign(object, EventEmitterMixin)
  return object
}
export default EventEmitterMixin
