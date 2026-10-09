import { __, erpnext, format_currency, frappe } from '@/shared/frappe'
frappe.provide('erpnext.accounts')
erpnext.accounts.ledger_preview = {
  show_accounting_ledger_preview(this: any, frm?: any) {
    let me = this
    if (!frm.is_new() && frm.doc.docstatus == 0) {
      frm.add_custom_button(
        __('Accounting Ledger'),
        function () {
          frappe.call({
            type: 'GET',
            method: 'erpnext.controllers.stock_controller.show_accounting_ledger_preview',
            args: {
              company: frm.doc.company,
              doctype: frm.doc.doctype,
              docname: frm.doc.name,
            },
            callback: function (response?: any) {
              me.make_dialog(
                'Accounting Ledger Preview',
                'accounting_ledger_preview_html',
                response.message.gl_columns,
                response.message.gl_data,
              )
            },
          })
        },
        __('Preview'),
      )
    }
  },
  show_stock_ledger_preview(this: any, frm?: any) {
    let me = this
    if (!frm.is_new() && frm.doc.docstatus == 0) {
      frm.add_custom_button(
        __('Stock Ledger'),
        function () {
          frappe.call({
            type: 'GET',
            method: 'erpnext.controllers.stock_controller.show_stock_ledger_preview',
            args: {
              company: frm.doc.company,
              doctype: frm.doc.doctype,
              docname: frm.doc.name,
            },
            callback: function (response?: any) {
              me.make_dialog(
                'Stock Ledger Preview',
                'stock_ledger_preview_html',
                response.message.sl_columns,
                response.message.sl_data,
              )
            },
          })
        },
        __('Preview'),
      )
    }
  },
  make_dialog(this: any, label?: any, fieldname?: any, columns?: any, data?: any) {
    if (data.length === 0 && fieldname === 'accounting_ledger_preview_html') {
      frappe.msgprint('<strong>' + __('No Impact on Accounting Ledger') + '</strong>')
    } else {
      let me = this
      let dialog = new frappe.ui.Dialog({
        size: 'extra-large',
        title: __(label),
        fields: [
          {
            fieldtype: 'HTML',
            fieldname: fieldname,
          },
        ],
      })
      setTimeout(function () {
        me.get_datatable(columns, data, dialog.get_field(fieldname).wrapper)
      }, 200)
      dialog.show()
    }
  },
  get_datatable(columns?: any, data?: any, wrapper?: any) {
    columns.forEach((col?: any) => {
      if (col.fieldtype === 'Currency') {
        col.format = (value?: any) => {
          return format_currency(value, col.options)
        }
      }
    })
    const datatable_options: any = {
      columns: columns,
      data: data,
      dynamicRowHeight: true,
      checkboxColumn: false,
      inlineFilters: true,
    }
    new frappe.DataTable(wrapper, datatable_options)
  },
}
