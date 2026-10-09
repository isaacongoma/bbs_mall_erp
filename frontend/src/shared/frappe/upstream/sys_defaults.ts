import { $, cint, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.defaults')
Object.assign(frappe.defaults, {
  get_global_default: function (key?: any) {
    let d = frappe.sys_defaults[key]
    if ($.isArray(d)) d = d[0]
    return d
  },
  get_global_defaults: function (key?: any) {
    let d = frappe.sys_defaults[key]
    if (!$.isArray(d)) d = [d]
    return d
  },
  is_enabled: function (this: any, key?: any) {
    return cint(this.get_global_default(key)) === 1
  },
  get_default: function (this: any, key?: any) {
    return this.get_global_default(key)
  },
  get_user_default: function (this: any, key?: any) {
    return this.get_global_default(key)
  },
})
