import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Repost Payment Ledger', {
  setup: function (frm?: any) {
    frm.set_query('voucher_type', () => {
      return {
        filters: {
          name: ['in', ['Purchase Invoice', 'Sales Invoice', 'Payment Entry', 'Journal Entry']],
        },
      }
    })
    frm.fields_dict['repost_vouchers'].grid.get_field('voucher_type').get_query = function () {
      return {
        filters: {
          name: ['in', ['Purchase Invoice', 'Sales Invoice', 'Payment Entry', 'Journal Entry']],
        },
      }
    }
    frm.fields_dict['repost_vouchers'].grid.get_field('voucher_no').get_query = function (doc?: any) {
      if (doc.company) {
        return {
          filters: {
            company: doc.company,
            docstatus: 1,
          },
        }
      }
    }
  },
  refresh: function (frm?: any) {
    let btn_label: any
    if (frm.doc.docstatus == 1 && ['Queued', 'Failed'].find((x?: any) => x == frm.doc.repost_status)) {
      frm.set_intro(
        __(
          "Use 'Repost in background' button to trigger background job. Job can only be triggered when document is in Queued or Failed status.",
        ),
      )
      btn_label = __('Repost in background')
      frm.add_custom_button(btn_label, () => {
        frappe.call({
          method: 'erpnext.accounts.doctype.repost_payment_ledger.repost_payment_ledger.execute_repost_payment_ledger',
          args: {
            docname: frm.doc.name,
          },
        })
        frappe.msgprint(__('Reposting in the background.'))
      })
    }
  },
})
