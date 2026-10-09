import { frappe } from '@/shared/frappe'
frappe.ui.form.on('OAuth Bearer Token', {
  refresh: function () {},
})
