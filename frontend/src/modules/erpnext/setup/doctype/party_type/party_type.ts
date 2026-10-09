import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Party Type', {
  setup: function (frm?: any) {
    frm.fields_dict['party_type'].get_query = function () {
      return {
        filters: {
          istable: 0,
          is_submittable: 0,
        },
      }
    }
  },
})
