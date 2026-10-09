import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Milestone Tracker', {
  refresh: function (frm?: any) {
    frm.trigger('update_options')
  },
  document_type: function (frm?: any) {
    frm.trigger('update_options')
  },
  update_options: function (frm?: any) {
    let doctype = frm.doc.document_type
    let track_fields: any = []
    if (doctype) {
      frappe.model.with_doctype(doctype, () => {
        frappe.get_meta(doctype).fields.map((df?: any) => {
          if (['Link', 'Select'].includes(df.fieldtype)) {
            track_fields.push({ label: df.label, value: df.fieldname })
          }
        })
        frm.set_df_property('track_field', 'options', track_fields)
      })
    } else {
      frm.set_df_property('track_field', 'options', [])
    }
  },
})
