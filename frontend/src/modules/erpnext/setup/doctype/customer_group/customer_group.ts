import { __, frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Customer Group', {
  setup: function (frm?: any) {
    frm.set_query('parent_customer_group', function (doc?: any) {
      return {
        filters: {
          is_group: 1,
          name: ['!=', doc.customer_group_name],
        },
      }
    })
    frm.set_query('account', 'accounts', function (_doc?: any, cdt?: any, cdn?: any) {
      return {
        filters: {
          root_type: 'Asset',
          account_type: 'Receivable',
          company: locals[cdt][cdn].company,
          is_group: 0,
        },
      }
    })
    frm.set_query('advance_account', 'accounts', function (_doc?: any, cdt?: any, cdn?: any) {
      return {
        filters: {
          root_type: 'Liability',
          account_type: 'Receivable',
          company: locals[cdt][cdn].company,
          is_group: 0,
        },
      }
    })
  },
  refresh: function (frm?: any) {
    frm.trigger('set_root_readonly')
  },
  set_root_readonly: function (frm?: any) {
    if (!frm.doc.parent_customer_group && !frm.doc.__islocal) {
      frm.set_read_only()
      frm.set_intro(__('This is a root customer group and cannot be edited.'))
    } else {
      frm.set_intro(null)
    }
  },
})
