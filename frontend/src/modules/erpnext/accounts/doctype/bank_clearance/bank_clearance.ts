import { __, frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Bank Clearance', {
  setup: function (frm?: any) {
    frm.add_fetch('account', 'account_currency', 'account_currency')
    frm.set_query('account', function () {
      return {
        filters: {
          account_type: ['in', ['Bank', 'Cash']],
          is_group: 0,
        },
      }
    })
    frm.set_query('bank_account', function () {
      return {
        filters: {
          is_company_account: 1,
        },
      }
    })
  },
  onload: function (frm?: any) {
    const default_bank_account = frappe.defaults.get_user_default('Company')
      ? locals[':Company'][frappe.defaults.get_user_default('Company')]['default_bank_account']
      : ''
    frm.set_value('account', default_bank_account)
    frm.set_value('from_date', frappe.datetime.month_start())
    frm.set_value('to_date', frappe.datetime.month_end())
  },
  refresh: function (frm?: any) {
    frm.disable_save()
    frm.add_custom_button(__('Get Payment Entries'), () => frm.trigger('get_payment_entries'))
    frm.change_custom_button_type(__('Get Payment Entries'), null, 'primary')
    if (frm.doc.payment_entries.length) {
      frm.add_custom_button(__('Update Clearance Date'), () => frm.trigger('update_clearance_date'))
      frm.change_custom_button_type(__('Get Payment Entries'), null, 'default')
      frm.change_custom_button_type(__('Update Clearance Date'), null, 'primary')
    }
  },
  update_clearance_date: function (frm?: any) {
    return frappe.call({
      method: 'update_clearance_date',
      doc: frm.doc,
      callback: function () {
        frm.refresh()
      },
    })
  },
  get_payment_entries: function (frm?: any) {
    return frappe.call({
      method: 'get_payment_entries',
      doc: frm.doc,
      callback: function () {
        frm.refresh()
      },
    })
  },
})
