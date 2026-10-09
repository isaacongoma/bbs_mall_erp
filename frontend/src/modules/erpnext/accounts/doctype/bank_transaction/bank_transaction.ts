import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Bank Transaction', {
  setup: function (frm?: any) {
    frm.set_query('party_type', function () {
      return {
        filters: {
          name: ['in', Object.keys(frappe.boot.party_account_types)],
        },
      }
    })
    frm.set_query('bank_account', function () {
      return {
        filters: { is_company_account: 1 },
      }
    })
    frm.set_query('payment_document', 'payment_entries', function () {
      const payment_doctypes = frm.events.get_payment_doctypes(frm)
      return {
        filters: {
          name: ['in', payment_doctypes],
        },
      }
    })
    frm.set_query('payment_entry', 'payment_entries', function () {
      return {
        filters: {
          docstatus: ['!=', 2],
        },
      }
    })
  },
  refresh(frm?: any) {
    if (!frm.is_dirty() && frm.doc.payment_entries.length > 0) {
      frm.add_custom_button(__('Unreconcile Transaction'), () => {
        frm.call('remove_payment_entries').then(() => frm.refresh())
      })
    }
  },
  bank_account: function (frm?: any) {
    set_bank_statement_filter(frm)
  },
  get_payment_doctypes: function () {
    return ['Payment Entry', 'Journal Entry', 'Sales Invoice', 'Purchase Invoice', 'Bank Transaction']
  },
})
function set_bank_statement_filter(frm?: any) {
  frm.set_query('bank_statement', function () {
    return {
      filters: {
        bank_account: frm.doc.bank_account,
      },
    }
  })
}
