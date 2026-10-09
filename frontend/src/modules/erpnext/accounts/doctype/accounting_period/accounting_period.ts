import { frappe, refresh_field } from '@/shared/frappe'
frappe.ui.form.on('Accounting Period', {
  onload: function (frm?: any) {
    if (
      frm.doc.closed_documents.length === 0 ||
      (frm.doc.closed_documents.length === 1 && frm.doc.closed_documents[0].document_type == undefined)
    ) {
      frappe.call({
        method: 'get_doctypes_for_closing',
        doc: frm.doc,
        callback: function (r?: any) {
          if (r.message) {
            frm.clear_table('closed_documents')
            r.message.forEach(function (element?: any) {
              const c = frm.add_child('closed_documents')
              c.document_type = element.document_type
              c.closed = element.closed
            })
            refresh_field('closed_documents')
          }
        },
      })
    }
    frm.set_query('document_type', 'closed_documents', () => {
      return {
        query: 'erpnext.controllers.queries.get_doctypes_for_closing',
      }
    })
  },
})
