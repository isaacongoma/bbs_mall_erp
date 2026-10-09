import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Quick Stock Balance', {
  setup: (frm?: any) => {
    frm.set_query('item', () => {
      if (!(frm.doc.warehouse && frm.doc.date)) {
        frm.trigger('check_warehouse_and_date')
      }
    })
  },
  make_custom_stock_report_button: (frm?: any) => {
    if (frm.doc.item) {
      frm.add_custom_button(__('Stock Balance Report'), () => {
        frappe.set_route('query-report', 'Stock Balance', {
          item_code: frm.doc.item,
          warehouse: frm.doc.warehouse,
        })
      })
    }
  },
  refresh: (frm?: any) => {
    frm.disable_save()
    frm.trigger('make_custom_stock_report_button')
  },
  check_warehouse_and_date: (frm?: any) => {
    frappe.msgprint(__('Please enter Warehouse and Date'))
    frm.doc.item = ''
    frm.refresh()
  },
  warehouse: (frm?: any) => {
    if (frm.doc.item || frm.doc.item_barcode) {
      frm.trigger('get_stock_and_item_details')
    }
  },
  date: (frm?: any) => {
    if (frm.doc.item || frm.doc.item_barcode) {
      frm.trigger('get_stock_and_item_details')
    }
  },
  item: (frm?: any) => {
    frappe.flags.last_updated_element = 'item'
    frm.trigger('get_stock_and_item_details')
    frm.trigger('make_custom_stock_report_button')
  },
  item_barcode: (frm?: any) => {
    frappe.flags.last_updated_element = 'item_barcode'
    frm.trigger('get_stock_and_item_details')
    frm.trigger('make_custom_stock_report_button')
  },
  get_stock_and_item_details: (frm?: any) => {
    if (!(frm.doc.warehouse && frm.doc.date)) {
      frm.trigger('check_warehouse_and_date')
    } else if (frm.doc.item || frm.doc.item_barcode) {
      let filters: any = {
        warehouse: frm.doc.warehouse,
        date: frm.doc.date,
      }
      if (frappe.flags.last_updated_element === 'item') {
        filters = { ...filters, ...{ item: frm.doc.item } }
      } else {
        filters = { ...filters, ...{ barcode: frm.doc.item_barcode } }
      }
      frappe.call({
        method: 'erpnext.stock.doctype.quick_stock_balance.quick_stock_balance.get_stock_item_details',
        args: filters,
        callback: (r?: any) => {
          if (r.message) {
            const fields: any = ['item', 'qty', 'value', 'image']
            if (!r.message['barcodes'].includes(frm.doc.item_barcode)) {
              frm.doc.item_barcode = ''
              frm.refresh()
            }
            fields.forEach(function (field?: any) {
              frm.set_value(field, r.message[field])
            })
          }
        },
      })
    }
  },
})
