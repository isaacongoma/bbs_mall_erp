import { frappe } from '@/shared/frappe/runtime'
frappe.logout = function () {
  frappe.call({
    method: 'logout',
    callback: function (r?: any) {
      if (r.exc) {
        return
      }
      window.location.href = '/login'
    },
  })
}
