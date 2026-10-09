import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Log Settings', {
  refresh: (frm?: any) => {
    frm.set_query('ref_doctype', 'logs_to_clear', () => {
      const added_doctypes = frm.doc.logs_to_clear.map((r?: any) => r.ref_doctype)
      return {
        query: 'frappe.core.doctype.log_settings.log_settings.get_log_doctypes',
        filters: [['name', 'not in', added_doctypes]],
      }
    })
  },
})
