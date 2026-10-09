import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Import Supplier Invoice', {
  onload: function (frm?: any) {
    frappe.realtime.on('import_invoice_update', function (data?: any) {
      frm.dashboard.show_progress(data.title, (data.count / data.total) * 100, data.message)
      if (data.count == data.total) {
        window.setTimeout((title?: any) => frm.dashboard.hide_progress(title), 1500, data.title)
      }
    })
  },
  setup: function (frm?: any) {
    frm.set_query('tax_account', function (doc?: any) {
      return {
        filters: {
          account_type: 'Tax',
          company: doc.company,
        },
      }
    })
    frm.set_query('default_buying_price_list', function (doc?: any) {
      return {
        filters: {
          currency: frappe.get_doc(':Company', doc.company).default_currency,
        },
      }
    })
  },
  refresh: function (frm?: any) {
    frm.trigger('toggle_read_only_fields')
  },
  toggle_read_only_fields: function (frm?: any) {
    if (['File Import Completed', 'Processing File Data'].includes(frm.doc.status)) {
      frm.set_read_only()
      frm.set_df_property('import_invoices', 'hidden', 1)
    } else {
      frm.set_df_property('import_invoices', 'hidden', 0)
    }
  },
})
