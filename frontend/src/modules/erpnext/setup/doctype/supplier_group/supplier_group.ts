import { __, frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Supplier Group', {
  setup: function (frm?: any) {
    frm.set_query('parent_supplier_group', function (doc?: any) {
      return {
        filters: {
          is_group: 1,
          name: ['!=', doc.supplier_group_name],
        },
      }
    })
    frm.set_query('account', 'accounts', function (_doc?: any, cdt?: any, cdn?: any) {
      return {
        filters: {
          root_type: 'Liability',
          account_type: 'Payable',
          company: locals[cdt][cdn].company,
          is_group: 0,
        },
      }
    })
    frm.set_query('advance_account', 'accounts', function (_doc?: any, cdt?: any, cdn?: any) {
      return {
        filters: {
          root_type: 'Asset',
          account_type: 'Payable',
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
    if (!frm.doc.parent_supplier_group && !frm.is_new()) {
      frm.set_read_only()
      frm.set_intro(__('This is a root supplier group and cannot be edited.'))
    } else {
      frm.set_intro(null)
    }
  },
})
