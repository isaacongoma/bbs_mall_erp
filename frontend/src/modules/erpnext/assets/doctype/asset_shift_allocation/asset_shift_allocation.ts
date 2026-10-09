import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Asset Shift Allocation', {
  onload: function (frm?: any) {
    frm.set_query('asset', function () {
      return {
        filters: {
          company: frm.doc.company,
          docstatus: 1,
        },
      }
    })
    frm.events.make_schedules_editable(frm)
  },
  make_schedules_editable: function (frm?: any) {
    frm.toggle_enable('depreciation_schedule', true)
    frm.fields_dict['depreciation_schedule'].grid.toggle_enable('schedule_date', false)
    frm.fields_dict['depreciation_schedule'].grid.toggle_enable('depreciation_amount', false)
    frm.fields_dict['depreciation_schedule'].grid.toggle_enable('shift', true)
  },
})
