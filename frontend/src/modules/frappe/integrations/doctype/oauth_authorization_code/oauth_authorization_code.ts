import { frappe } from '@/shared/frappe'
frappe.ui.form.on('OAuth Authorization Code', {
  refresh: function () {},
})
