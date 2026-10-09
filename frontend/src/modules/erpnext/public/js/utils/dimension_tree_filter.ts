import { erpnext, frappe, locals } from '@/shared/frappe'
frappe.provide('erpnext.accounts')
erpnext.accounts.dimensions = {
  setup_dimension_filters(this: any, frm?: any, doctype?: any) {
    this.accounting_dimensions = []
    this.default_dimensions = {}
    this.fetch_custom_dimensions(frm, doctype)
  },
  fetch_custom_dimensions(this: any, frm?: any, doctype?: any) {
    let me = this
    frappe.call({
      method: 'erpnext.accounts.doctype.accounting_dimension.accounting_dimension.get_dimensions',
      args: {
        with_cost_center_and_project: true,
      },
      callback: function (r?: any) {
        me.accounting_dimensions = r.message[0]
        me.accounting_dimensions = me.accounting_dimensions.filter((x?: any) => {
          return x.document_type != 'Project'
        })
        me.default_dimensions = r.message[1]
        me.setup_filters(frm, doctype)
        me.update_dimension(frm, doctype)
      },
    })
  },
  setup_filters(this: any, frm?: any, doctype?: any) {
    if (doctype == 'Payment Entry' && this.accounting_dimensions) {
      frm.dimension_filters = this.accounting_dimensions
    }
    if (this.accounting_dimensions) {
      this.accounting_dimensions.forEach((dimension?: any) => {
        frappe.model.with_doctype(dimension['document_type'], () => {
          let parent_fields: any = []
          frappe.meta.get_docfields(doctype).forEach((df?: any) => {
            if (df.fieldtype === 'Link' && df.options === 'Account') {
              parent_fields.push(df.fieldname)
            } else if (df.fieldtype === 'Table') {
              this.setup_child_filters(frm, df.options, df.fieldname, dimension['fieldname'])
            }
            if (frappe.meta.has_field(doctype, dimension['fieldname'])) {
              this.setup_account_filters(frm, dimension['fieldname'], parent_fields)
            }
          })
        })
      })
    }
  },
  setup_child_filters(frm?: any, doctype?: any, parentfield?: any, dimension?: any) {
    let fields: any = []
    if (frappe.meta.has_field(doctype, dimension)) {
      frappe.model.with_doctype(doctype, () => {
        frappe.meta.get_docfields(doctype).forEach((df?: any) => {
          if (df.fieldtype === 'Link' && df.options === 'Account') {
            fields.push(df.fieldname)
          }
        })
        frm.set_query(dimension, parentfield, function (doc?: any, cdt?: any, cdn?: any) {
          let row = locals[cdt][cdn]
          return erpnext.queries.get_filtered_dimensions(row, fields, dimension, doc.company)
        })
      })
    }
  },
  setup_account_filters(frm?: any, dimension?: any, fields?: any) {
    frm.set_query(dimension, function (doc?: any) {
      return erpnext.queries.get_filtered_dimensions(doc, fields, dimension, doc.company)
    })
  },
  update_dimension(this: any, frm?: any, doctype?: any) {
    if (!this.accounting_dimensions || !frm.is_new() || !frm.doc.company || !this.default_dimensions?.[frm.doc.company])
      return
    if (frm.doc.__onload?.load_after_mapping) {
      for (const dimension of this.accounting_dimensions) {
        if (frm.doc[dimension['fieldname']]) return
      }
    }
    this.accounting_dimensions.forEach((dimension?: any) => {
      const default_dimension = this.default_dimensions[frm.doc.company][dimension['fieldname']]
      if (!default_dimension) return
      if (frappe.meta.has_field(doctype, dimension['fieldname'])) {
        frm.set_value(dimension['fieldname'], default_dimension)
      }
      ;(frm.doc.items || frm.doc.accounts || []).forEach((row?: any) => {
        frappe.model.set_value(row.doctype, row.name, dimension['fieldname'], default_dimension)
      })
    })
  },
  copy_dimension_from_first_row(this: any, frm?: any, cdt?: any, cdn?: any, fieldname?: any) {
    if (frappe.meta.has_field(frm.doctype, fieldname) && this.accounting_dimensions) {
      this.accounting_dimensions.forEach((dimension?: any) => {
        let row = frappe.get_doc(cdt, cdn)
        frm.script_manager.copy_from_first_row(fieldname, row, [dimension['fieldname']])
      })
    }
  },
}
