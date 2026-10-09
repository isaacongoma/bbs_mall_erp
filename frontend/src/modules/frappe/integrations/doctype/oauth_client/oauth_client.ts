import { frappe } from '@/shared/frappe'
frappe.ui.form.on('OAuth Client', {
  refresh: function () {},
})
