import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Compensatory Leave Request', {
  refresh: function (frm: any) {
    frm.set_query('leave_type', function () {
      return {
        filters: {
          is_compensatory: true,
        },
      }
    })
  },
  half_day: function (frm: any) {
    if (frm.doc.half_day == 1) {
      frm.set_df_property('half_day_date', 'reqd', true)
    } else {
      frm.set_df_property('half_day_date', 'reqd', false)
    }
  },
})
