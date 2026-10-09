import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Unreconcile Payment', {
  refresh(frm?: any) {
    frm.set_query('voucher_type', function () {
      return {
        filters: {
          name: ['in', ['Payment Entry', 'Journal Entry']],
        },
      }
    })
    frm.set_query('voucher_no', function (doc?: any) {
      return {
        filters: {
          company: doc.company,
          docstatus: 1,
        },
      }
    })
  },
  get_allocations: function (frm?: any) {
    frm.clear_table('allocations')
    frappe.call({
      method: 'get_allocations_from_payment',
      doc: frm.doc,
      callback: function (r?: any) {
        if (r.message) {
          r.message.forEach((x?: any) => {
            frm.add_child('allocations', x)
          })
          frm.refresh_fields()
        }
      },
    })
  },
})
