import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Navbar Settings', {
  after_save: function () {
    frappe.ui.toolbar.clear_cache()
  },
})
