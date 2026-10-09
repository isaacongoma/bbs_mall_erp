import { $, frappe } from '@/shared/frappe/runtime'
import './sys_defaults.js'
Object.assign(frappe.defaults, {
  get_user_default: function (this: any, key?: any) {
    let defaults = frappe.boot.user.defaults
    let d = defaults[key]
    if (!d && frappe.defaults.is_a_user_permission_key(key)) {
      d = defaults[frappe.model.scrub(key)]
      let user_default = this.get_user_permission_default(key, defaults)
      if (user_default) d = user_default
    }
    if ($.isArray(d)) d = d[0]
    if (!frappe.defaults.in_user_permission(key, d)) {
      return
    }
    return d
  },
  get_user_permission_default: function (this: any, key?: any, defaults?: any) {
    let permissions = this.get_user_permissions()
    let user_default = null
    if (permissions[key]) {
      permissions[key].forEach((item?: any) => {
        if (defaults[key] == item.doc) {
          user_default = item.doc
        }
      })
      permissions[key].forEach((item?: any) => {
        if (item.is_default) {
          user_default = item.doc
        }
      })
    }
    return user_default
  },
  get_user_defaults: function (key?: any) {
    let defaults = frappe.boot.user.defaults
    let d = defaults[key]
    if (frappe.defaults.is_a_user_permission_key(key)) {
      if (d && $.isArray(d) && d.length === 1) {
        d = d[0]
      } else {
        d = defaults[key] || defaults[frappe.model.scrub(key)]
      }
    }
    if (!$.isArray(d)) d = [d]
    d = d.filter((item?: any) => frappe.defaults.in_user_permission(key, item))
    return d
  },
  set_user_default_local: function (key?: any, value?: any) {
    frappe.boot.user.defaults[key] = value
  },
  get_default: function (key?: any) {
    let defaults = frappe.boot.user.defaults
    let value = defaults[key]
    if (frappe.defaults.is_a_user_permission_key(key)) {
      if (value && $.isArray(value) && value.length === 1) {
        value = value[0]
      } else {
        value = defaults[frappe.model.scrub(key)]
      }
    }
    if (!frappe.defaults.in_user_permission(key, value)) {
      return
    }
    if (value) {
      try {
        return JSON.parse(value)
      } catch (e: any) {
        return value
      }
    }
  },
  is_a_user_permission_key: function (key?: any) {
    return key.indexOf(':') === -1 && key !== frappe.model.scrub(key)
  },
  in_user_permission: function (this: any, key?: any, value?: any) {
    let user_permission = this.get_user_permissions()[frappe.model.unscrub(key)]
    if (user_permission && user_permission.length) {
      return user_permission.some((perm?: any) => {
        return perm.doc === value
      })
    } else {
      return true
    }
  },
  get_user_permissions: function (this: any) {
    return this._user_permissions || {}
  },
  update_user_permissions: function (this: any) {
    const method = 'frappe.core.doctype.user_permission.user_permission.get_current_user_permissions'
    frappe.call(method).then((r?: any) => {
      if (r.message) {
        this._user_permissions = Object.assign({}, r.message)
      }
    })
  },
  load_user_permission_from_boot: function (this: any) {
    if (frappe.boot.user.user_permissions) {
      this._user_permissions = Object.assign({}, frappe.boot.user.user_permissions)
    } else {
      frappe.defaults.update_user_permissions()
    }
  },
})
