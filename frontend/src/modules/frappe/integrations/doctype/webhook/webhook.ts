import { $, __, frappe, locals } from '@/shared/frappe'
frappe.webhook = {
  set_fieldname_select: (frm?: any) => {
    if (frm.doc.webhook_doctype) {
      frappe.model.with_doctype(frm.doc.webhook_doctype, () => {
        let fields = $.map(frappe.get_doc('DocType', frm.doc.webhook_doctype).fields, (d?: any) => {
          if (frappe.model.no_value_type.includes(d.fieldtype) && !frappe.model.table_fields.includes(d.fieldtype)) {
            return null
          } else {
            return {
              label: `${__(d.label, null, d.parent)} (${__(d.fieldtype)})`,
              value: d.fieldname,
            }
          }
        })
        for (let field of frappe.model.std_fields) {
          if (field.fieldname == 'name') {
            fields.unshift({ label: __('Name (Doc Name)'), value: 'name' })
          } else {
            fields.push({
              label: `${__(field.label, null, field.parent)} (${__(field.fieldtype)})`,
              value: field.fieldname,
            })
          }
        }
        frm.fields_dict.webhook_data.grid.update_docfield_property('fieldname', 'options', [''].concat(fields))
      })
    }
  },
  set_request_headers: (frm?: any) => {
    if (frm.doc.request_structure) {
      let header_value: any
      if (frm.doc.request_structure == 'Form URL-Encoded') {
        header_value = 'application/x-www-form-urlencoded'
      } else if (frm.doc.request_structure == 'JSON') {
        header_value = 'application/json'
      }
      if (header_value) {
        let header_row = (frm.doc.webhook_headers || []).find((row?: any) => row.key === 'Content-Type')
        if (header_row) {
          frappe.model.set_value(header_row.doctype, header_row.name, 'value', header_value)
        } else {
          frm.add_child('webhook_headers', {
            key: 'Content-Type',
            value: header_value,
          })
        }
        frm.refresh()
      }
    }
  },
}
frappe.ui.form.on('Webhook', {
  refresh: (frm?: any) => {
    frappe.webhook.set_fieldname_select(frm)
    frm.set_query('background_jobs_queue', 'frappe.integrations.doctype.webhook.webhook.get_all_queues')
    if (frm.doc.webhook_doctype) {
      frm.add_custom_button(__('Preview'), () => {
        const args: any = {
          doc: frm.doc,
          doctype: frm.doc.webhook_doctype,
          preview_fields: [
            {
              label: __('Meets Condition?'),
              fieldtype: 'Data',
              method: 'preview_meets_condition',
            },
            {
              label: __('Request Body'),
              fieldtype: 'Code',
              method: 'preview_request_body',
            },
          ],
        }
        let dialog = new frappe.views.RenderPreviewer(args)
        return dialog
      })
    }
  },
  request_structure: (frm?: any) => {
    frappe.webhook.set_request_headers(frm)
  },
  webhook_doctype: (frm?: any) => {
    frappe.webhook.set_fieldname_select(frm)
  },
  enable_security: (frm?: any) => {
    frm.toggle_reqd('webhook_secret', frm.doc.enable_security)
  },
})
frappe.ui.form.on('Webhook Data', {
  fieldname: (frm?: any, cdt?: any, cdn?: any) => {
    let row = locals[cdt][cdn]
    let df = frappe.get_meta(frm.doc.webhook_doctype).fields.filter((field?: any) => field.fieldname == row.fieldname)
    if (!df.length) {
      df = frappe.model.std_fields.filter((field?: any) => field.fieldname == row.fieldname)
    }
    row.key = df.length ? df[0].fieldname : 'name'
    frm.refresh_field('webhook_data')
  },
})
