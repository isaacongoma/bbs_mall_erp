import { $, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.model.user_settings')
$.extend(frappe.model.user_settings, {
  get: function (doctype?: any) {
    return frappe
      .call('frappe.model.utils.user_settings.get', { doctype })
      .then((r?: any) => JSON.parse(r.message || '{}'))
  },
  save: function (this: any, doctype?: any, key?: any, value?: any) {
    if (frappe.session.user === 'Guest') return Promise.resolve()
    const old_user_settings = frappe.model.user_settings[doctype] || {}
    const new_user_settings = $.extend(true, {}, old_user_settings)
    if ($.isPlainObject(value)) {
      new_user_settings[key] = new_user_settings[key] || {}
      $.extend(new_user_settings[key], value)
    } else {
      new_user_settings[key] = value
    }
    const a = JSON.stringify(old_user_settings)
    const b = JSON.stringify(new_user_settings)
    if (a !== b) {
      return this.update(doctype, new_user_settings)
    }
    return Promise.resolve(new_user_settings)
  },
  remove: function (this: any, doctype?: any, key?: any) {
    let user_settings = frappe.model.user_settings[doctype] || {}
    delete user_settings[key]
    return this.update(doctype, user_settings)
  },
  update: function (doctype?: any, user_settings?: any) {
    if (frappe.session.user === 'Guest') return Promise.resolve()
    return frappe.call({
      method: 'frappe.model.utils.user_settings.save',
      args: {
        doctype: doctype,
        user_settings: user_settings,
      },
      callback: function (r?: any) {
        frappe.model.user_settings[doctype] = r.message
      },
    })
  },
})
frappe.get_user_settings = function (doctype?: any, key?: any) {
  let settings = frappe.model.user_settings[doctype] || {}
  if (key) {
    settings = settings[key] || {}
  }
  return settings
}
