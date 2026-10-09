import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Document Naming Settings', {
  setup: function (frm?: any) {
    frm.set_query('document_type', 'amend_naming_override', () => {
      return {
        filters: {
          is_submittable: 1,
        },
      }
    })
  },
  refresh: function (frm?: any) {
    frm.trigger('setup_transaction_autocomplete')
    frm.disable_save()
  },
  setup_transaction_autocomplete: function (frm?: any) {
    frappe.call({
      method: 'get_transactions_and_prefixes',
      doc: frm.doc,
      callback: function (r?: any) {
        frm.fields_dict.transaction_type.set_data(r.message.transactions)
        frm.fields_dict.prefix.set_data(r.message.prefixes)
      },
    })
  },
  transaction_type: function (frm?: any) {
    frm.set_value('user_must_always_select', 0)
    frappe.call({
      method: 'get_options',
      doc: frm.doc,
      callback: function (r?: any) {
        frm.set_value('naming_series_options', r.message)
        if (r.message && r.message.split('\n')[0] == '') frm.set_value('user_must_always_select', 1)
      },
    })
  },
  prefix: function (frm?: any) {
    frappe.call({
      method: 'get_current',
      doc: frm.doc,
      callback: function () {
        frm.refresh_field('current_value')
      },
    })
  },
  update: function (frm?: any) {
    frappe.call({
      method: 'update_series',
      doc: frm.doc,
      freeze: true,
      freeze_msg: __('Updating naming series options'),
      callback: function () {
        frm.trigger('setup_transaction_autocomplete')
        frm.trigger('transaction_type')
      },
    })
  },
  try_naming_series(frm?: any) {
    frappe.call({
      method: 'preview_series',
      doc: frm.doc,
      callback: function (r?: any) {
        if (!r.exc) {
          frm.set_value('series_preview', r.message)
        } else {
          frm.set_value('series_preview', __('Failed to generate preview of series'))
        }
      },
    })
  },
})
