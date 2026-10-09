import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Session Default Settings', {
  refresh: function (frm?: any) {
    frm.set_query('ref_doctype', 'session_defaults', function () {
      return {
        filters: {
          issingle: 0,
          istable: 0,
        },
      }
    })
  },
})
