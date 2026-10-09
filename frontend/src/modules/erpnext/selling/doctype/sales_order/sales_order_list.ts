import { __, erpnext, flt, frappe } from '@/shared/frappe'
frappe.listview_settings['Sales Order'] = {
  add_fields: [
    'base_grand_total',
    'customer_name',
    'currency',
    'delivery_date',
    'per_delivered',
    'per_billed',
    'status',
    'advance_payment_status',
    'order_type',
    'skip_delivery_note',
    'name',
  ],
  get_indicator: function (doc?: any) {
    if (doc.status === 'Closed') {
      return [__('Closed'), 'green', 'status,=,Closed']
    } else if (doc.status === 'On Hold') {
      return [__('On Hold'), 'orange', 'status,=,On Hold']
    } else if (doc.status === 'Completed') {
      return [__('Completed'), 'green', 'status,=,Completed']
    } else if (doc.advance_payment_status === 'Requested') {
      return [__('To Pay'), 'gray', 'advance_payment_status,=,Requested']
    } else if (flt(doc.per_delivered) < 100 && !doc.skip_delivery_note) {
      if (frappe.datetime.get_diff(doc.delivery_date) < 0) {
        return [__('Overdue'), 'red', 'per_delivered,<,100|delivery_date,<,Today|status,!=,Closed|docstatus,=,1']
      } else if (flt(doc.grand_total) === 0) {
        return [__('To Deliver'), 'orange', 'per_delivered,<,100|grand_total,=,0|status,!=,Closed|docstatus,=,1']
      } else if (flt(doc.per_billed) < 100) {
        return [__('To Deliver and Bill'), 'orange', 'per_delivered,<,100|per_billed,<,100|status,!=,Closed']
      } else {
        return [__('To Deliver'), 'orange', 'per_delivered,<,100|per_billed,=,100|status,!=,Closed']
      }
    } else if (
      (flt(doc.per_delivered) === 100 || doc.skip_delivery_note) &&
      flt(doc.grand_total) !== 0 &&
      flt(doc.per_billed) < 100
    ) {
      return [__('To Bill'), 'orange', 'per_delivered,=,100|per_billed,<,100|status,!=,Closed']
    }
  },
  onload: function (listview?: any) {
    const method = 'erpnext.selling.doctype.sales_order.sales_order.close_or_unclose_sales_orders'
    listview.page.add_action_item(__('Close'), function () {
      listview.call_for_selected_items(method, { status: 'Closed' })
    })
    listview.page.add_action_item(__('Re-open'), function () {
      listview.call_for_selected_items(method, { status: 'Submitted' })
    })
    if (frappe.model.can_create('Sales Invoice')) {
      listview.page.add_action_item(__('Sales Invoice'), () => {
        erpnext.bulk_transaction_processing.create(listview, 'Sales Order', 'Sales Invoice')
      })
    }
    if (frappe.model.can_create('Delivery Note')) {
      listview.page.add_action_item(__('Delivery Note'), () => {
        frappe.call({
          method:
            'erpnext.selling.doctype.sales_order.sales_order.is_enable_cutoff_date_on_bulk_delivery_note_creation',
          callback: (r?: any) => {
            let dialog: any
            if (r.message) {
              dialog = new frappe.ui.Dialog({
                title: __('Select Items up to Delivery Date'),
                fields: [
                  {
                    fieldtype: 'Date',
                    fieldname: 'delivery_date',
                    default: frappe.datetime.add_days(frappe.datetime.nowdate(), 1),
                  },
                ],
              })
              dialog.set_primary_action(__('Select'), function (values?: any) {
                const until_delivery_date = values.delivery_date
                erpnext.bulk_transaction_processing.create(listview, 'Sales Order', 'Delivery Note', {
                  until_delivery_date,
                })
                dialog.hide()
              })
              dialog.show()
            } else {
              erpnext.bulk_transaction_processing.create(listview, 'Sales Order', 'Delivery Note')
            }
          },
        })
      })
    }
    if (frappe.model.can_create('Payment Entry')) {
      listview.page.add_action_item(__('Advance Payment'), () => {
        erpnext.bulk_transaction_processing.create(listview, 'Sales Order', 'Payment Entry')
      })
    }
  },
}
