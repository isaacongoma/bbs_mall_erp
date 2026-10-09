import { $, __, cstr, erpnext, frappe, locals } from '@/shared/frappe'
frappe.provide('erpnext.queries')
$.extend(erpnext.queries, {
  user: function () {
    return { query: 'frappe.core.doctype.user.user.user_query' }
  },
  lead: function () {
    return { query: 'erpnext.controllers.queries.lead_query' }
  },
  party: function (doc?: any) {
    return {
      query: 'erpnext.controllers.queries.party_query',
      filters: { disabled: 0, company: doc.company },
    }
  },
  customer: function (doc?: any) {
    return erpnext.queries.party(doc)
  },
  supplier: function (doc?: any) {
    return erpnext.queries.party(doc)
  },
  item: function (filters?: any) {
    let args: any = { query: 'erpnext.controllers.queries.item_query' }
    if (filters) args['filters'] = filters
    return args
  },
  bom: function () {
    return { query: 'erpnext.controllers.queries.bom' }
  },
  task: function () {
    return { query: 'erpnext.projects.utils.query_task' }
  },
  alert_missing_field: function (frm?: any, doc?: any, fieldname?: any) {
    frm?.scroll_to_field(fieldname)
    frappe.show_alert({
      message: __('Please set {0} first.', [frappe.meta.get_translated_label(doc.doctype, fieldname, doc.name)]),
      indicator: 'orange',
    })
  },
  customer_filter: function (doc?: any, _cdt?: any, _cdn?: any, frm?: any) {
    if (!doc.customer) {
      erpnext.queries.alert_missing_field(frm, doc, 'customer')
    }
    return { filters: { customer: doc.customer } }
  },
  contact_query: function (doc?: any, _cdt?: any, _cdn?: any, frm?: any) {
    if (frappe.dynamic_link) {
      if (!doc[frappe.dynamic_link.fieldname]) {
        erpnext.queries.alert_missing_field(frm, doc, frappe.dynamic_link.fieldname)
      }
      return {
        query: 'frappe.contacts.doctype.contact.contact.contact_query',
        filters: {
          link_doctype: frappe.dynamic_link.doctype,
          link_name: doc[frappe.dynamic_link.fieldname],
        },
      }
    }
  },
  company_contact_query: function (doc?: any) {
    if (!doc.company) {
      frappe.throw(__('Please set {0}', [frappe.meta.get_translated_label(doc.doctype, 'company', doc.name)]))
    }
    return {
      query: 'frappe.contacts.doctype.contact.contact.contact_query',
      filters: { link_doctype: 'Company', link_name: doc.company },
    }
  },
  address_query: function (doc?: any, _cdt?: any, _cdn?: any, frm?: any) {
    if (frappe.dynamic_link) {
      if (!doc[frappe.dynamic_link.fieldname]) {
        erpnext.queries.alert_missing_field(frm, doc, frappe.dynamic_link.fieldname)
      }
      return {
        query: 'frappe.contacts.doctype.address.address.address_query',
        filters: {
          link_doctype: frappe.dynamic_link.doctype,
          link_name: doc[frappe.dynamic_link.fieldname],
        },
      }
    }
  },
  company_address_query: function (doc?: any, _cdt?: any, _cdn?: any, frm?: any) {
    if (!doc.company) {
      erpnext.queries.alert_missing_field(frm, doc, 'company')
    }
    let filters: any = { link_doctype: 'Company', link_name: doc.company || '' }
    const is_drop_ship = doc.items.some((item?: any) => item.delivered_by_supplier)
    if (is_drop_ship) filters = {}
    return {
      query: 'frappe.contacts.doctype.address.address.address_query',
      filters: filters,
    }
  },
  dispatch_address_query: function (doc?: any) {
    let filters: any = { link_doctype: 'Company', link_name: doc.company || '' }
    const is_drop_ship = doc.items.some((item?: any) => item.delivered_by_supplier)
    if (is_drop_ship) filters = {}
    return {
      query: 'frappe.contacts.doctype.address.address.address_query',
      filters: filters,
    }
  },
  supplier_filter: function (doc?: any, _cdt?: any, _cdn?: any, frm?: any) {
    if (!doc.supplier) {
      erpnext.queries.alert_missing_field(frm, doc, 'supplier')
    }
    return { filters: { supplier: doc.supplier } }
  },
  lead_filter: function (doc?: any, _cdt?: any, _cdn?: any, frm?: any) {
    if (!doc.lead) {
      frm?.scroll_to_field('lead')
      frappe.show_alert({
        message: __('Please specify a {0} first.', [frappe.meta.get_translated_label(doc.doctype, 'lead', doc.name)]),
        indicator: 'orange',
      })
    }
    return { filters: { lead: doc.lead } }
  },
  not_a_group_filter: function () {
    return { filters: { is_group: 0 } }
  },
  employee: function () {
    return { query: 'erpnext.controllers.queries.employee_query' }
  },
  warehouse: function (doc?: any) {
    return {
      filters: [
        ['Warehouse', 'company', 'in', ['', cstr(doc.company)]],
        ['Warehouse', 'is_group', '=', 0],
      ],
    }
  },
  get_filtered_dimensions: function (doc?: any, child_fields?: any, dimension?: any, company?: any) {
    let account = ''
    child_fields.forEach((field?: any) => {
      if (!account) {
        account = doc[field]
      }
    })
    return {
      query: 'erpnext.controllers.queries.get_filtered_dimensions',
      filters: {
        dimension: dimension,
        account: account,
        company: company,
      },
    }
  },
})
erpnext.queries.setup_queries = function (this: any, frm?: any, options?: any, query_fn?: any) {
  let set_query = function (doctype?: any, parentfield?: any) {
    let link_fields = frappe.meta.get_docfields(doctype, frm.doc.name, {
      fieldtype: 'Link',
      options: options,
    })
    $.each(link_fields, function (_i?: any, df?: any) {
      if (parentfield) {
        frm.set_query(df.fieldname, parentfield, query_fn)
      } else {
        frm.set_query(df.fieldname, query_fn)
      }
    })
  }
  set_query(frm.doc.doctype)
  $.each(
    frappe.meta.get_docfields(frm.doc.doctype, frm.doc.name, { fieldtype: 'Table' }),
    function (_i?: any, df?: any) {
      set_query(df.options, df.fieldname)
    },
  )
}
erpnext.queries.setup_warehouse_query = function (frm?: any) {
  frm.set_query('warehouse', 'items', function (_doc?: any, cdt?: any, cdn?: any) {
    let row = locals[cdt][cdn]
    let filters = erpnext.queries.warehouse(frm.doc)
    if (row.item_code) {
      $.extend(filters, { query: 'erpnext.controllers.queries.warehouse_query' })
      filters['filters'].push(['Bin', 'item_code', '=', row.item_code])
    }
    return filters
  })
}
