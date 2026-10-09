import { __, frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Territory', {
  setup: function (frm?: any) {
    frm.fields_dict['targets'].grid.get_field('distribution_id').get_query = function (
      _doc?: any,
      cdt?: any,
      cdn?: any,
    ) {
      const row = locals[cdt][cdn]
      return {
        filters: {
          fiscal_year: row.fiscal_year,
        },
      }
    }
    frm.set_query('parent_territory', function (doc?: any) {
      return {
        filters: [
          ['Territory', 'is_group', '=', 1],
          ['Territory', 'name', '!=', doc.territory_name],
        ],
      }
    })
  },
  refresh: function (frm?: any) {
    frm.trigger('set_root_readonly')
  },
  set_root_readonly: function (frm?: any) {
    if (!frm.doc.parent_territory && !frm.doc.__islocal) {
      frm.set_read_only()
      frm.set_intro(__('This is a root territory and cannot be edited.'))
    } else {
      frm.set_intro(null)
    }
  },
})
