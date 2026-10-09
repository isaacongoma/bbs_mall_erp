import { erpnext, frappe } from '@/shared/frappe'
frappe.ui.form.on('Subscription Plan', {
  price_determination: function (frm?: any) {
    frm.toggle_reqd('cost', frm.doc.price_determination === 'Fixed rate')
    frm.toggle_reqd('price_list', frm.doc.price_determination === 'Based on price list')
  },
  subscription_plan: function () {
    erpnext.utils.check_payments_app()
  },
})
