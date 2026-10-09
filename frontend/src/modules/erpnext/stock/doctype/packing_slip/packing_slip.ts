import { __, erpnext, frappe } from '@/shared/frappe'
frappe.ui.form.on('Packing Slip', {
  setup: (frm?: any) => {
    frm.set_query('delivery_note', () => {
      return {
        filters: {
          docstatus: 0,
        },
      }
    })
    frm.set_query('item_code', 'items', (doc?: any) => {
      if (!doc.delivery_note) {
        frappe.throw(__('Please select a Delivery Note'))
      } else {
        return {
          query: 'erpnext.stock.doctype.packing_slip.packing_slip.item_details',
          filters: {
            delivery_note: doc.delivery_note,
          },
        }
      }
    })
  },
  refresh: (frm?: any) => {
    frm.toggle_display('misc_details', frm.doc.amended_from)
  },
  delivery_note: (frm?: any) => {
    frm.set_value('items', null)
    if (frm.doc.delivery_note) {
      erpnext.utils.map_current_doc({
        method: 'erpnext.stock.doctype.delivery_note.mapper.make_packing_slip',
        source_name: frm.doc.delivery_note,
        target: frm,
        freeze: true,
        freeze_message: __('Creating Packing Slip ...'),
      })
    }
  },
})
