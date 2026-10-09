import { __, format_currency, frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Sales Person', {
  refresh: function (frm?: any) {
    if (frm.doc.__onload && frm.doc.__onload.dashboard_info) {
      const info = frm.doc.__onload.dashboard_info
      frm.dashboard.add_indicator(
        __('Total Contribution Amount Against Orders: {0}', [
          format_currency(info.allocated_amount_against_order, info.currency),
        ]),
        'blue',
      )
      frm.dashboard.add_indicator(
        __('Total Contribution Amount Against Invoices: {0}', [
          format_currency(info.allocated_amount_against_invoice, info.currency),
        ]),
        'blue',
      )
    }
    frm.trigger('set_root_readonly')
  },
  setup: function (frm?: any) {
    frm.fields_dict['targets'].grid.get_field('distribution_id').get_query = function (
      _doc?: any,
      cdt?: any,
      cdn?: any,
    ) {
      const row = locals[cdt][cdn]
      return {
        filters: {
          fiscal_year: row.fiscal_year,
        },
      }
    }
    frm.set_query('parent_sales_person', function (doc?: any) {
      return {
        filters: [
          ['Sales Person', 'is_group', '=', 1],
          ['Sales Person', 'name', '!=', doc.sales_person_name],
        ],
      }
    })
    frm.set_query('employee', function () {
      return { query: 'erpnext.controllers.queries.employee_query' }
    })
    frm.make_methods = {
      'Sales Order': () =>
        frappe.new_doc('Sales Order').then(() => frm.add_child('sales_team', { sales_person: frm.doc.name })),
    }
  },
  set_root_readonly: function (frm?: any) {
    if (!frm.doc.parent_sales_person && !frm.doc.__islocal) {
      frm.set_read_only()
      frm.set_intro(__('This is a root sales person and cannot be edited.'))
    } else {
      frm.set_intro(null)
    }
  },
})
