import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Portal Settings', {
  setup: function (frm?: any) {
    frm.fields_dict['default_role'].get_query = function () {
      return {
        filters: {
          desk_access: 0,
          disabled: 0,
        },
      }
    }
  },
  onload: function (frm?: any) {
    frm.get_field('menu').grid.only_sortable()
  },
  refresh: function (frm?: any) {
    frm.add_custom_button(__('Reset'), function () {
      frappe.confirm(__('Restore to default settings?'), function () {
        frm.call('reset')
      })
    })
  },
})
