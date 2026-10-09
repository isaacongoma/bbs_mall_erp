import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Employee Onboarding Template', {
  setup: function (frm: any) {
    frm.set_query('department', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
  },
})
